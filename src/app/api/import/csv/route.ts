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

        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim());

        let results = { imported: 0, skipped: 0, errors: [] as string[] };

        if (source === 'zerodha') {
            results = await parseZerodha(lines, user.userId, profile);
        } else if (source === 'groww') {
            results = await parseGroww(lines, user.userId, profile);
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
                $or: [
                    { tickerSymbol: `${symbol}.NS` },
                    { tickerSymbol: symbol },
                    { isin },
                ]
            });

            if (!instrument) {
                instrument = await Instrument.create({
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

// ===== Groww CSV Parser =====
// Format: Company/Fund, Symbol/Code, Date, Type, Quantity/Units, Price/NAV, Amount
async function parseGroww(lines: string[], userId: string, profile: string) {
    const results = { imported: 0, skipped: 0, errors: [] as string[] };

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));

        if (cols.length < 6) {
            results.skipped++;
            continue;
        }

        const [name, symbolOrCode, dateStr, type, qtyStr, priceStr] = cols;

        try {
            const isMutualFund = /^\d+$/.test(symbolOrCode);
            const assetType = isMutualFund ? 'MUTUAL_FUND' : 'STOCK';
            const tickerSymbol = isMutualFund ? symbolOrCode : `${symbolOrCode}.NS`;

            let instrument = await Instrument.findOne({ tickerSymbol });

            if (!instrument) {
                instrument = await Instrument.create({
                    name: name,
                    tickerSymbol,
                    assetType,
                    exchange: isMutualFund ? 'AMFI' : 'NSE',
                    currentPrice: parseFloat(priceStr),
                    previousClose: parseFloat(priceStr),
                    isActive: true,
                });
            }

            let tradeDate: Date;
            if (dateStr.includes('/')) {
                const [d, m, y] = dateStr.split('/');
                tradeDate = new Date(`${y}-${m}-${d}`);
            } else {
                tradeDate = new Date(dateStr);
            }

            const txType = type.toUpperCase().includes('BUY') ? 'BUY' : 'SELL';

            await Transaction.create({
                userId,
                profile,
                instrumentId: instrument._id,
                type: txType,
                date: tradeDate,
                quantity: parseFloat(qtyStr),
                price: parseFloat(priceStr),
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
