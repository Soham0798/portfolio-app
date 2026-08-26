import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Liability from '@/models/Liability';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const resolvedParams = await params;
    const liability = await Liability.findOneAndDelete({ _id: resolvedParams.id, userId: user.userId });
    
    if (!liability) {
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

    const liability = await Liability.findOneAndUpdate(
        { _id: resolvedParams.id, userId: user.userId },
        {
            $set: {
                name: body.name,
                type: body.type,
                outstanding: Number(body.outstanding),
                emi: Number(body.emi),
                interestRate: Number(body.interestRate),
                profile: body.profile
            }
        },
        { new: true }
    );

    if (!liability) {
        return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ liability });
}
