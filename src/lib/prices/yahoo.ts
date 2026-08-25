

export interface PriceResult {
    currentPrice: number;
    previousClose: number;
}

export async function fetchYahooPrice(ticker: string): Promise<PriceResult | null> {
    try {
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=2d`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            }
        });
        
        if (!res.ok) {
            console.warn(`No price data for ${ticker}: ${res.status}`);
            return null;
        }

        const data = await res.json();
        const result = data.chart?.result?.[0]?.meta;

        if (!result || !result.regularMarketPrice) {
            console.warn(`No price data for ${ticker}`);
            return null;
        }

        return {
            currentPrice: result.regularMarketPrice,
            previousClose: result.chartPreviousClose || result.regularMarketPrice,
        };
    } catch (error: any) {
        console.error(`Yahoo fetch failed for ${ticker}:`, error.message);
        return null;
    }
}

export async function fetchYahooPrices(
    tickers: string[]
): Promise<Map<string, PriceResult>> {
    const results = new Map<string, PriceResult>();

    for (const ticker of tickers) {
        const price = await fetchYahooPrice(ticker);
        if (price) {
            results.set(ticker, price);
        }
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    return results;
}
