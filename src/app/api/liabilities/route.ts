import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Liability from '@/models/Liability';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const profile = searchParams.get('profile');

    const query: any = { userId: new mongoose.Types.ObjectId(user.userId) };
    if (profile && profile !== 'combined') query.profile = profile;

    const liabilities = await Liability.find(query).sort({ outstanding: -1 });
    return NextResponse.json({ liabilities });
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const body = await req.json();

    const liability = await Liability.create({
        userId: user.userId,
        name: body.name,
        type: body.type,
        outstanding: Number(body.outstanding),
        emi: Number(body.emi),
        interestRate: Number(body.interestRate),
        profile: body.profile || 'default'
    });

    return NextResponse.json({ liability }, { status: 201 });
}
