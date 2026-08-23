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
        const url = new URL(req.url);
        const profile = url.searchParams.get('profile');

        const query: any = { userId: user.userId };
        if (profile && profile !== 'all' && profile !== 'combined') {
            query.profile = profile;
        }

        await Transaction.deleteMany(query);
        await ManualAsset.deleteMany(query);

        return NextResponse.json({ message: 'All transactions and manual assets deleted successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to clear data' }, { status: 500 });
    }
}
