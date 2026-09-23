import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SIP from '@/models/SIP';
import { getCurrentUser } from '@/lib/auth';
import mongoose from 'mongoose';

// Fetch SIPs for a specific instrument and profile
export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const { searchParams } = new URL(req.url);
        const profile = searchParams.get('profile');
        const instrumentId = searchParams.get('instrumentId');

        const query: any = { userId: new mongoose.Types.ObjectId(user.userId) };
        if (profile) query.profile = profile;
        if (instrumentId) query.instrumentId = new mongoose.Types.ObjectId(instrumentId);

        const sips = await SIP.find(query).sort({ createdAt: -1 });
        return NextResponse.json(sips);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Create or update a SIP for an instrument
export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();
        const { profile, instrumentId, amount, dateOfMonth } = body;

        if (!profile || !instrumentId || !amount || !dateOfMonth) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Calculate next execution date based on dateOfMonth
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istDate = new Date(now.getTime() + istOffset);
        
        let nextDate = new Date(istDate.getFullYear(), istDate.getMonth(), dateOfMonth);
        // If the date has already passed this month, schedule for next month
        if (nextDate <= istDate) {
            nextDate.setMonth(nextDate.getMonth() + 1);
        }

        const sip = await SIP.findOneAndUpdate(
            { 
                userId: new mongoose.Types.ObjectId(user.userId),
                profile,
                instrumentId: new mongoose.Types.ObjectId(instrumentId)
            },
            {
                $set: {
                    amount: Number(amount),
                    dateOfMonth: Number(dateOfMonth),
                    nextExecutionDate: nextDate,
                    status: 'ACTIVE'
                }
            },
            { upsert: true, new: true }
        );

        return NextResponse.json(sip, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Delete a SIP
export async function DELETE(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const { searchParams } = new URL(req.url);
        const profile = searchParams.get('profile');
        const instrumentId = searchParams.get('instrumentId');

        if (!profile || !instrumentId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await SIP.findOneAndDelete({
            userId: new mongoose.Types.ObjectId(user.userId),
            profile,
            instrumentId: new mongoose.Types.ObjectId(instrumentId)
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
