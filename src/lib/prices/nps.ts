import { PriceResult } from './yahoo';


export async function fetchNPSNav(schemeCode: string): Promise<PriceResult | null> {
    try {
        const res = await fetch(`https://npsnav.in/api/detailed/${schemeCode}`, {
            next: { revalidate: 0 },
        });

        if (!res.ok) {
            return await fetchNPSNavSimple(schemeCode);
        }

        const data = await res.json();

        if (!data.nav) {
            return null;
        }

        return {
            currentPrice: parseFloat(data.nav),
            previousClose: parseFloat(data.previousNav || data.nav),
        };
    } catch (error: any) {
        console.error(`NPS fetch error for ${schemeCode}:`, error.message);
        return null;
    }
}

async function fetchNPSNavSimple(schemeCode: string): Promise<PriceResult | null> {
    try {
        const res = await fetch(`https://npsnav.in/api/${schemeCode}`);
        if (!res.ok) return null;

        const text = await res.text();
        const nav = parseFloat(text.trim());

        if (isNaN(nav)) return null;

        return {
            currentPrice: nav,
            previousClose: nav,
        };
    } catch {
        return null;
    }
}

export async function fetchNPSNavs(
    schemeCodes: string[]
): Promise<Map<string, PriceResult>> {
    const results = new Map<string, PriceResult>();

    for (const code of schemeCodes) {
        const nav = await fetchNPSNav(code);
        if (nav) {
            results.set(code, nav);
        }
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    return results;
}
