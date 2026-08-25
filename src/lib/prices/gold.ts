import { fetchYahooPrice, PriceResult } from './yahoo';

const TROY_OUNCE_TO_GRAMS = 31.1035;

export async function fetchGoldPriceINR(): Promise<PriceResult | null> {
    try {
        const [goldQuote, usdInrQuote]: any = await Promise.all([
            fetchYahooPrice('GC=F'),
            fetchYahooPrice('USDINR=X'),
        ]);

        if (!goldQuote?.currentPrice || !usdInrQuote?.currentPrice) {
            console.error('Failed to fetch gold or USDINR price');
            return null;
        }

        const goldUSD = goldQuote.currentPrice;
        const goldPrevUSD = goldQuote.previousClose || goldUSD;
        const usdInr = usdInrQuote.currentPrice;

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
