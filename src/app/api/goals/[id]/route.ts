import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Goal from '@/models/Goal';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const resolvedParams = await params;
    const goal = await Goal.findOneAndDelete({ _id: resolvedParams.id, userId: user.userId });
    
    if (!goal) {
        return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const resolvedParams = await params;
    const body = await req.json();

    const goal = await Goal.findOneAndUpdate(
        { _id: resolvedParams.id, userId: user.userId },
        {
            $set: {
                name: body.name,
                target: Number(body.target),
                current: Number(body.current),
                timelineYears: Number(body.timelineYears),
                profile: body.profile
            }
        },
        { new: true }
    );

    if (!goal) {
        return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ goal });
}
