import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Transaction from '@/models/Transaction';

export async function GET(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const profile = searchParams.get('profile');
    const instrumentId = searchParams.get('instrumentId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const query: any = { userId: user.userId };
    if (profile && profile !== 'combined') query.profile = profile;
    if (instrumentId) query.instrumentId = instrumentId;

    const total = await Transaction.countDocuments(query);

    const transactions = await Transaction.find(query)
        .populate('instrumentId', 'name tickerSymbol assetType')
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

    return NextResponse.json({
        transactions,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    });
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    try {
        const body = await req.json();

        const transaction = await Transaction.create({
            userId: user.userId,
            profile: body.profile,
            instrumentId: body.instrumentId,
            type: body.type,
            date: new Date(body.date),
            quantity: body.quantity,
            price: body.price,
            fees: body.fees || 0,
            notes: body.notes || '',
        });

        return NextResponse.json({ transaction }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to create transaction' },
            { status: 500 }
        );
    }
}
