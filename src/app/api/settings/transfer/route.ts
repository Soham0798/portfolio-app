import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Transaction, { PROFILES } from '@/models/Transaction';
import ManualAsset from '@/models/ManualAssets';

export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { fromProfile, toProfile } = body;

    if (!fromProfile || !toProfile) {
        return NextResponse.json({ error: 'fromProfile and toProfile are required' }, { status: 400 });
    }

    if (fromProfile === toProfile) {
        return NextResponse.json({ error: 'Cannot transfer to the same profile' }, { status: 400 });
    }

    if (!PROFILES.includes(fromProfile) || !PROFILES.includes(toProfile)) {
        return NextResponse.json({ error: 'Invalid profile selection' }, { status: 400 });
    }

    await dbConnect();

    try {
        const txRes = await Transaction.updateMany(
            { userId: user.userId, profile: fromProfile },
            { $set: { profile: toProfile } }
        );

        const assetRes = await ManualAsset.updateMany(
            { userId: user.userId, profile: fromProfile },
            { $set: { profile: toProfile } }
        );

        return NextResponse.json({
            message: 'Transfer complete',
            transactionsMoved: txRes.modifiedCount,
            assetsMoved: assetRes.modifiedCount
        });
    } catch (error: any) {
        console.error('Transfer error:', error);
        return NextResponse.json({ error: 'Failed to transfer data' }, { status: 500 });
    }
}
