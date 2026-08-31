import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Transaction from '@/models/Transaction';
import Instrument from '@/models/Instrument';
import ManualAsset from '@/models/ManualAssets';
import PDFParser from 'pdf2json';
import { fetchYahooPrice } from '@/lib/prices/yahoo';

async function getLiveGoldPricePerGram(): Promise<number | null> {
    try {
        const quote = await fetchYahooPrice('XAUINR=X');
        if (quote && quote.currentPrice) {
            return quote.currentPrice / 31.1034768;
        }
    } catch {}
    return null;
}

let amfiNavCache: Record<string, { nav: number; name: string }> | null = null;
let amfiCacheTime = 0;
async function getLiveMFDetails(isin: string): Promise<{ nav: number; name: string } | null> {
    try {
        if (!amfiNavCache || Date.now() - amfiCacheTime > 12 * 3600 * 1000) {
            const res = await fetch('https://www.amfiindia.com/spages/NAVAll.txt');
            const text = await res.text();
            amfiNavCache = {};
            for (const line of text.split('\n')) {
                const parts = line.split(';');
                if (parts.length >= 5 && parts[0].match(/^[A-Z0-9]{12}$/)) {
                    const nav = parseFloat(parts[4].trim());
                    if (parts[1].trim() && !isNaN(nav)) {
                        amfiNavCache[parts[1].trim()] = { nav, name: parts[3].trim() };
                    }
                }
            }
            amfiCacheTime = Date.now();
        }
        return amfiNavCache[isin] || null;
    } catch {
        return null;
    }
}

// Ticker mappings for common NSDL CAS names
const tickerMap: Record<string, string> = {
    'anant raj limited': 'ANANTRAJ.NS',
    'ashapura minechem limited': 'ASHAPURMIN.NS',
    'asian paints limited': 'ASIANPAINT.NS',
    'dabur india limited': 'DABUR.NS',
    'digidrive distributors limited': 'DIGIDRIVE.NS',
    'equitas small finance bank limited': 'EQUITASBNK.NS',
    'graphite india limited': 'GRAPHITE.NS',
    'icici bank limited': 'ICICIBANK.NS',
    'infosys limited': 'INFY.NS',
    'jsw energy limited': 'JSWENERGY.NS',
    'larsen and toubro limited': 'LT.NS',
    'lupin limited': 'LUPIN.NS',
    'one 97 communications limited': 'PAYTM.NS',
    'pfizer limited': 'PFIZER.NS',
    'punjab national bank': 'PNB.NS',
    'saregama india limited': 'SAREGAMA.NS',
    'state bank of india': 'SBIN.NS',
    'sterlite technologies limited': 'STLTECH.NS',
    'stl networks limited': 'STLNETWORK.NS',
    'sterlite grid 5 limited': 'STERLITEGRID5.NS',
    'sterlite electric limited': 'STERLITEELEC.NS',
    'tata consumer products limited': 'TATACONSUM.NS',
    'the lakshmi vilas bank limited': 'LAKSHVILAS.NS',
    'titan company limited': 'TITAN.NS',
    'triveni engineering and industries limited': 'TRIVENI.NS',
};

// Extract all whitespace-separated tokens that look like numbers from a line
function extractNumbers(line: string): number[] {
    // Strip ISIN (INE... or INF... or IN0...) before extracting numbers
    let cleanLine = line.replace(/\b(IN[E|F|0]\w+)\b/g, '');
    
    // Handle 'See Note' by replacing it with '0' so column count stays correct
    cleanLine = cleanLine.replace(/See Note/gi, '0');
    
    // Only extract numbers from the end of the line (the tabular data)
    // This prevents extracting numbers like "5" from "Sterlite Grid 5"
    const endingNumbersMatch = cleanLine.match(/((?:\s+[\d,]+\.?\d*)+)$/);
    if (endingNumbersMatch) {
        cleanLine = endingNumbersMatch[1];
    }
    
    // Match numbers with optional commas and decimals
    const matches = cleanLine.match(/[\d,]+\.?\d*/g) || [];
    return matches.map(m => parseFloat(m.replace(/,/g, ''))).filter(n => !isNaN(n));
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const profile = formData.get('profile') as string;

        if (!file || !profile) {
            return NextResponse.json({ error: 'Missing file or profile' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        let text = '';
        try {
            text = await new Promise((resolve, reject) => {
                const pdfParser = new PDFParser(null, true);
                pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError ?? errData));
                pdfParser.on("pdfParser_dataReady", () => {
                    resolve(pdfParser.getRawTextContent());
                });
                pdfParser.parseBuffer(buffer);
            });
        } catch (err: any) {
            return NextResponse.json({ error: 'Failed to read PDF. It might be password protected.' }, { status: 400 });
        }

        const lines = text.split('\n');
        const results = { imported: 0, skipped: 0, errors: [] as string[] };

        // Pre-import Cleanup: Ensure idempotent imports by clearing previous CAS imports for this profile.
        await Transaction.deleteMany({ userId: user.userId, profile, notes: 'Imported from NSDL CAS' });
        await ManualAsset.deleteMany({
            userId: user.userId,
            profile,
            $or: [
                { name: { $regex: /Sovereign Gold Bond/i } },
                { name: { $regex: /^NPS/i } }
            ]
        });
        // Clean up SGB instruments created by a previous import for this user
        const oldSgbInstruments = await Instrument.find({ userId: user.userId, assetType: 'SGB' });
        const oldSgbIds = oldSgbInstruments.map(i => i._id);
        if (oldSgbIds.length > 0) {
            await Transaction.deleteMany({ userId: user.userId, profile, instrumentId: { $in: oldSgbIds }, notes: 'Imported from NSDL CAS' });
            // Only delete the instrument if no transactions remain for it
            for (const inst of oldSgbInstruments) {
                const remaining = await Transaction.countDocuments({ userId: user.userId, instrumentId: inst._id });
                if (remaining === 0) await inst.deleteOne();
            }
        }

        // ============================================================
        // PASS 1: Find section boundaries
        // pdf2json renders pages bottom-to-top, so the section header
        // "Equities (E)" appears AFTER the equity data lines.
        // We find where each section header is, then parse lines
        // ABOVE it (up to the previous section header or page break).
        // ============================================================

        // Find all section header line indices
        let equitySectionLine = -1;
        let mfSectionLine = -1;
        let sgbSectionLine = -1;
        let npsSectionLine = -1;

        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (trimmed === 'Equities (E)' || trimmed.startsWith('Equities (E)')) {
                equitySectionLine = i;
            }
            if (trimmed === 'Mutual Fund Folios (F)' || trimmed.startsWith('Mutual Fund Folios (F)')) {
                mfSectionLine = i;
            }
            if (trimmed === 'Sovereign Gold Bonds (SGB)' || trimmed.startsWith('Sovereign Gold Bonds (SGB)')) {
                sgbSectionLine = i;
            }
            if (trimmed.includes('National Pension System (NPS)') && trimmed.includes('Holding')) {
                npsSectionLine = i;
            }
        }

        if (process.env.NODE_ENV !== 'production') console.log(`NSDL sections: equity=${equitySectionLine}, mf=${mfSectionLine}, sgb=${sgbSectionLine}, nps=${npsSectionLine}`);

        // ============================================================
        // PASS 2: Parse equities
        // Lines with INE ISINs that appear near the equity section
        // Format: each stock has a ticker line (e.g. "ASIANPAINT.NSE")
        // followed by an ISIN line containing: INE... COMPANY NAME ... FV SHARES PRICE VALUE
        // The data appears ABOVE the "Equities (E)" header in the PDF
        // ============================================================

        // Collect all INE lines (equities) - they appear between the section header area
        // We look for INE lines globally and match them with preceding ticker lines
        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();

            // Skip lines that are clearly not equity ISIN data lines
            if (!trimmed.startsWith('INE')) continue;

            // Check if this is in the equity range (before MF section or after equity header)
            // Since the order is reversed, equity data appears near the equity section header
            // Let's just parse any INE line that has numbers (shares, price, value)
            const numbers = extractNumbers(trimmed);

            // We expect at least: face_value, shares, market_price, total_value
            // Some lines might have "See Note" instead of a price
            if (numbers.length < 3) continue;

            // Extract company name from the line
            // Format: INE...XXXX   COMPANY NAME   FV   SHARES   PRICE   VALUE
            // The company name is between the ISIN and the numbers
            const isinMatch = trimmed.match(/^(INE\w+)\s+/);
            if (!isinMatch) continue;

            const afterIsin = trimmed.substring(isinMatch[0].length);

            // Find where the company name ends and numbers begin
            // Company names are uppercase text, numbers start with digits
            const nameMatch = afterIsin.match(/^([A-Z][A-Z\s&.()'-]+?)(?=\s+\d)/);
            if (!nameMatch) continue;

            let name = nameMatch[1].trim();

            // Also check the line above for continuation of company name 
            // (some names are split across lines, e.g. "TRIVENI ENGINEERING AND" + "INDUSTRIES LIMITED")
            if (i > 0) {
                const prevLine = lines[i - 1].trim();
                // If previous line looks like a name continuation (all caps, no numbers)
                if (prevLine && /^[A-Z][A-Z\s&.()'-]+$/.test(prevLine) && !prevLine.startsWith('INE') && !prevLine.includes('.NSE') && !prevLine.includes('.BSE')) {
                    name = name + ' ' + prevLine;
                }
            }

            // Also check if the line BEFORE this one has the ticker symbol
            let tickerFromPdf = '';
            // Search backwards for a .NSE or .BSE line
            for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
                const checkLine = lines[j].trim();
                if (checkLine.match(/^[A-Z]+\.NSE$/) || checkLine.match(/^[A-Z]+\.BSE$/)) {
                    tickerFromPdf = checkLine;
                    break;
                }
            }

            // Numbers: the last number is total value, second-to-last is market price,
            // third-to-last is shares count, fourth-to-last is face value
            const totalValue = numbers[numbers.length - 1];
            const marketPrice = numbers[numbers.length - 2];
            const shares = numbers[numbers.length - 3];
            const faceValue = numbers[numbers.length - 4];

            // Validate: shares and market price should be reasonable
            if (shares <= 0 || marketPrice <= 0) continue;

            // Skip if this looks like an SGB line (face value per unit is very high like 5117)
            // SGBs have ISIN starting with IN00 not INE
            // Actually INE is only for equities, so this check is fine

            try {
                const scripLower = name.toLowerCase().trim();
                let tickerSymbol = tickerMap[scripLower];
                if (!tickerSymbol && tickerFromPdf) {
                    // Convert ASIANPAINT.NSE -> ASIANPAINT.NS
                    tickerSymbol = tickerFromPdf.replace('.NSE', '.NS').replace('.BSE', '.BO');
                }
                if (!tickerSymbol) {
                    tickerSymbol = `${name.replace(/\s+/g, '').toUpperCase()}.NS`;
                }

                let finalPrice = marketPrice;
                if (!finalPrice || finalPrice === 0) {
                    const priceRes = await fetchYahooPrice(tickerSymbol);
                    if (priceRes && priceRes.currentPrice) {
                        finalPrice = priceRes.currentPrice;
                    }
                }

                let instrument = await Instrument.findOne({
                    userId: user.userId,
                    $or: [
                        { tickerSymbol },
                        { name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i') } },
                    ]
                });

                if (!instrument) {
                    instrument = await Instrument.create({
                        userId: user.userId,
                        name,
                        tickerSymbol,
                        assetType: 'STOCK',
                        exchange: 'NSE',
                        currentPrice: finalPrice,
                        previousClose: finalPrice,
                        isActive: true,
                    });
                } else if (finalPrice > 0) {
                    instrument.currentPrice = finalPrice;
                    await instrument.save();
                }

                await Transaction.create({
                    userId: user.userId,
                    profile,
                    instrumentId: instrument._id,
                    type: 'BUY',
                    date: new Date(),
                    quantity: shares,
                    price: 0,
                    fees: 0,
                    notes: 'Imported from NSDL CAS',
                });
                results.imported++;
                if (process.env.NODE_ENV !== 'production') console.log(`EQUITY: ${name} | ticker=${tickerSymbol} | shares=${shares} | price=${marketPrice}`);
            } catch (err: any) {
                results.errors.push(`Error importing equity ${name}: ${err.message}`);
                results.skipped++;
            }
        }

        // ============================================================
        // PASS 3: Parse Mutual Funds
        // INF lines near the MF section. Format:
        // INF...   SCHEME NAME   FOLIO   UNITS   AVG_COST   TOTAL_COST   NAV   CURRENT_VALUE   PROFIT
        // ============================================================

        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (!trimmed.startsWith('INF')) continue;

            const numbers = extractNumbers(trimmed);
            // MF lines typically have many numbers: folio, units, avg_cost, total_cost, nav, current_value, profit
            if (numbers.length < 5) continue;

            // Extract scheme name and ISIN
            const isinMatch = trimmed.match(/^(INF\w+)\s+/);
            if (!isinMatch) continue;
            const isin = isinMatch[1];

            const afterIsin = trimmed.substring(isinMatch[0].length);
            const nameMatch = afterIsin.match(/^([A-Za-z][A-Za-z\s&.()'-]+?)(?=\s+\d)/);
            if (!nameMatch) continue;

            let schemeName = nameMatch[1].trim();

            // Check previous lines for continuation of scheme name
            for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
                const prevLine = lines[j].trim();
                if (prevLine && !prevLine.startsWith('INF') && !prevLine.startsWith('INE') && !prevLine.startsWith('IN0') &&
                    !prevLine.includes('Page') && !prevLine.includes('Total') && !prevLine.includes('Sub Total') &&
                    prevLine.length > 2 && prevLine.length < 80 && !/^\d/.test(prevLine) &&
                    !prevLine.includes('NOT AVAILABLE') && !prevLine.includes('MFSBIM') && !prevLine.includes('MFKOTAK') &&
                    !prevLine.includes('MFPRUI') && !prevLine.includes('MFRILC') && !prevLine.includes('MF/') &&
                    !prevLine.includes('FIEFGP')) {
                    schemeName = schemeName + ' ' + prevLine;
                } else {
                    break;
                }
            }

            // Try to get live NAV from AMFI (handled below)
            // For MFs, we expect: folio_no, units, avg_cost_per_unit, total_cost, nav, current_value, unrealised_profit
            // The numbers array should have these in order
            // units is typically the second number (first could be folio)
            // We need: units (quantity) and avg_cost_per_unit (price)
            
            // Heuristic: folio number is usually very large (>100000), units are moderate, avg cost is moderate
            let units = 0;
            let avgCost = 0;
            let nav = 0;

            // Try to identify units, avg_cost, and nav from the numbers
            // Pattern: folio, units, avg_cost, total_cost, nav, current_value, profit
            // For MFs, we count from the end:
            // last = profit, last-1 = current value, last-2 = nav, last-3 = total cost, last-4 = avg cost, last-5 = units
            if (numbers.length >= 6) {
                units = numbers[numbers.length - 6];
                avgCost = numbers[numbers.length - 5];
                nav = numbers[numbers.length - 3];
            } else {
                // fallback
                units = numbers[1];
                avgCost = numbers[2];
                nav = avgCost;
            }

            // Try to get live NAV and full scheme name from AMFI
            const liveData = await getLiveMFDetails(isin);
            const finalNav = liveData?.nav || nav;
            if (liveData?.name) {
                schemeName = liveData.name;
            }

            if (units <= 0 || avgCost <= 0) continue;

            try {
                const tickerSymbol = `${schemeName.replace(/\s+/g, '').toUpperCase()}.MF`;
                let instrument = await Instrument.findOne({
                    userId: user.userId,
                    $or: [
                        { tickerSymbol },
                        { name: { $regex: new RegExp(`^${schemeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i') } },
                    ]
                });

                if (!instrument) {
                    instrument = await Instrument.create({
                        userId: user.userId,
                        name: schemeName,
                        tickerSymbol,
                        assetType: 'MUTUAL_FUND',
                        exchange: 'BSE',
                        currentPrice: finalNav,
                        previousClose: finalNav,
                        isActive: true,
                    });
                } else if (finalNav > 0) {
                    instrument.currentPrice = finalNav;
                    await instrument.save();
                }

                await Transaction.create({
                    userId: user.userId,
                    profile,
                    instrumentId: instrument._id,
                    type: 'BUY',
                    date: new Date(),
                    quantity: units,
                    price: 0, // Set to 0 so the user can edit it later
                    fees: 0,
                    notes: 'Imported from NSDL CAS',
                });
                results.imported++;
                if (process.env.NODE_ENV !== 'production') console.log(`MF: ${schemeName} | units=${units} | avgCost=${avgCost}`);
            } catch (err: any) {
                results.errors.push(`Error importing MF ${schemeName}: ${err.message}`);
                results.skipped++;
            }
        }

        // ============================================================
        // PASS 4: Parse SGB
        // Lines starting with IN0 near the SGB section
        // Format: IN0...  Government of India-  COUPON  MATURITY_DATE  UNITS  FACE_VALUE  MARKET_PRICE  VALUE
        // ============================================================

        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (!trimmed.startsWith('IN0')) continue;

            const numbers = extractNumbers(trimmed);
            if (numbers.length < 3) continue;

            const totalValue = numbers[numbers.length - 1];
            const units = numbers[numbers.length - 3];

            if (totalValue > 0 && units > 0) {
                // Check if there's a descriptive line nearby with "SGB" or "Gold"
                let isSgb = trimmed.includes('Government of India');
                if (!isSgb) {
                    for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
                        if (lines[j].includes('SGB') || lines[j].includes('Gold')) {
                            isSgb = true;
                            break;
                        }
                    }
                }

                if (isSgb) {
                    try {
                        // Extract ISIN from start of the line (IN0...)
                        const isinMatch = trimmed.match(/^(IN0\w+)/);
                        const isin = isinMatch ? isinMatch[1] : null;

                        // Derive a Yahoo ticker: NSDL lines contain the name like
                        // "Government of India- SGB2024MAR08- IV 2.50%  08/03/2024"
                        // We try to map the ISIN → ticker via Yahoo search.
                        // If that fails we fall back to gold price × units.
                        let tickerSymbol = isin ? `${isin}.NS` : `SGBGOLD.NS`;
                        let sgbName = `Sovereign Gold Bond`;

                        // Try to extract a human-readable name from surrounding lines
                        for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
                            if (lines[j].includes('Government of India')) {
                                sgbName = lines[j].trim().replace(/\s+/g, ' ').substring(0, 80);
                                break;
                            }
                        }

                        // Fetch live gold price for current value
                        let goldRate = await getLiveGoldPricePerGram();
                        const faceValue = numbers[numbers.length - 2] || 0; // price per unit in CAS
                        let currentPrice = goldRate && goldRate > 0 ? goldRate : (faceValue || 5000);
                        let investedPerUnit = faceValue || currentPrice;
                        let currentValue = units * currentPrice;

                        // Upsert Instrument
                        let instrument = await Instrument.findOne({
                            tickerSymbol,
                            userId: user.userId,
                        });
                        if (!instrument) {
                            instrument = await Instrument.create({
                                userId: user.userId,
                                tickerSymbol,
                                name: sgbName,
                                assetType: 'SGB',
                                exchange: 'NSE',
                                currentPrice,
                                previousClose: currentPrice,
                                priceLastUpdated: new Date(),
                            });
                        } else {
                            instrument.currentPrice = currentPrice;
                            instrument.previousClose = currentPrice;
                            instrument.priceLastUpdated = new Date();
                            await instrument.save();
                        }

                        // Create BUY transaction
                        await Transaction.create({
                            userId: user.userId,
                            profile,
                            instrumentId: instrument._id,
                            type: 'BUY',
                            date: new Date(),
                            quantity: units,
                            price: investedPerUnit,
                            fees: 0,
                            notes: 'Imported from NSDL CAS',
                        });

                        results.imported++;
                        if (process.env.NODE_ENV !== 'production') console.log(`SGB: ticker=${tickerSymbol}, units=${units}, value=${currentValue}`);
                    } catch (err: any) {
                        results.errors.push(`Error importing SGB: ${err.message}`);
                        results.skipped++;
                    }
                }
            }
        }

        // ============================================================
        // PASS 5: Parse NPS
        // Lines containing "NPS TRUST" with value at the end
        // ============================================================

        const npsEntries: { name: string; value: number, invested: number }[] = [];
        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (!trimmed.includes('NPS TRUST')) continue;

            const numbers = extractNumbers(trimmed);
            if (numbers.length >= 3) {
                const value = numbers[numbers.length - 1]; // Current value in PDF
                const nav = numbers[numbers.length - 2];
                const units = numbers[numbers.length - 3];

                if (value > 100 && units > 0) { // reasonable NPS value
                    // Determine if Tier I or Tier II
                    let tier = 'Tier I';
                    if (trimmed.includes('TIER II') || trimmed.includes('Tier II')) tier = 'Tier II';
                    
                    const schemeMatch = trimmed.match(/SCHEME\s+([A-Z])/i);
                    const schemeChar = schemeMatch ? schemeMatch[1].toUpperCase() : '';
                    const schemeStr = schemeChar ? ` Scheme ${schemeChar}` : '';

                    // In a production environment, we could fetch live NAV here.
                    // For now, getLiveNPSPrice returns null, falling back to PDF NAV.
                    // const liveNav = await getLiveNPSPrice(trimmed);
                    // const finalNav = liveNav || nav;
                    const finalNav = nav; // Fallback since no API
                    const finalValue = units * finalNav;

                    npsEntries.push({ 
                        name: `NPS ${tier}${schemeStr} (${units.toFixed(2)} units)`, 
                        value: finalValue,
                        invested: value // Best effort as we lack avg cost
                    });
                }
            }
        }

        // Aggregate NPS by name to avoid duplicates if parsed multiple times across pages
        const uniqueNps = new Map<string, { value: number, invested: number }>();
        for (const entry of npsEntries) {
            uniqueNps.set(entry.name, {
                value: Math.max(entry.value, uniqueNps.get(entry.name)?.value || 0),
                invested: Math.max(entry.invested, uniqueNps.get(entry.name)?.invested || 0)
            });
        }

        for (const [name, data] of uniqueNps.entries()) {
            try {
                await ManualAsset.create({
                    userId: user.userId,
                    profile,
                    assetType: 'OTHER',
                    name,
                    currentValue: data.value,
                    totalInvested: data.invested,
                });
                results.imported++;
                if (process.env.NODE_ENV !== 'production') console.log(`NPS: ${name} | value=${data.value}`);
            } catch (err: any) {
                results.errors.push(`Error importing NPS: ${err.message}`);
                results.skipped++;
            }
        }

        if (process.env.NODE_ENV !== 'production') console.log(`NSDL import results: imported=${results.imported}, skipped=${results.skipped}, errors=${results.errors.length}`);
        return NextResponse.json({ results });
    } catch (error: any) {
        console.error('NSDL import error:', error);
        return NextResponse.json({ error: error.message || 'Failed to import NSDL CAS' }, { status: 500 });
    }
}
