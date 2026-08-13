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


    const query: any = {};
    if (assetType) query.assetType = assetType;
    if (activeOnly !== 'false') query.isActive = true;

    const instruments = await Instrument.find(query).sort({ name: 1 });
    return NextResponse.json({ instruments });
}


export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    try {
        const body = await req.json();
        const instrument = await Instrument.create({
            tickerSymbol: body.tickerSymbol,
            name: body.name,
            assetType: body.assetType,
            exchange: body.exchange || '',
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
