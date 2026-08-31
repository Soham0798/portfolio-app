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

