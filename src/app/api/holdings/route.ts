import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Transaction from '@/models/Transaction';
import Instrument from '@/models/Instrument';
import ManualAsset from '@/models/ManualAssets';

export async function GET(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const profile = searchParams.get('profile');

    const matchStage: any = { userId: user.userId };
    if (profile) matchStage.profile = profile;

    const holdings = await Transaction.aggregate([
        { $match: matchStage },

        {
            $group: {
                _id: '$instrumentId',
                totalBuyQty: {
                    $sum: {
                        $cond: [{ $eq: ['$type', 'BUY'] }, '$quantity', 0]
                    }
                },
                totalSellQty: {
                    $sum: {
                        $cond: [{ $eq: ['$type', 'SELL'] }, '$quantity', 0]
                    }
                },
                totalBuyValue: {
                    $sum: {
                        $cond: [
                            { $eq: ['$type', 'BUY'] },
                            { $multiply: ['$quantity', '$price'] },
                            0
                        ]
                    }
                },
                totalFees: { $sum: '$fees' },
                totalDividends: {
                    $sum: {
                        $cond: [
                            { $eq: ['$type', 'DIVIDEND'] },
                            { $multiply: ['$quantity', '$price'] },
                            0
                        ]
                    }
                },
            }
        },

        {
            $addFields: {
                currentQty: { $subtract: ['$totalBuyQty', '$totalSellQty'] },
                totalInvested: { $add: ['$totalBuyValue', '$totalFees'] },
            }
        },

        { $match: { currentQty: { $gt: 0 } } },

        {
            $lookup: {
                from: 'instruments',
                localField: '_id',
                foreignField: '_id',
                as: 'instrument',
            }
        },

        { $unwind: '$instrument' },

        {
            $project: {
                _id: 0,
                instrumentId: '$_id',
                name: '$instrument.name',
                tickerSymbol: '$instrument.tickerSymbol',
                assetType: '$instrument.assetType',
                currentQty: 1,
                avgBuyPrice: { $divide: ['$totalBuyValue', '$totalBuyQty'] },
                totalInvested: 1,
                totalFees: 1,
                totalDividends: 1,
                currentPrice: '$instrument.currentPrice',
                previousClose: '$instrument.previousClose',
                currentValue: { $multiply: ['$currentQty', '$instrument.currentPrice'] },
                totalGain: {
                    $subtract: [
                        { $multiply: ['$currentQty', '$instrument.currentPrice'] },
                        '$totalInvested'
                    ]
                },
                dayGain: {
                    $multiply: [
                        '$currentQty',
                        { $subtract: ['$instrument.currentPrice', '$instrument.previousClose'] }
                    ]
                },
            }
        },

        { $sort: { currentValue: -1 } },
    ]);

    const manualQuery: any = { userId: user.userId, status: 'ACTIVE' };
    if (profile) manualQuery.profile = profile;
    const manualAssets = await ManualAsset.find(manualQuery);

    const marketValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const marketInvested = holdings.reduce((sum, h) => sum + h.totalInvested, 0);
    const manualValue = manualAssets.reduce((sum, a) => sum + a.currentValue, 0);
    const manualInvested = manualAssets.reduce((sum, a) => sum + a.totalInvested, 0);

    const totalValue = marketValue + manualValue;
    const totalInvested = marketInvested + manualInvested;
    const totalGain = totalValue - totalInvested;
    const totalDayGain = holdings.reduce((sum, h) => sum + h.dayGain, 0);

    return NextResponse.json({
        holdings,
        manualAssets,
        summary: {
            totalValue,
            totalInvested,
            totalGain,
            totalGainPercent: totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0,
            totalDayGain,
            totalDayGainPercent: totalValue > 0 ? (totalDayGain / (totalValue - totalDayGain)) * 100 : 0,
            marketValue,
            manualValue,
        },
    });
}
