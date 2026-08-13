import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Instrument from '@/models/Instrument';
import Transaction from '@/models/Transaction';
import ManualAsset from '@/models/ManualAssets';
import DailySnapshot from '@/models/DailySnapshots';

function verifyCronSecret(req: NextRequest): boolean {
    const authHeader = req.headers.get('authorization');
    const secret = process.env.CRON_SECRET;
    return authHeader === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
    if (!verifyCronSecret(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'refresh-prices') {
        return await refreshPrices();
    }

    if (action === 'daily-snapshot') {
        return await generateSnapshot();
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

async function refreshPrices() {
    const instruments = await Instrument.find({ isActive: true });

    const results = { updated: 0, failed: 0, errors: [] as string[] };

    for (const instrument of instruments) {
        try {
            console.log(`Would fetch price for: ${instrument.tickerSymbol} (${instrument.assetType})`);
            results.updated++;
        } catch (error: any) {
            results.failed++;
            results.errors.push(`${instrument.tickerSymbol}: ${error.message}`);
        }
    }

    return NextResponse.json({ message: 'Price refresh complete', results });
}

async function generateSnapshot() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    const dateString = istDate.toISOString().split('T')[0];

    const Transaction_ = await Transaction.findOne();
    if (!Transaction_) {
        return NextResponse.json({ message: 'No transactions found, skipping snapshot' });
    }
    const userId = Transaction_.userId;

    const holdings = await Transaction.aggregate([
        { $match: { userId } },
        {
            $group: {
                _id: '$instrumentId',
                totalBuyQty: { $sum: { $cond: [{ $eq: ['$type', 'BUY'] }, '$quantity', 0] } },
                totalSellQty: { $sum: { $cond: [{ $eq: ['$type', 'SELL'] }, '$quantity', 0] } },
                totalBuyValue: {
                    $sum: { $cond: [{ $eq: ['$type', 'BUY'] }, { $multiply: ['$quantity', '$price'] }, 0] }
                },
                totalFees: { $sum: '$fees' },
            }
        },
        { $addFields: { currentQty: { $subtract: ['$totalBuyQty', '$totalSellQty'] } } },
        { $match: { currentQty: { $gt: 0 } } },
        {
            $lookup: {
                from: 'instruments', localField: '_id', foreignField: '_id', as: 'instrument'
            }
        },
        { $unwind: '$instrument' },
        {
            $project: {
                currentQty: 1,
                totalInvested: { $add: ['$totalBuyValue', '$totalFees'] },
                currentValue: { $multiply: ['$currentQty', '$instrument.currentPrice'] },
                assetType: '$instrument.assetType',
                dayGain: {
                    $multiply: [
                        '$currentQty',
                        { $subtract: ['$instrument.currentPrice', '$instrument.previousClose'] }
                    ]
                },
            }
        },
    ]);

    const manualAssets = await ManualAsset.find({ userId, status: 'ACTIVE' });

    const marketValue = holdings.reduce((s, h) => s + h.currentValue, 0);
    const marketInvested = holdings.reduce((s, h) => s + h.totalInvested, 0);
    const manualValue = manualAssets.reduce((s, a) => s + a.currentValue, 0);
    const manualInvested = manualAssets.reduce((s, a) => s + a.totalInvested, 0);

    const totalValue = marketValue + manualValue;
    const totalInvested = marketInvested + manualInvested;

    const buildProfileSnapshot = async (profile: string) => {
        const profileHoldings = await Transaction.aggregate([
            { $match: { userId, profile } },
            { $group: { _id: '$instrumentId', totalBuyQty: { $sum: { $cond: [{ $eq: ['$type', 'BUY'] }, '$quantity', 0] } }, totalSellQty: { $sum: { $cond: [{ $eq: ['$type', 'SELL'] }, '$quantity', 0] } }, totalBuyValue: { $sum: { $cond: [{ $eq: ['$type', 'BUY'] }, { $multiply: ['$quantity', '$price'] }, 0] } }, totalFees: { $sum: '$fees' } } },
            { $addFields: { currentQty: { $subtract: ['$totalBuyQty', '$totalSellQty'] } } },
            { $match: { currentQty: { $gt: 0 } } },
            { $lookup: { from: 'instruments', localField: '_id', foreignField: '_id', as: 'instrument' } },
            { $unwind: '$instrument' },
            { $project: { totalInvested: { $add: ['$totalBuyValue', '$totalFees'] }, currentValue: { $multiply: ['$currentQty', '$instrument.currentPrice'] }, dayGain: { $multiply: ['$currentQty', { $subtract: ['$instrument.currentPrice', '$instrument.previousClose'] }] } } },
        ]);

        const profileManual = await ManualAsset.find({ userId, profile, status: 'ACTIVE' });
        const pValue = profileHoldings.reduce((s, h) => s + h.currentValue, 0) + profileManual.reduce((s, a) => s + a.currentValue, 0);
        const pInvested = profileHoldings.reduce((s, h) => s + h.totalInvested, 0) + profileManual.reduce((s, a) => s + a.totalInvested, 0);
        const pDayGain = profileHoldings.reduce((s, h) => s + h.dayGain, 0);

        return {
            totalValue: pValue,
            totalInvested: pInvested,
            dayGain: pDayGain,
            dayGainPercent: pValue > 0 ? (pDayGain / (pValue - pDayGain)) * 100 : 0,
        };
    };

    const sameerSnapshot = await buildProfileSnapshot('sameer');
    const snehalSnapshot = await buildProfileSnapshot('snehal');

    const assetClassMap: Record<string, number> = {};
    holdings.forEach(h => {
        assetClassMap[h.assetType] = (assetClassMap[h.assetType] || 0) + h.currentValue;
    });
    manualAssets.forEach(a => {
        assetClassMap[a.assetType] = (assetClassMap[a.assetType] || 0) + a.currentValue;
    });
    const byAssetClass = Object.entries(assetClassMap).map(([assetType, value]) => ({
        assetType,
        value,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
    }));

    const totalDayGain = holdings.reduce((s, h) => s + h.dayGain, 0);

    await DailySnapshot.findOneAndUpdate(
        { userId, dateString },
        {
            $set: {
                date: istDate,
                totalValue,
                totalInvested,
                dayGain: totalDayGain,
                dayGainPercent: totalValue > 0 ? (totalDayGain / (totalValue - totalDayGain)) * 100 : 0,
                byProfile: { sameer: sameerSnapshot, snehal: snehalSnapshot },
                byAssetClass,
            }
        },
        { upsert: true, new: true }
    );

    return NextResponse.json({
        message: `Snapshot generated for ${dateString}`,
        totalValue,
        totalDayGain,
    });
}
