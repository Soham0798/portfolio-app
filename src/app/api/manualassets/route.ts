import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import ManualAsset from '@/models/ManualAssets';
import Instrument from '@/models/Instrument';
import Transaction from '@/models/Transaction';
import { fetchYahooPrice } from '@/lib/prices/yahoo';
import { fetchMutualFundNAV } from '@/lib/prices/amfi';

export async function GET(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const profile = searchParams.get('profile');
    const assetType = searchParams.get('type');

    const query: any = { userId: user.userId };
    if (profile && profile !== 'combined') query.profile = profile;
    if (assetType) query.assetType = assetType;

    const assets = await ManualAsset.find(query).sort({ name: 1 });
    return NextResponse.json({ assets });
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    try {
        const body = await req.json();

        // ========== MARKET ASSET FLOW (Stock / Mutual Fund) ==========
        if (body.assetType === 'STOCK' || body.assetType === 'MUTUAL_FUND') {
            const { tickerSymbol, name, schemeCode, exchange, profile, date, quantity, price, fees } = body;

            if (!tickerSymbol || !name || !quantity || !price) {
                return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
            }

            // Find or create Instrument
            let instrument = await Instrument.findOne({
                tickerSymbol,
                assetType: body.assetType,
                userId: user.userId,
            });

            if (!instrument) {
                instrument = await Instrument.create({
                    userId: user.userId,
                    tickerSymbol,
                    name,
                    assetType: body.assetType,
                    exchange: exchange || '',
                });
            }

            // Fetch current price immediately
            try {
                if (body.assetType === 'STOCK') {
                    const priceData = await fetchYahooPrice(tickerSymbol);
                    if (priceData) {
                        instrument.currentPrice = priceData.currentPrice;
                        instrument.previousClose = priceData.previousClose;
                        instrument.priceLastUpdated = new Date();
                        await instrument.save();
                    }
                } else if (schemeCode) {
                    const navData = await fetchMutualFundNAV(schemeCode);
                    if (navData) {
                        instrument.currentPrice = navData.currentPrice;
                        instrument.previousClose = navData.previousClose;
                        instrument.priceLastUpdated = new Date();
                        await instrument.save();
                    }
                }
            } catch (priceErr) {
                console.warn('Price fetch failed, continuing without live price:', priceErr);
            }

            // Create BUY transaction
            const transaction = await Transaction.create({
                userId: user.userId,
                profile: profile || 'sameer',
                instrumentId: instrument._id,
                type: 'BUY',
                date: new Date(date),
                quantity: parseFloat(quantity),
                price: parseFloat(price),
                fees: parseFloat(fees || '0'),
                notes: `Added via Assets page`,
            });

            return NextResponse.json({
                message: 'Instrument and transaction created',
                instrument,
                transaction,
            }, { status: 201 });
        }

        // ========== MANUAL ASSET FLOW (FD/EPF/PPF/ULIP/OTHER) ==========
        const asset = await ManualAsset.create({
            userId: user.userId,
            profile: body.profile,
            assetType: body.assetType,
            name: body.name,
            currentValue: body.currentValue,
            totalInvested: body.totalInvested || body.currentValue,
            interestRate: body.interestRate || 0,
            maturityDate: body.maturityDate || null,
            status: 'ACTIVE',
            valueHistory: [{
                date: new Date(),
                value: body.currentValue,
                cashFlow: body.totalInvested || body.currentValue,
                notes: 'Initial entry',
            }],
        });

        return NextResponse.json({ asset }, { status: 201 });
    } catch (error: any) {
        console.error('Asset creation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create asset' },
            { status: 500 }
        );
    }
}
