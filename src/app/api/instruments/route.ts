import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Instrument from '@/models/Instrument';

export async function GET(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const assetType = searchParams.get('type');
    const activeOnly = searchParams.get('active');

    const query: any = {
        $or: [
            { isGlobal: true },
            { userId: user.userId }
        ]
    };
    if (assetType) query.assetType = assetType;
    if (activeOnly !== 'false') query.isActive = true;

    const instruments = await Instrument.find(query).sort({ name: 1 });
    return NextResponse.json({ instruments });
}


export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    // Prevent DoS: Limit regular users to 50 custom instruments
    if (!user.isAdmin) {
        const customCount = await Instrument.countDocuments({ userId: user.userId, isGlobal: false });
        if (customCount >= 50) {
            return NextResponse.json(
                { error: 'Custom instrument quota exceeded (50 max)' },
                { status: 403 }
            );
        }
    }

    try {
        const body = await req.json();
        const instrument = await Instrument.create({
            userId: user.userId,
            tickerSymbol: body.tickerSymbol,
            name: body.name,
            assetType: body.assetType,
            exchange: body.exchange || '',
            isGlobal: user.isAdmin === true,
        });
        return NextResponse.json({ instrument }, { status: 201 });
    } catch (error: any) {
        if (error.code === 11000) {
            return NextResponse.json(
                { error: 'Instrument with this ticker and type already exists' },
                { status: 409 }
            );
        }
        return NextResponse.json({ error: 'Failed to create instrument' }, { status: 500 });
    }
}
