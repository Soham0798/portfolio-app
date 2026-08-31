import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';
import { refreshAllPrices } from '@/lib/prices';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const profileId = body.profileId;

        await dbConnect();

        // 1. Find all instruments the user has transactions for
        const matchStage: any = { userId: new mongoose.Types.ObjectId(user.userId) };
        if (profileId && profileId !== 'combined') {
            matchStage.profile = profileId;
        }

        const transactions = await Transaction.find(matchStage).select('instrumentId');
        const instrumentIds = [...new Set(transactions.map(t => t.instrumentId.toString()))];

        if (instrumentIds.length === 0) {
            return NextResponse.json({ message: 'No holdings to refresh', updated: 0 });
        }

        // 2. Trigger targeted price refresh
        const result = await refreshAllPrices(instrumentIds);

        return NextResponse.json({ 
            message: 'Targeted price refresh complete', 
            ...result 
        });

    } catch (error: any) {
        console.error('Error refreshing user prices:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
