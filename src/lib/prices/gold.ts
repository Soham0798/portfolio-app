import yahooFinance from 'yahoo-finance2';
import { PriceResult } from './yahoo';

const TROY_OUNCE_TO_GRAMS = 31.1035;

export async function fetchGoldPriceINR(): Promise<PriceResult | null> {
    try {
        const [goldQuote, usdInrQuote]: any = await Promise.all([
            yahooFinance.quote('GC=F'),
            yahooFinance.quote('USDINR=X'),
        ]);

        if (!goldQuote?.regularMarketPrice || !usdInrQuote?.regularMarketPrice) {
            console.error('Failed to fetch gold or USDINR price');
            return null;
        }

        const goldUSD = goldQuote.regularMarketPrice;
        const goldPrevUSD = goldQuote.regularMarketPreviousClose || goldUSD;
        const usdInr = usdInrQuote.regularMarketPrice;

        const currentPricePerGram = (goldUSD * usdInr) / TROY_OUNCE_TO_GRAMS;
        const previousPricePerGram = (goldPrevUSD * usdInr) / TROY_OUNCE_TO_GRAMS;

        return {
            currentPrice: Math.round(currentPricePerGram * 100) / 100,
            previousClose: Math.round(previousPricePerGram * 100) / 100,
        };
    } catch (error: any) {
        console.error('Gold price fetch error:', error.message);
        return null;
    }
}
