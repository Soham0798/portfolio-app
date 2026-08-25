import { fetchYahooPrice } from './prices/yahoo';

let amfiNavCache: Record<string, { nav: number; name: string }> | null = null;
let amfiCacheTime = 0;

export async function getLiveStockPrice(ticker: string): Promise<number | null> {
    const res = await fetchYahooPrice(ticker);
    return res?.currentPrice || null;
}

export async function getLiveMFDetails(isin: string): Promise<{ nav: number; name: string } | null> {
    try {
        // Cache AMFI data for 12 hours
        if (!amfiNavCache || Date.now() - amfiCacheTime > 12 * 60 * 60 * 1000) {
            console.log('Fetching fresh AMFI NAV data...');
            const res = await fetch('https://www.amfiindia.com/spages/NAVAll.txt');
            const text = await res.text();
            
            amfiNavCache = {};
            const lines = text.split('\n');
            for (const line of lines) {
                const parts = line.split(';');
                if (parts.length >= 5 && parts[0].match(/^[A-Z0-9]{12}$/)) {
                    // Scheme Code;ISIN Div Payout/ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
                    const fileIsin = parts[1].trim(); // ISIN Growth usually
                    const schemeName = parts[3].trim();
                    const nav = parseFloat(parts[4].trim());
                    if (fileIsin && !isNaN(nav)) {
                        amfiNavCache[fileIsin] = { nav, name: schemeName };
                    }
                }
            }
            amfiCacheTime = Date.now();
        }

        return amfiNavCache[isin] || null;
    } catch (err) {
        console.error(`Failed to fetch AMFI details for ${isin}:`, err);
        return null;
    }
}

export async function getLiveGoldPricePerGram(): Promise<number | null> {
    try {
        // Fetch XAUINR=X (Gold in INR per Troy Ounce)
        const quote = await fetchYahooPrice('XAUINR=X');
        if (quote && quote.currentPrice) {
            const pricePerOunce = quote.currentPrice;
            const pricePerGram = pricePerOunce / 31.1034768;
            return pricePerGram;
        }
        return null;
    } catch (err) {
        console.error('Failed to fetch gold price:', err);
        return null;
    }
}

// Very basic fallback since NPS Trust has no public API easily accessible without Captcha
export async function getLiveNPSPrice(schemeName: string): Promise<number | null> {
    // For now, return null to fall back to the PDF value
    return null;
}
