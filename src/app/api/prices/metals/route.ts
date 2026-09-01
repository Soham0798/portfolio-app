import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { fetchGoldPriceINR, fetchSilverPriceINR } from '@/lib/prices/gold';

export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const [gold, silver] = await Promise.all([
            fetchGoldPriceINR(),
            fetchSilverPriceINR()
        ]);

        return NextResponse.json({
            gold: gold?.currentPrice || null,
            silver: silver?.currentPrice || null
        });

    } catch (error: any) {
        console.error('Error fetching metal prices:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
