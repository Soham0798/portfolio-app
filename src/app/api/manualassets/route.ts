import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import ManualAsset from '@/models/ManualAssets';

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
        return NextResponse.json(
            { error: error.message || 'Failed to create asset' },
            { status: 500 }
        );
    }
}
