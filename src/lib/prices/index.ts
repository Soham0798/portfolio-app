import Instrument from '@/models/Instrument';
import { fetchYahooPrices, PriceResult } from './yahoo';
import { fetchMutualFundNAVs } from './amfi';
import { fetchNPSNavs } from './nps';
import { fetchGoldPriceINR } from './gold';

export interface RefreshResult {
    updated: number;
    failed: number;
    errors: string[];
}

export async function refreshAllPrices(): Promise<RefreshResult> {
    const instruments = await Instrument.find({ isActive: true });
    const result: RefreshResult = { updated: 0, failed: 0, errors: [] };

    const stocks: typeof instruments = [];
    const mutualFunds: typeof instruments = [];
    const npsSchemes: typeof instruments = [];
    const goldInstruments: typeof instruments = [];

    for (const inst of instruments) {
        switch (inst.assetType) {
            case 'STOCK':
            case 'ETF':
            case 'SGB':
                stocks.push(inst);
                break;
            case 'MUTUAL_FUND':
                mutualFunds.push(inst);
                break;
            case 'NPS':
                npsSchemes.push(inst);
                break;
            case 'GOLD':
                goldInstruments.push(inst);
                break;
        }
    }

    if (stocks.length > 0) {
        const tickers = stocks.map(s => s.tickerSymbol);
        const prices = await fetchYahooPrices(tickers);

        for (const inst of stocks) {
            const price = prices.get(inst.tickerSymbol);
            if (price) {
                inst.previousClose = price.previousClose;
                inst.currentPrice = price.currentPrice;
                inst.priceLastUpdated = new Date();
                await inst.save();
                result.updated++;
            } else {
                result.failed++;
                result.errors.push(`${inst.tickerSymbol}: no price data`);
            }
        }
    }

    if (mutualFunds.length > 0) {
        const codes = mutualFunds.map(m => m.tickerSymbol);
        const navs = await fetchMutualFundNAVs(codes);

        for (const inst of mutualFunds) {
            const nav = navs.get(inst.tickerSymbol);
            if (nav) {
                inst.previousClose = nav.previousClose;
                inst.currentPrice = nav.currentPrice;
                inst.priceLastUpdated = new Date();
                await inst.save();
                result.updated++;
            } else {
                result.failed++;
                result.errors.push(`MF ${inst.tickerSymbol}: no NAV data`);
            }
        }
    }

    if (npsSchemes.length > 0) {
        const codes = npsSchemes.map(n => n.tickerSymbol);
        const navs = await fetchNPSNavs(codes);

        for (const inst of npsSchemes) {
            const nav = navs.get(inst.tickerSymbol);
            if (nav) {
                inst.previousClose = nav.previousClose;
                inst.currentPrice = nav.currentPrice;
                inst.priceLastUpdated = new Date();
                await inst.save();
                result.updated++;
            } else {
                result.failed++;
                result.errors.push(`NPS ${inst.tickerSymbol}: no NAV data`);
            }
        }
    }

    if (goldInstruments.length > 0) {
        const goldPrice = await fetchGoldPriceINR();

        for (const inst of goldInstruments) {
            if (goldPrice) {
                inst.previousClose = goldPrice.previousClose;
                inst.currentPrice = goldPrice.currentPrice;
                inst.priceLastUpdated = new Date();
                await inst.save();
                result.updated++;
            } else {
                result.failed++;
                result.errors.push(`Gold: failed to fetch price`);
            }
        }
    }

    console.log(`Price refresh complete: ${result.updated} updated, ${result.failed} failed`);
    return result;
}
