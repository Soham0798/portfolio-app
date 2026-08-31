import { PriceResult } from './yahoo';


const navCache = new Map<string, { data: PriceResult, timestamp: number }>();
const inFlightFetches = new Map<string, Promise<PriceResult | null>>();

export async function fetchMutualFundNAV(schemeCode: string): Promise<PriceResult | null> {
    const cached = navCache.get(schemeCode);
    if (cached && Date.now() - cached.timestamp < 1000 * 60 * 5) {
        return cached.data; // Cache for 5 mins
    }

    if (inFlightFetches.has(schemeCode)) {
        return inFlightFetches.get(schemeCode)!;
    }

    const cleanCode = schemeCode.replace(/[^0-9]/g, '');

    const fetchPromise = (async () => {
        let retries = 3;
        let lastStatus = 0;
        
        while (retries > 0) {
            try {
                const res = await fetch(`https://api.mfapi.in/mf/${cleanCode}`, {
                    cache: 'no-store',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'application/json'
                    }
                });

                lastStatus = res.status;
                if (!res.ok) {
                    if (res.status === 429 || res.status >= 500) {
                        retries--;
                        await new Promise(r => setTimeout(r, 1000 + (3 - retries) * 1000));
                        continue;
                    }
                    console.error(`AMFI fetch failed for ${schemeCode}: ${res.status}`);
                    return null;
                }

                const data = await res.json();
                if (!data.data || data.data.length < 2) {
                    console.warn(`No NAV data for scheme ${schemeCode}`);
                    return null;
                }

                return {
                    currentPrice: parseFloat(data.data[0].nav),
                    previousClose: parseFloat(data.data[1].nav),
                };
            } catch (error: any) {
                retries--;
                if (retries === 0) {
                    console.error(`AMFI fetch error for ${schemeCode}:`, error.message);
                }
                await new Promise(r => setTimeout(r, 1000 + (3 - retries) * 1000));
            }
        }
        
        console.error(`AMFI fetch failed for ${schemeCode} after retries. Last status: ${lastStatus}`);
        return null;
    })();

    inFlightFetches.set(schemeCode, fetchPromise);
    const result = await fetchPromise;
    inFlightFetches.delete(schemeCode);

    if (result) {
        navCache.set(schemeCode, { data: result, timestamp: Date.now() });
    }

    return result;
}

export async function fetchMutualFundNAVs(
    schemeCodes: string[]
): Promise<Map<string, PriceResult>> {
    const results = new Map<string, PriceResult>();
    
    // Process sequentially but with cache/deduping
    for (const code of schemeCodes) {
        const nav = await fetchMutualFundNAV(code);
        if (nav) {
            results.set(code, nav);
        }
        // Small delay if we actually made a network request
        if (!navCache.has(code) || (Date.now() - navCache.get(code)!.timestamp) < 500) {
             await new Promise(resolve => setTimeout(resolve, 400));
        }
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
    let data: AMFIScheme[] = [];
    
    try {
        const res = await fetch('https://api.mfapi.in/mf', {
            next: { revalidate: 86400 } // Cache for 24 hours
        });
        if (!res.ok) throw new Error('Failed to fetch AMFI list from mfapi');
        data = await res.json();
    } catch (error) {
        console.warn('mfapi.in down, falling back to official AMFI text list...', error);
        try {
            const res = await fetch('https://www.amfiindia.com/spages/NAVAll.txt', {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                next: { revalidate: 86400 }
            });
            if (!res.ok) throw new Error('Failed to fetch official AMFI list');
            
            const text = await res.text();
            const lines = text.split('\n');
            for (const line of lines) {
                const parts = line.split(';');
                if (parts.length >= 4) {
                    const code = parseInt(parts[0], 10);
                    if (!isNaN(code)) {
                        let name = parts[3].trim();
                        // Sometimes AMFI has plan and option in columns 4 and 5
                        if (parts[4] && parts[4].trim() && parts[4].trim() !== '-') name += ' - ' + parts[4].trim();
                        if (parts[5] && parts[5].trim() && parts[5].trim() !== '-') name += ' - ' + parts[5].trim();
                        data.push({ schemeCode: code, schemeName: name });
                    }
                }
            }
        } catch (fallbackError) {
            console.error('Both MF APIs failed:', fallbackError);
        }
    }
    
    amfiCache = data;
    return data;
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
