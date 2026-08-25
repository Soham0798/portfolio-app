import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Instrument from '@/models/Instrument';
import Transaction from '@/models/Transaction';

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    const { id } = await params;
    const { name, tickerSymbol, assetType, exchange, isActive } = await req.json();

    const updateFields: any = {};
    if (name !== undefined) updateFields.name = name;
    if (tickerSymbol !== undefined) updateFields.tickerSymbol = tickerSymbol;
    if (assetType !== undefined) updateFields.assetType = assetType;
    if (exchange !== undefined) updateFields.exchange = exchange;
    if (isActive !== undefined) updateFields.isActive = isActive;

    const instrument = await Instrument.findByIdAndUpdate(
        id,
        { $set: updateFields },
        { new: true }
    );

    if (!instrument) {
        return NextResponse.json({ error: 'Instrument not found' }, { status: 404 });
    }

    return NextResponse.json({ instrument });
}


export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    const { id } = await params;
    const instrument = await Instrument.findByIdAndDelete(id);

    if (!instrument) {
        return NextResponse.json({ error: 'Instrument not found' }, { status: 404 });
    }

    // Only remove transactions referencing this instrument that belong to THIS user
    await Transaction.deleteMany({ instrumentId: id, userId: user.userId });

    return NextResponse.json({ message: 'Instrument deleted' });
}
