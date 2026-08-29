import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import UserProfile from '@/models/UserProfile';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get('profile');

    const query: any = { userId: new mongoose.Types.ObjectId(user.userId) };
    if (profileId !== 'combined') {
        query.profile = profileId || 'default';
    }

    let profile = await UserProfile.findOne(query);
    
    // Auto-create a default profile if it doesn't exist yet
    if (!profile) {
        profile = await UserProfile.create({
            userId: user.userId,
            dob: null,
            monthlyIncome: 0,
            monthlyExpenses: 0,
            insuranceCover: 0,
            profile: profileId && profileId !== 'combined' ? profileId : 'default'
        });
    }

    return NextResponse.json({ profile });
}

export async function PUT(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const body = await req.json();
    const profileId = body.profile || 'default';

    const updateFields: any = {};
    if (body.dob !== undefined) updateFields.dob = body.dob ? new Date(body.dob) : null;
    if (body.monthlyIncome !== undefined) updateFields.monthlyIncome = Number(body.monthlyIncome);
    if (body.monthlyExpenses !== undefined) updateFields.monthlyExpenses = Number(body.monthlyExpenses);
    if (body.insuranceCover !== undefined) updateFields.insuranceCover = Number(body.insuranceCover);

    const profile = await UserProfile.findOneAndUpdate(
        { userId: user.userId, profile: profileId },
        { $set: updateFields },
        { new: true, upsert: true }
    );

    return NextResponse.json({ profile });
}
