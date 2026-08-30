import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { fetchAllMutualFunds } from '@/lib/prices/amfi';
import { searchSGB } from '@/lib/prices/sgb';

export async function GET(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type'); // STOCK, MUTUAL_FUND, or NPS

    if (!query || query.length < 2) {
        return NextResponse.json({ results: [] });
    }

    try {
        if (type === 'SGB') {
            const results = searchSGB(query).map(s => ({
                symbol: s.symbol,
                name: `${s.name} (Matures ${new Date(s.maturityDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}, ${s.coupon}% p.a.)`,
                exchange: 'NSE',
                type: 'SGB',
                maturityDate: s.maturityDate,
                coupon: s.coupon,
            }));
            return NextResponse.json({ results });
        }

        if (type === 'STOCK') {
            const res = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`, {
                next: { revalidate: 3600 }
            });
            const searchResults = await res.json();

            const quotes = (searchResults.quotes || [])
                .filter((q: any) => {
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
            const normalizedQuery = query.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
            const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);

            const matches = allSchemes
                .filter((s) => {
                    // Remove all spaces and symbols from the target name so that 
                    // a query for "flexicap" will match "Flexi Cap" and vice-versa
                    const squishedName = s.schemeName.toLowerCase().replace(/[^a-z0-9]/g, '');
                    // Must contain all query words
                    return queryWords.every((w) => squishedName.includes(w));
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

        if (type === 'NPS') {
            const res = await fetch('https://npsnav.in/api/schemes', {
                next: { revalidate: 86400 } // Cache for 1 day
            });
            const data = await res.json();
            const schemes = data.data || [];
            
            const normalizedQuery = query.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
            const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);

            const matches = schemes
                .filter((s: [string, string]) => {
                    const squishedName = s[1].toLowerCase().replace(/[^a-z0-9]/g, '');
                    return queryWords.every((w) => squishedName.includes(w));
                })
                .slice(0, 10)
                .map((s: [string, string]) => ({
                    symbol: s[0],
                    name: s[1],
                    type: 'NPS',
                    exchange: 'NPS Trust',
                }));

            return NextResponse.json({ results: matches });
        }

        return NextResponse.json({ results: [] });
    } catch (error: any) {
        console.error('Search error:', error.message);
        return NextResponse.json({ results: [], error: error.message }, { status: 500 });
    }
}
