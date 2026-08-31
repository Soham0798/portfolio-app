import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Transaction from '@/models/Transaction';
import Instrument from '@/models/Instrument';

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    const { profile, date, quantity, price, fees } = body;

    // We assume the user wants to "edit" their holding. 
    // The ponytail solution: wipe all existing transactions and recreate a single BUY transaction 
    // with the exact quantity and average price specified.
    
    // First, verify the instrument exists and belongs to the user
    const instrument = await Instrument.findOne({ _id: id, userId: user.userId });
    if (!instrument) {
        return NextResponse.json({ error: 'Instrument not found' }, { status: 404 });
    }

    // Delete all existing transactions for this instrument and profile
    await Transaction.deleteMany({ 
        instrumentId: id, 
        userId: user.userId,
        profile: profile 
    });

    // Create the updated single transaction
    const transaction = await Transaction.create({
        userId: user.userId,
        profile: profile || 'sameer',
        instrumentId: id,
        type: 'BUY',
        date: date ? new Date(date) : new Date(),
        quantity: parseFloat(quantity),
        price: parseFloat(price),
        fees: parseFloat(fees || '0'),
        notes: `Updated via Assets page`,
    });

    return NextResponse.json({ message: 'Holding updated', transaction });
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { id } = await params;
    
    // For delete, we might need the profile if they want to delete only from a specific profile.
    // If not provided, we just delete all transactions for that instrument for this user.
    const url = new URL(req.url);
    const profile = url.searchParams.get('profile');

    const query: any = { 
        instrumentId: id, 
        userId: user.userId 
    };
    if (profile && profile !== 'combined') {
        query.profile = profile;
    }

    await Transaction.deleteMany(query);

    return NextResponse.json({ message: 'Holding deleted' });
}
