import { PriceResult } from './yahoo';


export async function fetchMutualFundNAV(schemeCode: string): Promise<PriceResult | null> {
    try {
        const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}`, {
            next: { revalidate: 0 },
        });

        if (!res.ok) {
            console.error(`AMFI fetch failed for ${schemeCode}: ${res.status}`);
            return null;
        }

        const data = await res.json();

        if (!data.data || data.data.length < 2) {
            console.warn(`No NAV data for scheme ${schemeCode}`);
            return null;
        }

        const latest = parseFloat(data.data[0].nav);
        const previous = parseFloat(data.data[1].nav);

        return {
            currentPrice: latest,
            previousClose: previous,
        };
    } catch (error: any) {
        console.error(`AMFI fetch error for ${schemeCode}:`, error.message);
        return null;
    }
}

export async function fetchMutualFundNAVs(
    schemeCodes: string[]
): Promise<Map<string, PriceResult>> {
    const results = new Map<string, PriceResult>();

    for (const code of schemeCodes) {
        const nav = await fetchMutualFundNAV(code);
        if (nav) {
            results.set(code, nav);
        }
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    return results;
}
