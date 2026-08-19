import yahooFinanceDefault from 'yahoo-finance2';
const yahooFinance = new (yahooFinanceDefault as any)();

export interface PriceResult {
    currentPrice: number;
    previousClose: number;
}

export async function fetchYahooPrice(ticker: string): Promise<PriceResult | null> {
    try {
        const quote: any = await yahooFinance.quote(ticker);

        if (!quote || !quote.regularMarketPrice) {
            console.warn(`No price data for ${ticker}`);
            return null;
        }

        return {
            currentPrice: quote.regularMarketPrice,
            previousClose: quote.regularMarketPreviousClose || quote.regularMarketPrice,
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
