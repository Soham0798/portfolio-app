import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Transaction from '@/models/Transaction';
import Instrument from '@/models/Instrument';
import ManualAsset from '@/models/ManualAssets';
import PDFParser from 'pdf2json';

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
    'tata consumer products limited': 'TATACONSUM.NS',
    'the lakshmi vilas bank limited': 'LAKSHVILAS.NS',
    'titan company limited': 'TITAN.NS',
    'triveni engineering and industries limited': 'TRIVENI.NS',
};

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
        let section = '';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Section detection based on NSDL CAS headers
            if (line.includes('Equities (E)') || line.includes('Equity Shares')) {
                section = 'EQUITY';
                continue;
            }
            if (line.includes('Mutual Fund Folios (F)')) {
                section = 'MF';
                continue;
            }
            if (line.includes('Sovereign Gold Bonds (SGB)')) {
                section = 'SGB';
                continue;
            }
            if (line.includes('National Pension System (NPS)')) {
                section = 'NPS';
                continue;
            }
            if (line.includes('LIFE INSURANCE POLICIES')) {
                section = 'INSURANCE';
                continue;
            }
            
            // Parse Equity
            if (section === 'EQUITY' && line.startsWith('INE')) {
                const parts = line.split(/\s+/);
                // Try to extract: INE... NAME... FV SHARES PRICE VALUE
                if (parts.length >= 5) {
                    const sharesStr = parts[parts.length - 3].replace(/,/g, '');
                    const priceStr = parts[parts.length - 2].replace(/,/g, '');
                    
                    const qty = parseFloat(sharesStr);
                    const mktPrice = parseFloat(priceStr);
                    
                    const nameParts = parts.slice(1, parts.length - 4);
                    const name = nameParts.join(' ').trim();
                    
                    if (!isNaN(qty) && !isNaN(mktPrice) && qty > 0 && name) {
                        try {
                            const scripLower = name.toLowerCase().trim();
                            const tickerSymbol = tickerMap[scripLower] || `${name.replace(/\s+/g, '').toUpperCase()}.NS`;
                            
                            let instrument = await Instrument.findOne({
                                $or: [
                                    { tickerSymbol },
                                    { name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i') } },
                                ]
                            });

                            if (!instrument) {
                                instrument = await Instrument.create({
                                    name: name,
                                    tickerSymbol,
                                    assetType: 'STOCK',
                                    exchange: 'NSE',
                                    currentPrice: mktPrice,
                                    previousClose: mktPrice,
                                    isActive: true,
                                });
                            }

                            await Transaction.create({
                                userId: user.userId,
                                profile: profile,
                                instrumentId: instrument._id,
                                type: 'BUY',
                                date: new Date(),
                                quantity: qty,
                                price: 0, // Option B: User requested 0 average purchase price
                                fees: 0,
                                notes: 'Imported from NSDL CAS',
                            });
                            results.imported++;
                        } catch (err: any) {
                            results.errors.push(`Error importing ${name}: ${err.message}`);
                            results.skipped++;
                        }
                    }
                }
            }

            // Parse Mutual Funds
            // INF... NAME... FOLIO UNITS AVG_COST TOTAL_COST NAV VALUE PROFIT
            if (section === 'MF' && line.startsWith('INF')) {
                const parts = line.split(/\s+/);
                if (parts.length >= 7) {
                    const avgCostStr = parts[parts.length - 5].replace(/,/g, '');
                    const unitsStr = parts[parts.length - 6].replace(/,/g, '');
                    
                    const qty = parseFloat(unitsStr);
                    const price = parseFloat(avgCostStr);
                    
                    // Name is between INF and Folio. But Folio can be anything. We just roughly assume name is second word until parts.length-6
                    const nameParts = parts.slice(1, parts.length - 7);
                    let name = nameParts.join(' ').trim();
                    if (!name) name = "Unknown Mutual Fund";

                    if (!isNaN(qty) && !isNaN(price) && qty > 0) {
                        try {
                            const tickerSymbol = `${name.replace(/\s+/g, '').toUpperCase()}.MF`;
                            let instrument = await Instrument.findOne({
                                $or: [
                                    { tickerSymbol },
                                    { name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i') } },
                                ]
                            });

                            if (!instrument) {
                                instrument = await Instrument.create({
                                    name: name,
                                    tickerSymbol,
                                    assetType: 'MUTUAL_FUND',
                                    exchange: 'BSE',
                                    currentPrice: price,
                                    previousClose: price,
                                    isActive: true,
                                });
                            }

                            await Transaction.create({
                                userId: user.userId,
                                profile: profile,
                                instrumentId: instrument._id,
                                type: 'BUY',
                                date: new Date(),
                                quantity: qty,
                                price: price, // For MFs we have the average cost!
                                fees: 0,
                                notes: 'Imported from NSDL CAS',
                            });
                            results.imported++;
                        } catch (err: any) {
                            results.errors.push(`Error importing MF ${name}: ${err.message}`);
                            results.skipped++;
                        }
                    }
                }
            }

            // Parse SGB
            if (section === 'SGB' && line.startsWith('IN')) {
                const parts = line.split(/\s+/);
                if (parts.length >= 4) {
                    const valStr = parts[parts.length - 1].replace(/,/g, '');
                    const val = parseFloat(valStr);
                    if (!isNaN(val) && val > 0) {
                        try {
                            await ManualAsset.create({
                                userId: user.userId,
                                profile: profile,
                                assetType: 'OTHER',
                                name: 'Sovereign Gold Bonds',
                                currentValue: val,
                                totalInvested: val,
                            });
                            results.imported++;
                        } catch (err: any) {
                            results.errors.push(`Error importing SGB: ${err.message}`);
                            results.skipped++;
                        }
                    }
                }
            }

            // Parse NPS
            if (section === 'NPS' && line.includes('NPS TRUST')) {
                const parts = line.split(/\s+/);
                const valStr = parts[parts.length - 1].replace(/,/g, '');
                const val = parseFloat(valStr);
                if (!isNaN(val) && val > 0) {
                    try {
                        await ManualAsset.create({
                            userId: user.userId,
                            profile: profile,
                            assetType: 'EPF',
                            name: 'NPS Tier I',
                            currentValue: val,
                            totalInvested: val,
                        });
                        results.imported++;
                    } catch (err: any) {
                        results.errors.push(`Error importing NPS: ${err.message}`);
                        results.skipped++;
                    }
                }
            }
        }

        return NextResponse.json({ results });
    } catch (error: any) {
        console.error('NSDL import error:', error);
        return NextResponse.json({ error: error.message || 'Failed to import NSDL CAS' }, { status: 500 });
    }
}
