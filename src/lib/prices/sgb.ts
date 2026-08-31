import { fetchYahooPrice, PriceResult } from './yahoo';
import { fetchGoldPriceINR } from './gold';

export interface SGBSeries {
    symbol: string;      // NSE ticker e.g. SGBAUG28.NS
    name: string;        // Human-readable series name
    issueDate: string;   // YYYY-MM-DD
    maturityDate: string; // YYYY-MM-DD (8 years from issue)
    coupon: number;      // % per annum (always 2.5 for all SGBs)
}

export const SGB_SERIES: SGBSeries[] = [
    // FY 2015-16
    { symbol: 'SGBNOV23.NS', name: 'SGB 2015-16 Series I', issueDate: '2015-11-30', maturityDate: '2023-11-30', coupon: 2.75 },
    { symbol: 'SGBJAN24.NS', name: 'SGB 2015-16 Series II', issueDate: '2016-01-18', maturityDate: '2024-01-18', coupon: 2.75 },
    { symbol: 'SGBMAR24.NS', name: 'SGB 2015-16 Series III', issueDate: '2016-03-29', maturityDate: '2024-03-29', coupon: 2.75 },
    // FY 2016-17
    { symbol: 'SGBAUG24.NS', name: 'SGB 2016-17 Series I', issueDate: '2016-08-05', maturityDate: '2024-08-05', coupon: 2.5 },
    { symbol: 'SGBSEP24.NS', name: 'SGB 2016-17 Series II', issueDate: '2016-09-30', maturityDate: '2024-09-30', coupon: 2.5 },
    { symbol: 'SGBOCT24.NS', name: 'SGB 2016-17 Series III', issueDate: '2016-10-21', maturityDate: '2024-10-21', coupon: 2.5 },
    { symbol: 'SGBNOV24.NS', name: 'SGB 2016-17 Series IV', issueDate: '2016-11-17', maturityDate: '2024-11-17', coupon: 2.5 },
    { symbol: 'SGBMAR25A.NS', name: 'SGB 2016-17 Series VI', issueDate: '2017-03-17', maturityDate: '2025-03-17', coupon: 2.5 },
    // FY 2017-18
    { symbol: 'SGBMAY25.NS', name: 'SGB 2017-18 Series I', issueDate: '2017-05-12', maturityDate: '2025-05-12', coupon: 2.5 },
    { symbol: 'SGBJUL25.NS', name: 'SGB 2017-18 Series II', issueDate: '2017-07-28', maturityDate: '2025-07-28', coupon: 2.5 },
    { symbol: 'SGBOCT25.NS', name: 'SGB 2017-18 Series III', issueDate: '2017-10-16', maturityDate: '2025-10-16', coupon: 2.5 },
    { symbol: 'SGBNOV25.NS', name: 'SGB 2017-18 Series IV', issueDate: '2017-11-17', maturityDate: '2025-11-17', coupon: 2.5 },
    { symbol: 'SGBJAN26.NS', name: 'SGB 2017-18 Series V', issueDate: '2018-01-12', maturityDate: '2026-01-12', coupon: 2.5 },
    { symbol: 'SGBMAR26.NS', name: 'SGB 2017-18 Series VI', issueDate: '2018-03-16', maturityDate: '2026-03-16', coupon: 2.5 },
    // FY 2018-19
    { symbol: 'SGBMAY26.NS', name: 'SGB 2018-19 Series I', issueDate: '2018-05-25', maturityDate: '2026-05-25', coupon: 2.5 },
    { symbol: 'SGBJUL26.NS', name: 'SGB 2018-19 Series II', issueDate: '2018-07-16', maturityDate: '2026-07-16', coupon: 2.5 },
    { symbol: 'SGBOCT26.NS', name: 'SGB 2018-19 Series III', issueDate: '2018-10-29', maturityDate: '2026-10-29', coupon: 2.5 },
    { symbol: 'SGBNOV26.NS', name: 'SGB 2018-19 Series IV', issueDate: '2018-11-26', maturityDate: '2026-11-26', coupon: 2.5 },
    { symbol: 'SGBJAN27.NS', name: 'SGB 2018-19 Series V', issueDate: '2019-01-25', maturityDate: '2027-01-25', coupon: 2.5 },
    { symbol: 'SGBMAR27.NS', name: 'SGB 2018-19 Series VI', issueDate: '2019-03-15', maturityDate: '2027-03-15', coupon: 2.5 },
    // FY 2019-20
    { symbol: 'SGBJUN27.NS', name: 'SGB 2019-20 Series I', issueDate: '2019-06-11', maturityDate: '2027-06-11', coupon: 2.5 },
    { symbol: 'SGBAUG27.NS', name: 'SGB 2019-20 Series II', issueDate: '2019-08-06', maturityDate: '2027-08-06', coupon: 2.5 },
    { symbol: 'SGBOCT27.NS', name: 'SGB 2019-20 Series III', issueDate: '2019-10-15', maturityDate: '2027-10-15', coupon: 2.5 },
    { symbol: 'SGBNOV27.NS', name: 'SGB 2019-20 Series IV', issueDate: '2019-11-27', maturityDate: '2027-11-27', coupon: 2.5 },
    { symbol: 'SGBJAN28.NS', name: 'SGB 2019-20 Series V', issueDate: '2020-01-17', maturityDate: '2028-01-17', coupon: 2.5 },
    { symbol: 'SGBMAR28.NS', name: 'SGB 2019-20 Series VI', issueDate: '2020-03-11', maturityDate: '2028-03-11', coupon: 2.5 },
    // FY 2020-21
    { symbol: 'SGBMAY28.NS', name: 'SGB 2020-21 Series I', issueDate: '2020-05-26', maturityDate: '2028-05-26', coupon: 2.5 },
    { symbol: 'SGBJUN28A.NS', name: 'SGB 2020-21 Series II', issueDate: '2020-06-16', maturityDate: '2028-06-16', coupon: 2.5 },
    { symbol: 'SGBJUL28.NS', name: 'SGB 2020-21 Series III', issueDate: '2020-07-14', maturityDate: '2028-07-14', coupon: 2.5 },
    { symbol: 'SGBAUG28.NS', name: 'SGB 2020-21 Series IV', issueDate: '2020-08-04', maturityDate: '2028-08-04', coupon: 2.5 },
    { symbol: 'SGBSEP28.NS', name: 'SGB 2020-21 Series V', issueDate: '2020-09-08', maturityDate: '2028-09-08', coupon: 2.5 },
    { symbol: 'SGBOCT28.NS', name: 'SGB 2020-21 Series VI', issueDate: '2020-10-27', maturityDate: '2028-10-27', coupon: 2.5 },
    { symbol: 'SGBNOV28.NS', name: 'SGB 2020-21 Series VII', issueDate: '2020-11-20', maturityDate: '2028-11-20', coupon: 2.5 },
    { symbol: 'SGBDEC28.NS', name: 'SGB 2020-21 Series VIII', issueDate: '2020-12-29', maturityDate: '2028-12-29', coupon: 2.5 },
    { symbol: 'SGBJAN29.NS', name: 'SGB 2020-21 Series IX', issueDate: '2021-01-19', maturityDate: '2029-01-19', coupon: 2.5 },
    { symbol: 'SGBFEB29.NS', name: 'SGB 2020-21 Series X', issueDate: '2021-02-09', maturityDate: '2029-02-09', coupon: 2.5 },
    { symbol: 'SGBMAR29.NS', name: 'SGB 2020-21 Series XI', issueDate: '2021-03-09', maturityDate: '2029-03-09', coupon: 2.5 },
    // FY 2021-22
    { symbol: 'SGBMAY29.NS', name: 'SGB 2021-22 Series I', issueDate: '2021-05-28', maturityDate: '2029-05-28', coupon: 2.5 },
    { symbol: 'SGBMAY29II.NS', name: 'SGB 2021-22 Series II', issueDate: '2021-05-25', maturityDate: '2029-05-25', coupon: 2.5 },
    { symbol: 'SGBJUN29.NS', name: 'SGB 2021-22 Series III', issueDate: '2021-06-22', maturityDate: '2029-06-22', coupon: 2.5 },
    { symbol: 'SGBJUL29.NS', name: 'SGB 2021-22 Series IV', issueDate: '2021-07-27', maturityDate: '2029-07-27', coupon: 2.5 },
    { symbol: 'SGBAUG29.NS', name: 'SGB 2021-22 Series V', issueDate: '2021-08-31', maturityDate: '2029-08-31', coupon: 2.5 },
    { symbol: 'SGBSEP29.NS', name: 'SGB 2021-22 Series VI', issueDate: '2021-09-28', maturityDate: '2029-09-28', coupon: 2.5 },
    { symbol: 'SGBOCT29.NS', name: 'SGB 2021-22 Series VII', issueDate: '2021-10-29', maturityDate: '2029-10-29', coupon: 2.5 },
    { symbol: 'SGBNOV29.NS', name: 'SGB 2021-22 Series VIII', issueDate: '2021-11-30', maturityDate: '2029-11-30', coupon: 2.5 },
    { symbol: 'SGBDEC29.NS', name: 'SGB 2021-22 Series IX', issueDate: '2021-12-28', maturityDate: '2029-12-28', coupon: 2.5 },
    { symbol: 'SGBJAN30.NS', name: 'SGB 2021-22 Series X', issueDate: '2022-01-25', maturityDate: '2030-01-25', coupon: 2.5 },
    { symbol: 'SGBFEB30.NS', name: 'SGB 2021-22 Series XI', issueDate: '2022-02-22', maturityDate: '2030-02-22', coupon: 2.5 },
    { symbol: 'SGBMAR30.NS', name: 'SGB 2021-22 Series XII', issueDate: '2022-03-22', maturityDate: '2030-03-22', coupon: 2.5 },
    // FY 2022-23
    { symbol: 'SGBJUN30.NS', name: 'SGB 2022-23 Series I', issueDate: '2022-06-28', maturityDate: '2030-06-28', coupon: 2.5 },
    { symbol: 'SGBAUG30.NS', name: 'SGB 2022-23 Series II', issueDate: '2022-08-30', maturityDate: '2030-08-30', coupon: 2.5 },
    { symbol: 'SGBDEC30.NS', name: 'SGB 2022-23 Series III', issueDate: '2022-12-27', maturityDate: '2030-12-27', coupon: 2.5 },
    { symbol: 'SGBMAR31.NS', name: 'SGB 2022-23 Series IV', issueDate: '2023-03-28', maturityDate: '2031-03-28', coupon: 2.5 },
    // FY 2023-24
    { symbol: 'SGBJUN31.NS', name: 'SGB 2023-24 Series I', issueDate: '2023-06-27', maturityDate: '2031-06-27', coupon: 2.5 },
    { symbol: 'SGBSEP31.NS', name: 'SGB 2023-24 Series II', issueDate: '2023-09-26', maturityDate: '2031-09-26', coupon: 2.5 },
    { symbol: 'SGBDEC31.NS', name: 'SGB 2023-24 Series III', issueDate: '2023-12-19', maturityDate: '2031-12-19', coupon: 2.5 },
    { symbol: 'SGBFEB32.NS', name: 'SGB 2023-24 Series IV', issueDate: '2024-02-21', maturityDate: '2032-02-21', coupon: 2.5 },
];

export function searchSGB(query: string): SGBSeries[] {
    const q = query.toLowerCase().replace(/[^a-z0-9]/g, '');
    return SGB_SERIES.filter(s => {
        const sName = (s.name + ' ' + s.symbol).toLowerCase().replace(/[^a-z0-9]/g, '');
        return sName.includes(q);
    }).slice(0, 8);
}

// ---- NSE Live SGB Prices ----

interface NSESGBQuote {
    symbol: string;
    ltP: string;       // Last traded price
    prevClose: string;  // Previous close
    open: string;
    high: string;
    low: string;
}

// Cache NSE session cookies (they expire, so refresh every 5 min)
let nseCookieCache: { cookies: string; expires: number } | null = null;

async function getNSECookies(): Promise<string> {
    if (nseCookieCache && Date.now() < nseCookieCache.expires) {
        return nseCookieCache.cookies;
    }
    const res = await fetch('https://www.nseindia.com', {
        cache: 'no-store',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
    });
    const setCookies = res.headers.getSetCookie?.() || [];
    const cookieStr = setCookies.map((c: string) => c.split(';')[0]).join('; ');
    nseCookieCache = { cookies: cookieStr, expires: Date.now() + 5 * 60 * 1000 };
    return cookieStr;
}

/** Fetch all live SGB prices from NSE in one call */
export async function fetchAllNSESGBPrices(): Promise<Map<string, PriceResult>> {
    const result = new Map<string, PriceResult>();
    try {
        const cookies = await getNSECookies();
        const res = await fetch('https://www.nseindia.com/api/sovereign-gold-bonds', {
            cache: 'no-store',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.nseindia.com/market-data/sovereign-gold-bond',
                'Cookie': cookies,
            },
        });
        if (!res.ok) return result;

        const data = await res.json();
        const quotes: NSESGBQuote[] = data.data || [];

        for (const q of quotes) {
            const ltp = parseFloat(q.ltP);
            const prev = parseFloat(q.prevClose);
            if (ltp > 0) {
                // NSE symbol is e.g. "SGBJUN28", our ticker has ".NS" suffix
                result.set(`${q.symbol}.NS`, {
                    currentPrice: ltp,
                    previousClose: prev || ltp,
                });
            }
        }
    } catch (err: any) {
        console.warn('NSE SGB fetch failed:', err.message);
    }
    return result;
}

/** Fetch price for a single SGB symbol. Tries NSE first, falls back to gold rate. */
export async function fetchSGBPrice(symbol: string): Promise<PriceResult | null> {
    // 1. Try NSE live SGB prices (most accurate — actual secondary market price)
    try {
        const allPrices = await fetchAllNSESGBPrices();
        const nsePrice = allPrices.get(symbol);
        if (nsePrice) return nsePrice;

        // Try without .NS suffix match
        const bareSymbol = symbol.replace('.NS', '');
        for (const [key, val] of allPrices) {
            if (key.replace('.NS', '') === bareSymbol) return val;
        }
    } catch {
        // fall through
    }

    // 2. Fallback: use live gold rate (1 SGB unit ≈ 1 gram of gold)
    return await fetchGoldPriceINR();
}

