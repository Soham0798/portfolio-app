import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Instrument from '@/models/Instrument';
import Transaction from '@/models/Transaction';
import ManualAsset from '@/models/ManualAssets';
import DailySnapshot from '@/models/DailySnapshots';
import { refreshAllPrices } from '@/lib/prices';

export const maxDuration = 60; // Max allowed for Vercel Hobby
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    await dbConnect();
    const action = searchParams.get('action');

    if (action === 'refresh-prices') {
        const results = await refreshAllPrices();
        return NextResponse.json({ message: 'Price refresh complete', results });
    }

    if (action === 'daily-snapshot') {
        const result = await generateSnapshotInternal();
        if (!result) {
            return NextResponse.json({ message: 'No transactions found, skipping snapshot' });
        }
        return NextResponse.json({
            message: `Snapshot generated for ${result.dateString}`,
            totalValue: result.totalValue,
            totalDayGain: result.totalDayGain,
        });
    }

    if (action === 'daily-run') {
        // Combined action: refresh prices first, then generate snapshot
        const priceResults = await refreshAllPrices();
        const snapshotRes = await generateSnapshotInternal();
        if (!snapshotRes) {
            return NextResponse.json({ message: 'Prices refreshed but no transactions found for snapshot', prices: priceResults });
        }
        return NextResponse.json({
            message: `Daily run complete for ${snapshotRes.dateString}`,
            prices: priceResults,
            snapshot: {
                totalValue: snapshotRes.totalValue,
                totalDayGain: snapshotRes.totalDayGain,
            },
        });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}



async function generateSnapshotInternal() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    const dateString = istDate.toISOString().split('T')[0];

    const userIds = await Transaction.distinct('userId');
    if (!userIds || userIds.length === 0) {
        return null;
    }

    let globalValue = 0;
    let globalGain = 0;

    for (const userId of userIds) {

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

    const marketValue = holdings.reduce((s: number, h: any) => s + h.currentValue, 0);
    const marketInvested = holdings.reduce((s: number, h: any) => s + h.totalInvested, 0);
    const manualValue = manualAssets.reduce((s: number, a: any) => s + a.currentValue, 0);
    const manualInvested = manualAssets.reduce((s: number, a: any) => s + a.totalInvested, 0);

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
        const pValue = profileHoldings.reduce((s: number, h: any) => s + h.currentValue, 0) + profileManual.reduce((s: number, a: any) => s + a.currentValue, 0);
        const pInvested = profileHoldings.reduce((s: number, h: any) => s + h.totalInvested, 0) + profileManual.reduce((s: number, a: any) => s + a.totalInvested, 0);
        const pDayGain = profileHoldings.reduce((s: number, h: any) => s + h.dayGain, 0);

        return {
            totalValue: pValue,
            totalInvested: pInvested,
            dayGain: pDayGain,
            dayGainPercent: pValue > 0 ? (pDayGain / (pValue - pDayGain)) * 100 : 0,
        };
    };

    const profiles = await Transaction.distinct('profile', { userId });
    const byProfile: Record<string, any> = {};
    for (const p of profiles) {
        if (p) {
            byProfile[p] = await buildProfileSnapshot(p);
        }
    }

    const assetClassMap: Record<string, number> = {};
    holdings.forEach((h: any) => {
        assetClassMap[h.assetType] = (assetClassMap[h.assetType] || 0) + h.currentValue;
    });
    manualAssets.forEach((a: any) => {
        assetClassMap[a.assetType] = (assetClassMap[a.assetType] || 0) + a.currentValue;
    });
    const byAssetClass = Object.entries(assetClassMap).map(([assetType, value]) => ({
        assetType,
        value,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
    }));

    const totalDayGain = holdings.reduce((s: number, h: any) => s + h.dayGain, 0);

        await DailySnapshot.findOneAndUpdate(
            { userId, dateString },
            {
                $set: {
                    date: istDate,
                    totalValue,
                    totalInvested,
                    dayGain: totalDayGain,
                    dayGainPercent: totalValue > 0 ? (totalDayGain / (totalValue - totalDayGain)) * 100 : 0,
                    byProfile,
                    byAssetClass,
                }
            },
            { upsert: true, new: true }
        );

        globalValue += totalValue;
        globalGain += totalDayGain;
    }

    return { dateString, totalValue: globalValue, totalDayGain: globalGain };
}
 


