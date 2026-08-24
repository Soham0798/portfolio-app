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
    const body = await req.json();

    const instrument = await Instrument.findByIdAndUpdate(
        id,
        { $set: body },
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

    // Also remove any transactions referencing this instrument
    await Transaction.deleteMany({ instrumentId: id });

    return NextResponse.json({ message: 'Instrument deleted' });
}
