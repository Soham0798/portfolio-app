import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { fetchAllMutualFunds } from '@/lib/prices/amfi';


export async function GET(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type'); // STOCK or MUTUAL_FUND

    if (!query || query.length < 2) {
        return NextResponse.json({ results: [] });
    }

    try {
        if (type === 'STOCK') {
            const res = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`);
            const searchResults = await res.json();

            const quotes = (searchResults.quotes || [])
                .filter((q: any) => {
                    // Only show NSE/BSE Indian stocks + common exchanges
                    const exchange = (q.exchange || '').toUpperCase();
                    const symbol = (q.symbol || '');
                    return (
                        symbol.endsWith('.NS') ||
                        symbol.endsWith('.BO') ||
                        exchange.includes('NSE') ||
                        exchange.includes('BSE') ||
                        exchange.includes('NSI') ||
                        exchange.includes('BOM')
                    );
                })
                .slice(0, 5)
                .map((q: any) => ({
                    symbol: q.symbol,
                    name: q.shortname || q.longname || q.symbol,
                    exchange: q.exchange || '',
                    type: 'STOCK',
                }));

            return NextResponse.json({ results: quotes });
        }

        if (type === 'MUTUAL_FUND') {
            const allSchemes = await fetchAllMutualFunds();
            const normalizedQuery = query.toLowerCase();

            const matches = allSchemes
                .filter((s) => {
                    const name = s.schemeName.toLowerCase();
                    // Must contain all query words
                    const queryWords = normalizedQuery.split(/\s+/);
                    return queryWords.every((w) => name.includes(w));
                })
                // Prefer Direct Growth plans
                .sort((a, b) => {
                    const aName = a.schemeName.toLowerCase();
                    const bName = b.schemeName.toLowerCase();
                    const aScore =
                        (aName.includes('direct') ? 2 : 0) +
                        (aName.includes('growth') ? 1 : 0);
                    const bScore =
                        (bName.includes('direct') ? 2 : 0) +
                        (bName.includes('growth') ? 1 : 0);
                    return bScore - aScore;
                })
                .slice(0, 5)
                .map((s) => ({
                    symbol: `MF ${s.schemeCode}`,
                    name: s.schemeName,
                    schemeCode: s.schemeCode.toString(),
                    type: 'MUTUAL_FUND',
                }));

            return NextResponse.json({ results: matches });
        }

        return NextResponse.json({ results: [] });
    } catch (error: any) {
        console.error('Search error:', error.message);
        return NextResponse.json({ results: [], error: error.message }, { status: 500 });
    }
}
