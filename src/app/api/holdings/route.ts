import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Transaction from '@/models/Transaction';
import Instrument from '@/models/Instrument';
import ManualAsset from '@/models/ManualAssets';
import Liability from '@/models/Liability';
import Goal from '@/models/Goal';
import UserProfile from '@/models/UserProfile';

import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const profile = searchParams.get('profile');

    const matchStage: any = { userId: new mongoose.Types.ObjectId(user.userId) };
    if (profile && profile !== 'combined') matchStage.profile = profile;

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
    if (profile && profile !== 'combined') manualQuery.profile = profile;
    const manualAssets = await ManualAsset.find(manualQuery);

    const marketValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const marketInvested = holdings.reduce((sum, h) => sum + h.totalInvested, 0);
    const manualValue = manualAssets.reduce((sum, a) => sum + a.currentValue, 0);
    const manualInvested = manualAssets.reduce((sum, a) => sum + a.totalInvested, 0);

    const totalValue = marketValue + manualValue;
    const totalInvested = marketInvested + manualInvested;
    const totalGain = totalValue - totalInvested;
    const totalDayGain = holdings.reduce((sum: any, h: any) => sum + h.dayGain, 0);

    // Mocked Portfolio Data
    const engineAssets = [
        ...holdings.map((h: any) => ({
            name: h.name,
            type: h.assetType,
            value: h.currentValue,
            cost: h.totalInvested,
            isLiquid: h.assetType === 'ETF' || h.assetType === 'STOCK' || h.assetType === 'MUTUAL_FUND'
        })),
        ...manualAssets.map((a: any) => ({
            name: a.name,
            type: a.assetType,
            value: a.currentValue,
            cost: a.totalInvested,
            isLiquid: a.assetType === 'CASH' || a.assetType === 'FD'
        }))
    ];

    const liabilities = await Liability.find(matchStage);
    const goals = await Goal.find(matchStage);

    let userProfile = null;
    if (profile !== 'combined') {
        userProfile = await UserProfile.findOne({ 
            userId: new mongoose.Types.ObjectId(user.userId),
            profile: profile || 'default'
        });
    }

    const resolvedProfile = userProfile ? userProfile : {
        dob: null,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        insuranceCover: 0
    } as any;

    let age = 30;
    if (resolvedProfile.dob) {
        const dob = new Date(resolvedProfile.dob);
        const ageDifMs = Date.now() - dob.getTime();
        const ageDate = new Date(ageDifMs);
        age = Math.abs(ageDate.getUTCFullYear() - 1970);
    }
    resolvedProfile.age = age;

    const PortfolioData = {
        assets: engineAssets,
        liabilities,
        goals,
        userProfile: resolvedProfile
    };

    // Calculate Portfolio Engine scores and insights
    const { calculateHealthScore, generateInsights } = await import('@/lib/portfolioEngine');
    const healthScore = calculateHealthScore(PortfolioData);
    const insights = generateInsights(PortfolioData);

    return NextResponse.json({
        holdings,
        manualAssets,
        liabilities,
        goals,
        healthScore,
        insights,
        summary: {
            ...resolvedProfile.toObject ? resolvedProfile.toObject() : resolvedProfile,
            age,
            totalValue,
            totalInvested,
            totalGain,
            totalGainPercent: totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0,
            totalDayGain,
            totalDayGainPercent: totalValue > 0 ? (totalDayGain / (totalValue - totalDayGain)) * 100 : 0,
            marketValue,
            manualValue,
            netWorth: totalValue - liabilities.reduce((sum, l) => sum + (l.outstanding || 0), 0),
            isProfileConfigured: !!resolvedProfile.dob,
            userProfile: resolvedProfile
        },
    });
}
