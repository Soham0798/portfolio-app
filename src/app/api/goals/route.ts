import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Goal from '@/models/Goal';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const profile = searchParams.get('profile');

    const query: any = { userId: new mongoose.Types.ObjectId(user.userId) };
    if (profile && profile !== 'combined') query.profile = profile;

    const goals = await Goal.find(query).sort({ timelineYears: 1 });
    return NextResponse.json({ goals });
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const body = await req.json();

    const goal = await Goal.create({
        userId: user.userId,
        name: body.name,
        target: Number(body.target),
        current: Number(body.current),
        timelineYears: Number(body.timelineYears),
        profile: body.profile || 'default'
    });

    return NextResponse.json({ goal }, { status: 201 });
}
