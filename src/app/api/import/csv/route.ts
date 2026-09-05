import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Instrument from '@/models/Instrument';
import Transaction from '@/models/Transaction';

export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const source = formData.get('source') as string;
        const profile = formData.get('profile') as string;

        if (!file || !source || !profile) {
            return NextResponse.json(
                { error: 'file, source, and profile are required' },
                { status: 400 }
            );
        }

        // 5MB limit to prevent memory exhaustion
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'File size exceeds 5MB limit' },
                { status: 413 }
            );
        }

        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim());

        let results = { imported: 0, skipped: 0, errors: [] as string[] };

        if (source === 'zerodha') {
            results = await parseZerodha(lines, user.userId, profile);
        } else if (source === 'groww') {
            results = await parseGroww(lines, user.userId, profile);
        } else if (source === 'goldenbulls') {
            results = await parseGoldenBulls(lines, user.userId);
        } else {
            return NextResponse.json({ error: 'Unsupported source' }, { status: 400 });
        }

        return NextResponse.json({ message: 'Import complete', results });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Import failed' },
            { status: 500 }
        );
    }
}

async function parseZerodha(lines: string[], userId: string, profile: string) {
    const results = { imported: 0, skipped: 0, errors: [] as string[] };

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));

        if (cols.length < 9) {
            results.skipped++;
            continue;
        }

        const [symbol, isin, tradeDateStr, exchange, , , tradeType, , qtyStr, priceStr] = cols;

        try {
            // Find or create instrument
            let instrument = await Instrument.findOne({
                userId,
                $or: [
                    { tickerSymbol: `${symbol}.NS` },
                    { tickerSymbol: symbol },
                    { isin },
                ]
            });

            if (!instrument) {
                instrument = await Instrument.create({
                    userId,
                    name: symbol,
                    tickerSymbol: exchange === 'NSE' ? `${symbol}.NS` : `${symbol}.BO`,
                    assetType: 'STOCK',
                    exchange: exchange || 'NSE',
                    isin: isin || '',
                    currentPrice: parseFloat(priceStr),
                    previousClose: parseFloat(priceStr),
                    isActive: true,
                });
            }

            // Parse date: Zerodha uses dd-mm-yyyy or yyyy-mm-dd
            let tradeDate: Date;
            if (tradeDateStr.includes('-')) {
                const parts = tradeDateStr.split('-');
                if (parts[0].length === 4) {
                    tradeDate = new Date(tradeDateStr); // yyyy-mm-dd
                } else {
                    tradeDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`); // dd-mm-yyyy → yyyy-mm-dd
                }
            } else {
                tradeDate = new Date(tradeDateStr);
            }

            await Transaction.create({
                userId,
                profile,
                instrumentId: instrument._id,
                type: tradeType.toUpperCase() === 'BUY' ? 'BUY' : 'SELL',
                date: tradeDate,
                quantity: parseFloat(qtyStr),
                price: parseFloat(priceStr),
                fees: 0,
                notes: `Imported from Zerodha`,
            });

            results.imported++;
        } catch (err: any) {
            results.errors.push(`Row ${i + 1} (${symbol}): ${err.message}`);
            results.skipped++;
        }
    }

    return results;
}

import { fetchAllMutualFunds, searchMutualFund } from '@/lib/prices/amfi';

// ===== Groww CSV Parser =====
// Format: Company/Fund, Symbol/Code, Date, Type, Quantity/Units, Price/NAV, Amount
async function parseGroww(lines: string[], userId: string, profile: string) {
    const results = { imported: 0, skipped: 0, errors: [] as string[] };
    
    let amfiSchemes: any[] = [];
    try {
        amfiSchemes = await fetchAllMutualFunds();
    } catch (e) {
        console.error('Failed to load AMFI list for matching', e);
    }

    let isMF = false;
    let colMap: Record<string, number> = {
        name: 0,
        type: 3,
        date: 2,
        qty: 4,
        price: 5,
        symbol: 1
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const cols = line.split(',').map(c => c.trim().replace(/"/g, ''));

        // Detect headers and map columns dynamically
        if (line.includes('Scheme Name') || line.includes('Stock Name') || line.includes('Company')) {
            isMF = line.includes('Scheme Name') || line.includes('NAV');
            
            const findCol = (keywords: string[]) => {
                const idx = cols.findIndex(c => keywords.some(k => c.toUpperCase().includes(k.toUpperCase())));
                return idx !== -1 ? idx : -1;
            };

            colMap = {
                name: findCol(['Scheme Name', 'Stock Name', 'Company', 'Fund']),
                type: findCol(['Type', 'Transaction Type']),
                date: findCol(['Date', 'Transaction Date']),
                qty: findCol(['Quantity', 'Units']),
                price: findCol(['Price', 'NAV']),
                symbol: findCol(['Symbol', 'ISIN', 'Folio'])
            };
            
            // If symbol column is missing (like in the new Groww MF export), we'll fallback to using the name
            if (colMap.symbol === -1) {
                colMap.symbol = colMap.name; 
            }
            continue;
        }

        if (cols.length < 5) {
            results.skipped++;
            continue;
        }

        const name = cols[colMap.name];
        let symbolOrCode = cols[colMap.symbol];
        const dateStr = cols[colMap.date];
        const type = cols[colMap.type];
        const qtyStr = cols[colMap.qty]?.replace(/,/g, '');
        const priceStr = cols[colMap.price]?.replace(/,/g, '');

        if (!name || !dateStr || !qtyStr || !priceStr || !type) {
             results.skipped++;
             continue;
        }

        const qty = parseFloat(qtyStr);
        const price = parseFloat(priceStr);

        // Skip non-transaction rows (like metadata at the top of the CSV)
        if (isNaN(qty) || isNaN(price)) {
            results.skipped++;
            continue;
        }

        try {
            const assetType = isMF ? 'MUTUAL_FUND' : 'STOCK';
            
            let tickerSymbol = '';
            if (isMF) {
                const matchedCode = searchMutualFund(name, amfiSchemes);
                if (matchedCode) {
                    tickerSymbol = matchedCode;
                } else {
                    const fallbackCode = (symbolOrCode || name).replace(/[^a-zA-Z0-9]/g, '').substring(0, 15).toUpperCase();
                    tickerSymbol = `MF-${fallbackCode}`;
                }
            } else {
                tickerSymbol = `${symbolOrCode}.NS`;
            }

            let instrument = await Instrument.findOne({ tickerSymbol, userId });

            if (!instrument) {
                instrument = await Instrument.create({
                    userId,
                    name: name,
                    tickerSymbol,
                    assetType,
                    exchange: isMF ? 'AMFI' : 'NSE',
                    currentPrice: price,
                    previousClose: price,
                    isActive: true,
                });
            }

            let tradeDate = new Date(dateStr);
            if (isNaN(tradeDate.getTime())) {
                let parts: string[] = [];
                if (dateStr.includes('/')) parts = dateStr.split('/');
                else if (dateStr.includes('-')) parts = dateStr.split('-');
                else if (dateStr.includes(' ')) parts = dateStr.split(' '); // e.g. "07 Aug 2026"
                
                if (parts.length >= 3) {
                    // Try parsing "07 Aug 2026"
                    tradeDate = new Date(`${parts[0]} ${parts[1]} ${parts[2]}`);
                    if (isNaN(tradeDate.getTime())) {
                         // Try dd-mm-yyyy
                         tradeDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                    }
                }
            }

            if (isNaN(tradeDate.getTime())) {
                throw new Error(`Invalid Date format: ${dateStr}`);
            }

            const typeUpper = type.toUpperCase();
            const isBuy = typeUpper.includes('BUY') || typeUpper.includes('SIP') || typeUpper.includes('LUMP') || typeUpper.includes('PURCHASE');
            const txType = isBuy ? 'BUY' : 'SELL';

            await Transaction.create({
                userId,
                profile,
                instrumentId: instrument._id,
                type: txType,
                date: tradeDate,
                quantity: qty,
                price: price,
                fees: 0,
                notes: `Imported from Groww`,
            });

            results.imported++;
        } catch (err: any) {
            results.errors.push(`Row ${i + 1} (${name}): ${err.message}`);
            results.skipped++;
        }
    }

    return results;
}

// ===== Golden Bulls CSV Parser =====
// Holdings snapshot — may be tab-separated or comma-separated.
// Structure:
//   Metadata rows (company name, email, mobile, summary) — skip
//   Profile name row (e.g. "Sameer" or "Sameer Arvind Patwardhan (PAN)")
//   Header row: Scrip | Amount Invested | Current value | ... | Balance shares | Average price | Market price | ...
//   Data rows: stock name | numbers...
//   Category rows: single label like "Paints", "Banks" — skip
//   "Total" row — skip
async function parseGoldenBulls(lines: string[], userId: string) {
    if (process.env.NODE_ENV !== 'production') console.log(`Starting Golden Bulls parse: ${lines.length} lines`);
    const results = { imported: 0, skipped: 0, errors: [] as string[] };

    // Auto-detect delimiter: if tabs are common, use tab; otherwise comma
    const tabCount = lines.reduce((n, l) => n + (l.includes('\t') ? 1 : 0), 0);
    const delimiter = tabCount > lines.length * 0.3 ? '\t' : ',';

    let currentProfile = '';
    let colMap: Record<string, number> = {};
    let headersFound = false;
    const knownProfiles = ['sameer', 'snehal', 'soham'];

    // Map full company names from Golden Bulls to correct NSE tickers
    const tickerMap: Record<string, string> = {
        'sterlite technologies limited': 'STLTECH.NS',
        'state bank of india': 'SBIN.NS',
        'infosys ltd.': 'INFY.NS',
        'infosys ltd': 'INFY.NS',
        'titan company limited': 'TITAN.NS',
        'tata consumer products ltd': 'TATACONSUM.NS',
        'asian paints ltd': 'ASIANPAINT.NS',
        'larsen & toubro ltd': 'LT.NS',
        'dabur india ltd': 'DABUR.NS',
        'icici bank ltd': 'ICICIBANK.NS',
        'lupin ltd': 'LUPIN.NS',
        'pfizer ltd': 'PFIZER.NS',
        'one 97 communications limited': 'PAYTM.NS',
        'saregama india ltd': 'SAREGAMA.NS',
        'triveni engineering and industries ltd': 'TRIVENI.NS',
        'anant raj ltd': 'ANANTRAJ.NS',
        'ashapura minechem ltd': 'ASHAPURMIN.NS',
        'graphite india ltd': 'GRAPHITE.NS',
        'lakshmi vilas bank ltd': 'LAKSHVILAS.NS'
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        let cols: string[] = [];
        let curr = '';
        let inQuotes = false;
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
                cols.push(curr.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
                curr = '';
            } else {
                curr += char;
            }
        }
        cols.push(curr.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));

        // --- Detect profile header ---
        const firstCellLower = cols[0].toLowerCase();
        const matchedProfile = knownProfiles.find(p => firstCellLower.startsWith(p));
        if (matchedProfile) {
            const numericCells = cols.filter(c => /^\d/.test(c.trim())).length;
            if (numericCells <= 1) {
                if (process.env.NODE_ENV !== 'production') console.log(`Found profile: ${matchedProfile} at line ${i}`);
                currentProfile = matchedProfile;
                headersFound = false;
                continue;
            }
        }

        // --- Detect column headers row ---
        if (line.toLowerCase().includes('scrip') && line.toLowerCase().includes('balance')) {
            const findCol = (keywords: string[]) => {
                return cols.findIndex(c => keywords.some(k => c.toLowerCase().includes(k.toLowerCase())));
            };
            colMap = {
                scrip: findCol(['Scrip']),
                balanceShares: findCol(['Balance shares', 'Balance Shares']),
                averagePrice: findCol(['Average price', 'Average Price']),
                marketPrice: findCol(['Market price', 'Market Price']),
            };
            headersFound = true;
            if (process.env.NODE_ENV !== 'production') console.log(`Found headers at line ${i}:`, colMap);
            continue;
        }

        // Skip until we have both a profile and headers
        if (!currentProfile || !headersFound) {
            if (i < 20 && process.env.NODE_ENV !== 'production') console.log(`Skipping line ${i} (waiting for profile/headers):`, line);
            continue;
        }

        // --- Parse data row ---
        const scrip = colMap.scrip >= 0 ? (cols[colMap.scrip] || '') : '';
        const balanceStr = colMap.balanceShares >= 0 ? (cols[colMap.balanceShares] || '').replace(/[^0-9.-]/g, '') : '';
        const avgPriceStr = colMap.averagePrice >= 0 ? (cols[colMap.averagePrice] || '').replace(/[^0-9.-]/g, '') : '';
        const marketPriceStr = colMap.marketPrice >= 0 ? (cols[colMap.marketPrice] || '').replace(/[^0-9.-]/g, '') : '';

        if (!scrip.trim()) continue;

        const scripLower = scrip.toLowerCase().trim();
        if (scripLower === 'total' || scripLower === 'grand total' || scripLower === 'summary' || scripLower.startsWith('total ')) {
            if (process.env.NODE_ENV !== 'production') console.log(`Skipping total row: ${scrip}`);
            continue;
        }

        const qty = parseFloat(balanceStr);
        const avgPrice = parseFloat(avgPriceStr);
        const mktPrice = parseFloat(marketPriceStr);

        // Skip rows where numeric fields aren't valid (catches category labels, metadata, etc.)
        if (isNaN(qty) || isNaN(avgPrice) || qty <= 0 || avgPrice <= 0) {
            if (process.env.NODE_ENV !== 'production') console.log(`Skipping invalid numeric data for scrip '${scrip}': qty=${qty}, avgPrice=${avgPrice}`);
            continue;
        }

        const finalMktPrice = isNaN(mktPrice) ? avgPrice : mktPrice;

        try {
            // Check if we have a known mapping for this full name
            const scripLowerMap = scrip.toLowerCase().trim();
            const tickerSymbol = tickerMap[scripLowerMap] || `${scrip.replace(/\s+/g, '').toUpperCase()}.NS`;

            let instrument = await Instrument.findOne({
                userId,
                $or: [
                    { tickerSymbol },
                    { name: { $regex: new RegExp(`^${scrip.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i') } },
                ]
            });

            if (!instrument) {
                instrument = await Instrument.create({
                    userId,
                    name: scrip,
                    tickerSymbol,
                    assetType: 'STOCK',
                    exchange: 'NSE',
                    currentPrice: finalMktPrice,
                    previousClose: finalMktPrice,
                    isActive: true,
                });
            }

            await Transaction.create({
                userId,
                profile: currentProfile,
                instrumentId: instrument._id,
                type: 'BUY',
                date: new Date(),
                quantity: qty,
                price: avgPrice,
                fees: 0,
                notes: 'Imported from Golden Bulls (holdings snapshot)',
            });

            if (process.env.NODE_ENV !== 'production') console.log(`Imported ${scrip} [${currentProfile}]`);
            results.imported++;
        } catch (err: any) {
            if (process.env.NODE_ENV !== 'production') console.error(`Error importing ${scrip}:`, err);
            results.errors.push(`Row ${i + 1} (${scrip}) [${currentProfile}]: ${err.message}`);
            results.skipped++;
        }
    }

    if (process.env.NODE_ENV !== 'production') console.log('Golden Bulls parse complete:', results);
    return results;
}

