import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Transaction from '@/models/Transaction';

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    const { id } = await params;
    const { profile, instrumentId, type, date, quantity, price, fees, notes } = await req.json();

    const updateFields: any = {};
    if (profile !== undefined) updateFields.profile = profile;
    if (instrumentId !== undefined) updateFields.instrumentId = instrumentId;
    if (type !== undefined) updateFields.type = type;
    if (date !== undefined) updateFields.date = new Date(date);
    if (quantity !== undefined) updateFields.quantity = quantity;
    if (price !== undefined) updateFields.price = price;
    if (fees !== undefined) updateFields.fees = fees;
    if (notes !== undefined) updateFields.notes = notes;

    const transaction = await Transaction.findOneAndUpdate(
        { _id: id, userId: user.userId },
        { $set: updateFields },
        { new: true }
    );

    if (!transaction) {
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({ transaction });
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    const { id } = await params;

    const transaction = await Transaction.findOneAndDelete({
        _id: id,
        userId: user.userId,
    });

    if (!transaction) {
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Transaction deleted' });
}
