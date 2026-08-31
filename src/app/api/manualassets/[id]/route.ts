import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import ManualAsset from '@/models/ManualAssets';

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    const { id } = await params;
    const body = await req.json();

    const asset = await ManualAsset.findOne({ _id: id, userId: user.userId });
    if (!asset) {
        return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    if (body.name) asset.name = body.name;
    if (body.interestRate !== undefined) asset.interestRate = body.interestRate;
    if (body.lifeCover !== undefined) asset.lifeCover = body.lifeCover;
    if (body.maturityDate !== undefined) asset.maturityDate = body.maturityDate;
    if (body.status) asset.status = body.status;
    if (body.totalInvested !== undefined) asset.totalInvested = body.totalInvested;

    if (body.currentValue !== undefined && body.currentValue !== asset.currentValue) {
        asset.currentValue = body.currentValue;
        asset.valueHistory.push({
            date: new Date(),
            value: body.currentValue,
            cashFlow: body.cashFlow || 0,
            notes: body.notes || '',
        });
    }

    await asset.save();
    return NextResponse.json({ asset });
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    const { id } = await params;
    const asset = await ManualAsset.findOneAndDelete({
        _id: id,
        userId: user.userId,
    });

    if (!asset) {
        return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Asset deleted' });
}
