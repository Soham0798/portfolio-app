import { fetchYahooPrice, PriceResult } from './yahoo';

const TROY_OUNCE_TO_GRAMS = 31.1034768;

// Indian gold import markup over international spot:
// 10% Basic Customs Duty + 2.5% Agriculture Infra Cess + 3% GST on (CIF + duty)
// Effective multiplier ≈ 1.1345 (validated against IBJA/goodreturns rates)
const INDIA_IMPORT_DUTY_MULTIPLIER = 1.1345;

export async function fetchGoldPriceINR(): Promise<PriceResult | null> {
    // Primary: International Gold Futures (GC=F) × USDINR, adjusted for Indian duties
    // This gives the best real-time price tracking
    try {
        const [goldQuote, usdInrQuote] = await Promise.all([
            fetchYahooPrice('GC=F'),
            fetchYahooPrice('USDINR=X'),
        ]);

        if (goldQuote?.currentPrice && usdInrQuote?.currentPrice) {
            const goldUSD = goldQuote.currentPrice;
            const goldPrevUSD = goldQuote.previousClose || goldUSD;
            const usdInr = usdInrQuote.currentPrice;

            // Convert to INR/gram then apply Indian import duty markup
            const rawCurrentPerGram = (goldUSD * usdInr) / TROY_OUNCE_TO_GRAMS;
            const rawPrevPerGram = (goldPrevUSD * usdInr) / TROY_OUNCE_TO_GRAMS;

            const currentPricePerGram = rawCurrentPerGram * INDIA_IMPORT_DUTY_MULTIPLIER;
            const previousPricePerGram = rawPrevPerGram * INDIA_IMPORT_DUTY_MULTIPLIER;

            return {
                currentPrice: Math.round(currentPricePerGram),
                previousClose: Math.round(previousPricePerGram),
            };
        }
    } catch (err: any) {
        console.warn('International gold fetch failed, trying domestic ETF fallback...', err.message);
    }

    // Fallback: Nippon Gold BeES ETF (0.01g gold per unit)
    // Less accurate due to ETF discount/premium + tracking error
    try {
        const goldBees = await fetchYahooPrice('GOLDBEES.NS');
        if (goldBees?.currentPrice) {
            const currentPerGram = goldBees.currentPrice * 100;
            const prevPerGram = (goldBees.previousClose || goldBees.currentPrice) * 100;
            return {
                currentPrice: Math.round(currentPerGram),
                previousClose: Math.round(prevPerGram),
            };
        }
    } catch (err: any) {
        console.error('All gold price sources failed:', err.message);
    }

    return null;
}


export async function fetchSilverPriceINR(): Promise<PriceResult | null> {
    try {
        const [silverQuote, usdInrQuote] = await Promise.all([
            fetchYahooPrice('SI=F'),
            fetchYahooPrice('USDINR=X'),
        ]);

        if (silverQuote?.currentPrice && usdInrQuote?.currentPrice) {
            const silverUSD = silverQuote.currentPrice;
            const silverPrevUSD = silverQuote.previousClose || silverUSD;
            const usdInr = usdInrQuote.currentPrice;

            const rawCurrentPerGram = (silverUSD * usdInr) / TROY_OUNCE_TO_GRAMS;
            const rawPrevPerGram = (silverPrevUSD * usdInr) / TROY_OUNCE_TO_GRAMS;

            const currentPricePerGram = rawCurrentPerGram * INDIA_IMPORT_DUTY_MULTIPLIER;
            const previousPricePerGram = rawPrevPerGram * INDIA_IMPORT_DUTY_MULTIPLIER;

            return {
                currentPrice: Math.round(currentPricePerGram),
                previousClose: Math.round(previousPricePerGram),
            };
        }
    } catch (err: any) {
        console.warn('International silver fetch failed, trying domestic ETF fallback...', err.message);
    }

    try {
        const silverBees = await fetchYahooPrice('SILVERBEES.NS');
        if (silverBees?.currentPrice) {
            const currentPerGram = silverBees.currentPrice; // SILVERBEES tracks ~1g
            const prevPerGram = silverBees.previousClose || silverBees.currentPrice;
            return {
                currentPrice: Math.round(currentPerGram),
                previousClose: Math.round(prevPerGram),
            };
        }
    } catch (err: any) {
        console.error('All silver price sources failed:', err.message);
    }

    return null;
}
