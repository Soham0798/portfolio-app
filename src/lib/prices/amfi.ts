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

export interface AMFIScheme {
    schemeCode: number;
    schemeName: string;
}

let amfiCache: AMFIScheme[] | null = null;

export async function fetchAllMutualFunds(): Promise<AMFIScheme[]> {
    if (amfiCache) return amfiCache;
    try {
        const res = await fetch('https://api.mfapi.in/mf');
        if (!res.ok) throw new Error('Failed to fetch AMFI list');
        const data = await res.json();
        amfiCache = data;
        return data;
    } catch (error) {
        console.error('Error fetching AMFI list:', error);
        return [];
    }
}

export function searchMutualFund(query: string, allSchemes: AMFIScheme[]): string | null {
    if (!query || allSchemes.length === 0) return null;

    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);
    
    const queryTokens = normalize(query);
    const isDirect = queryTokens.includes('direct');
    const isGrowth = queryTokens.includes('growth');
    // If ambiguous, assume Direct Growth (typical for modern platforms like Groww/Zerodha)
    const preferDirect = isDirect || !queryTokens.includes('regular');
    const preferGrowth = isGrowth || (!queryTokens.includes('idcw') && !queryTokens.includes('dividend'));

    let bestMatch: string | null = null;
    let highestScore = 0;

    for (const scheme of allSchemes) {
        const schemeTokens = normalize(scheme.schemeName);
        
        let score = 0;
        for (const token of queryTokens) {
            if (schemeTokens.includes(token)) {
                // Weight longer words heavily
                score += token.length; 
            }
        }

        const schemeIsDirect = schemeTokens.includes('direct');
        const schemeIsGrowth = schemeTokens.includes('growth');
        const schemeIsIDCW = schemeTokens.includes('idcw') || schemeTokens.includes('dividend');
        const schemeIsRegular = schemeTokens.includes('regular');

        if (preferDirect && schemeIsRegular) score -= 50;
        if (!preferDirect && schemeIsDirect) score -= 50;
        
        if (preferGrowth && schemeIsIDCW) score -= 50;
        if (!preferGrowth && schemeIsGrowth) score -= 50;

        if (score > highestScore) {
            highestScore = score;
            bestMatch = scheme.schemeCode.toString();
        }
    }

    if (highestScore > 15) {
        return bestMatch;
    }
    
    return null;
}
