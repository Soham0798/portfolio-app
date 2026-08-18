import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Transaction from '@/models/Transaction';
import ManualAsset from '@/models/ManualAssets';

export async function DELETE(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    try {
        await Transaction.deleteMany({ userId: user.userId });
        await ManualAsset.deleteMany({ userId: user.userId });

        return NextResponse.json({ message: 'All transactions and manual assets deleted successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to clear data' }, { status: 500 });
    }
}
