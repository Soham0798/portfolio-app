import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import DailySnapshot from '@/models/DailySnapshots';

export async function GET(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const latest = searchParams.get('latest');

    if (latest === 'true') {
        const snapshots = await DailySnapshot.find({ userId: user.userId })
            .sort({ dateString: -1 })
            .limit(2);

        return NextResponse.json({
            latest: snapshots[0] || null,
            previous: snapshots[1] || null,
        });
    }

    const query: any = { userId: user.userId };
    if (from || to) {
        query.dateString = {};
        if (from) query.dateString.$gte = from;
        if (to) query.dateString.$lte = to;
    }

    const snapshots = await DailySnapshot.find(query).sort({ dateString: 1 });

    return NextResponse.json({ snapshots });
}
