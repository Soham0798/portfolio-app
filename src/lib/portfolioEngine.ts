export interface PortfolioData {
    assets: Array<{
        name: string;
        type: string;
        value: number;
        cost: number;
        isLiquid?: boolean;
    }>;
    liabilities: Array<{
        name: string;
        type: string;
        outstanding: number;
        emi: number;
        interestRate: number;
    }>;
    goals: Array<{
        name: string;
        target: number;
        current: number;
        timelineYears: number;
    }>;
    userProfile: {
        age: number;
        monthlyIncome: number;
        monthlyExpenses: number;
        insuranceCover: number;
        isProfileConfigured?: boolean;
    };
}

export interface Insight {
    id: string;
    type: 'Urgent' | 'Opportunity' | 'Rebalance';
    message: string;
    actionLabel: string;
    actionHref: string;
}

export interface HealthScore {
    total: number;
    subScores: {
        debtBurden: { score: number; weight: number };
        liquidity: { score: number; weight: number };
        diversification: { score: number; weight: number };
        emiToIncome: { score: number; weight: number };
        goalProgress: { score: number; weight: number };
        costAndPerformance: { score: number; weight: number };
        insuranceAdequacy: { score: number; weight: number };
        ageRiskAlignment: { score: number; weight: number };
    };
}

export function calculateHealthScore(data: PortfolioData): HealthScore {
    const totalAssets = data.assets.reduce((sum, a) => sum + a.value, 0) || 1;
    const totalLiabilities = data.liabilities.reduce((sum, l) => sum + l.outstanding, 0);
    const totalEMI = data.liabilities.reduce((sum, l) => sum + l.emi, 0);

    // 1. Debt Burden (18%)
    const debtRatio = totalLiabilities / totalAssets;
    const debtBurdenScore = Math.max(0, 100 - (debtRatio * 200)); // scales so 50% debt = 0 score

    // 2. Liquidity (13%)
    const liquidAssets = data.assets.filter(a => a.isLiquid).reduce((sum, a) => sum + a.value, 0);
    const targetLiquidity = data.userProfile.monthlyExpenses * 6 || 1;
    const liquidityScore = Math.min(100, (liquidAssets / targetLiquidity) * 100);

    // 3. Diversification (13%) - Herfindahl-Hirschman Index
    const typeAllocations = data.assets.reduce((acc, a) => {
        acc[a.type] = (acc[a.type] || 0) + a.value;
        return acc;
    }, {} as Record<string, number>);
    let hhi = 0;
    for (const type in typeAllocations) {
        const pct = typeAllocations[type] / totalAssets;
        hhi += pct * pct;
    }
    const diversificationScore = Math.max(0, 100 - (hhi * 100)); // if 100% in one asset, hhi=1, score=0

    // 4. EMI-to-income (13%)
    let emiToIncomeScore = 100;
    if (data.userProfile.monthlyIncome > 0) {
        const emiRatio = totalEMI / data.userProfile.monthlyIncome;
        if (emiRatio > 0.3) {
            emiToIncomeScore = Math.max(0, 100 - ((emiRatio - 0.3) * 500)); // scales 30% -> 100, 50% -> 0
        }
    }

    // 5. Goal progress (18%)
    let goalProgressScore = 100;
    if (data.goals.length > 0) {
        const goalScores = data.goals.map(g => {
            const timeWeightedTarget = g.target; // simplistic, assume straight line
            return Math.min(100, (g.current / timeWeightedTarget) * 100);
        });
        goalProgressScore = goalScores.reduce((sum, s) => sum + s, 0) / goalScores.length;
    }

    // 6. Cost & performance (9%) - Mocked for now
    const costAndPerformanceScore = 85; 

    // 7. Insurance adequacy (5%)
    const recommendedCover = data.userProfile.monthlyIncome * 12 * 10; // 10x annual income
    const insuranceAdequacyScore = recommendedCover > 0 
        ? Math.min(100, (data.userProfile.insuranceCover / recommendedCover) * 100)
        : 100;

    // 8. Age-risk alignment (11%)
    let equityAssets = 0;
    data.assets.forEach(a => {
        if (a.type === 'STOCK' || a.type === 'MUTUAL_FUND' || a.type === 'ETF' || a.type === 'Equity') {
            equityAssets += a.value;
        }
    });
    
    const expectedEquityPct = 110 - data.userProfile.age;
    const band = { low: expectedEquityPct - 10, high: expectedEquityPct + 10 };
    const actualEquityPct = (equityAssets / totalAssets) * 100;
    
    let ageRiskScore = 100;
    if (actualEquityPct < band.low) {
        ageRiskScore = Math.max(0, 100 - (band.low - actualEquityPct) * 3.5);
    } else if (actualEquityPct > band.high) {
        ageRiskScore = Math.max(0, 100 - (actualEquityPct - band.high) * 3.5);
    }

    const subScores = {
        debtBurden: { score: debtBurdenScore, weight: 0.18 },
        liquidity: { score: liquidityScore, weight: 0.13 },
        diversification: { score: diversificationScore, weight: 0.13 },
        emiToIncome: { score: emiToIncomeScore, weight: 0.13 },
        goalProgress: { score: goalProgressScore, weight: 0.18 },
        costAndPerformance: { score: costAndPerformanceScore, weight: 0.09 },
        insuranceAdequacy: { score: insuranceAdequacyScore, weight: 0.05 },
        ageRiskAlignment: { score: ageRiskScore, weight: 0.11 }
    };

    let total = 0;
    for (const key of Object.keys(subScores) as Array<keyof typeof subScores>) {
        total += subScores[key].score * subScores[key].weight;
    }

    return { total: Math.round(total), subScores };
}

export function generateInsights(data: PortfolioData, holdings?: Array<{name: string; tickerSymbol: string; assetType: string; currentValue: number; totalGain: number; dayGain: number; totalInvested: number; avgBuyPrice: number; currentPrice: number; currentQty: number}>): Insight[] {
    const insights: Insight[] = [];
    const totalAssets = data.assets.reduce((sum, a) => sum + a.value, 0) || 1;
    const liquidAssets = data.assets.filter(a => a.isLiquid).reduce((sum, a) => sum + a.value, 0);
    const fmt = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.abs(n));
    const fmtL = (n: number) => `₹${(Math.abs(n) / 100000).toFixed(1)}L`;

    // === SPECIFIC INSIGHTS FROM ACTUAL HOLDINGS ===
    if (holdings && holdings.length > 0) {
        // Top gainer today
        const sorted = [...holdings].sort((a, b) => b.dayGain - a.dayGain);
        const topGainer = sorted[0];
        if (topGainer && topGainer.dayGain > 0) {
            const prevVal = topGainer.currentValue - topGainer.dayGain;
            const pct = prevVal > 0 ? (topGainer.dayGain / prevVal) * 100 : 0;
            insights.push({
                id: 'top-gainer',
                type: 'Opportunity',
                message: `${topGainer.name} gained ₹${fmt(topGainer.dayGain)} (+${pct.toFixed(1)}%) today — your best performer.`,
                actionLabel: 'View holdings',
                actionHref: '/dashboard/holdings'
            });
        }

        // Top loser today
        const topLoser = sorted[sorted.length - 1];
        if (topLoser && topLoser.dayGain < 0 && topLoser.tickerSymbol !== topGainer?.tickerSymbol) {
            const prevVal = topLoser.currentValue - topLoser.dayGain;
            const pct = prevVal > 0 ? (topLoser.dayGain / prevVal) * 100 : 0;
            insights.push({
                id: 'top-loser',
                type: 'Urgent',
                message: `${topLoser.name} dropped ₹${fmt(topLoser.dayGain)} (${pct.toFixed(1)}%) today — your biggest drag.`,
                actionLabel: 'Review position',
                actionHref: '/dashboard/holdings'
            });
        }

        // Biggest single position concentration
        const byValue = [...holdings].sort((a, b) => b.currentValue - a.currentValue);
        const biggest = byValue[0];
        if (biggest && holdings.length > 1) {
            const pct = (biggest.currentValue / totalAssets) * 100;
            if (pct > 25) {
                insights.push({
                    id: `concentration-${biggest.tickerSymbol}`,
                    type: 'Rebalance',
                    message: `${biggest.name} is ${Math.round(pct)}% of your portfolio (₹${fmt(biggest.currentValue)}). Consider trimming to reduce single-stock risk.`,
                    actionLabel: 'View allocation',
                    actionHref: '/dashboard/holdings'
                });
            }
        }

        // Worst underperformer (by total P&L %)
        const withPnlPct = holdings
            .filter(h => h.totalInvested > 0)
            .map(h => ({ ...h, pnlPct: (h.totalGain / h.totalInvested) * 100 }))
            .sort((a, b) => a.pnlPct - b.pnlPct);
        const worstPerformer = withPnlPct[0];
        if (worstPerformer && worstPerformer.pnlPct < -10) {
            insights.push({
                id: `underperformer-${worstPerformer.tickerSymbol}`,
                type: 'Rebalance',
                message: `${worstPerformer.name} is down ${worstPerformer.pnlPct.toFixed(1)}% since purchase (Avg: ₹${fmt(worstPerformer.avgBuyPrice)}, CMP: ₹${fmt(worstPerformer.currentPrice)}). Review if the thesis still holds.`,
                actionLabel: 'Review holding',
                actionHref: '/dashboard/holdings'
            });
        }

        // Best performer (by total P&L %)
        const bestPerformer = withPnlPct[withPnlPct.length - 1];
        if (bestPerformer && bestPerformer.pnlPct > 50 && bestPerformer.tickerSymbol !== worstPerformer?.tickerSymbol) {
            insights.push({
                id: `star-performer-${bestPerformer.tickerSymbol}`,
                type: 'Opportunity',
                message: `${bestPerformer.name} is up +${bestPerformer.pnlPct.toFixed(1)}% (₹${fmt(bestPerformer.totalGain)} profit). Consider booking partial profits if it's a large position.`,
                actionLabel: 'View position',
                actionHref: '/dashboard/holdings'
            });
        }
    }

    // === GOAL-SPECIFIC INSIGHTS ===
    if (data.goals.length > 0) {
        data.goals.forEach(g => {
            const shortfall = g.target - g.current;
            if (shortfall > 0 && g.timelineYears > 0) {
                const monthlyNeeded = shortfall / (g.timelineYears * 12);
                const targetYear = new Date().getFullYear() + g.timelineYears;
                insights.push({
                    id: `goal-${g.name}`,
                    type: shortfall > g.target * 0.5 ? 'Urgent' : 'Opportunity',
                    message: `${g.name} is ₹${fmt(shortfall)} short — you need ₹${fmt(monthlyNeeded)}/mo to hit ₹${fmt(g.target)} by ${targetYear}.`,
                    actionLabel: 'View goals',
                    actionHref: '/dashboard/planning'
                });
            }
        });
    }

    // === STRUCTURAL INSIGHTS ===

    // Liability prepay opportunity
    const highInterestLiabilities = data.liabilities.filter(l => l.interestRate >= 10);
    if (highInterestLiabilities.length > 0 && liquidAssets > data.userProfile.monthlyExpenses * 8) {
        const excessLiquidity = liquidAssets - (data.userProfile.monthlyExpenses * 6);
        if (excessLiquidity > 50000) {
            const savingsPerYear = (excessLiquidity * highInterestLiabilities[0].interestRate) / 100;
            insights.push({
                id: 'prepay',
                type: 'Opportunity',
                message: `You have ₹${fmt(excessLiquidity)} excess cash. Prepaying ${highInterestLiabilities[0].name} (${highInterestLiabilities[0].interestRate}% p.a.) could save ₹${fmt(savingsPerYear)} in interest this year.`,
                actionLabel: 'Calculate savings',
                actionHref: '/dashboard/liabilities'
            });
        }
    }

    // Emergency Fund
    if (data.userProfile.monthlyExpenses > 0) {
        const monthsOfLiquidity = liquidAssets / data.userProfile.monthlyExpenses;
        if (monthsOfLiquidity < 3) {
            const needed = (data.userProfile.monthlyExpenses * 6) - liquidAssets;
            insights.push({
                id: 'emergency-fund',
                type: 'Urgent',
                message: `Emergency fund covers only ${monthsOfLiquidity.toFixed(1)} months. You need ₹${fmt(needed)} more to reach a safe 6-month cushion.`,
                actionLabel: 'Add liquid assets',
                actionHref: '/dashboard/manualassets'
            });
        }
    }

    // Debt Burden
    const totalLiabilities = data.liabilities.reduce((sum, l) => sum + l.outstanding, 0);
    if (totalAssets > 0 && totalLiabilities / totalAssets > 0.5) {
        insights.push({
            id: 'debt-burden',
            type: 'Urgent',
            message: `Debt is ${Math.round((totalLiabilities / totalAssets) * 100)}% of assets (₹${fmt(totalLiabilities)} vs ₹${fmt(totalAssets)}). Focus on paying down high-interest liabilities first.`,
            actionLabel: 'View liabilities',
            actionHref: '/dashboard/liabilities'
        });
    }

    // Age-Risk Alignment
    let equityAssets = 0;
    data.assets.forEach(a => {
        if (a.type === 'STOCK' || a.type === 'MUTUAL_FUND' || a.type === 'ETF' || a.type === 'Equity') {
            equityAssets += a.value;
        }
    });
    const expectedEquityPct = 110 - data.userProfile.age;
    const actualEquityPct = (equityAssets / totalAssets) * 100;
    if (actualEquityPct < expectedEquityPct - 15) {
        insights.push({
            id: 'age-risk',
            type: 'Opportunity',
            message: `At age ${data.userProfile.age}, equity is ${Math.round(actualEquityPct)}% vs recommended ${expectedEquityPct}%. You may miss long-term growth.`,
            actionLabel: 'Fix asset mix',
            actionHref: '/dashboard/holdings'
        });
    } else if (actualEquityPct > expectedEquityPct + 15) {
        insights.push({
            id: 'age-risk-high',
            type: 'Rebalance',
            message: `At age ${data.userProfile.age}, equity is ${Math.round(actualEquityPct)}% vs recommended ${expectedEquityPct}%. Consider diversifying into debt/gold.`,
            actionLabel: 'Review exposure',
            actionHref: '/dashboard/holdings'
        });
    }

    // Insurance check
    if (data.userProfile.monthlyIncome > 0) {
        const recommendedCover = data.userProfile.monthlyIncome * 12 * 10;
        if (data.userProfile.insuranceCover < recommendedCover * 0.5) {
            const gap = recommendedCover - data.userProfile.insuranceCover;
            insights.push({
                id: 'insurance-gap',
                type: 'Urgent',
                message: `Life cover gap of ₹${fmtL(gap)}. Rule of thumb: 10x annual income = ${fmtL(recommendedCover)}.`,
                actionLabel: 'Update insurance',
                actionHref: '/dashboard/settings'
            });
        }
    }

    // Profile incomplete
    if (!data.userProfile.isProfileConfigured) {
        insights.push({
            id: 'setup-profile',
            type: 'Urgent',
            message: `Financial profile is incomplete. Add your DOB and income to unlock personalized insights.`,
            actionLabel: 'Complete profile',
            actionHref: '/dashboard/planning'
        });
    }

    // Portfolio gap checks
    let hasGold = false, hasFixedIncome = false;
    data.assets.forEach(a => {
        if (a.type === 'SGB' || a.type === 'GOLD') hasGold = true;
        if (a.type === 'FD' || a.type === 'EPF' || a.type === 'PPF' || a.type === 'BOND') hasFixedIncome = true;
    });

    if (!hasGold && totalAssets > 100000) {
        insights.push({
            id: 'suggest-gold',
            type: 'Opportunity',
            message: `Zero gold exposure. Allocating 5-10% (~₹${fmt(totalAssets * 0.07)}) to SGBs can hedge inflation and market drops.`,
            actionLabel: 'Explore SGBs',
            actionHref: '/dashboard/manualassets'
        });
    }

    if (!hasFixedIncome && data.userProfile.age > 25 && totalAssets > 50000) {
        insights.push({
            id: 'suggest-fixed-income',
            type: 'Opportunity',
            message: `No fixed-income assets. Adding PPF/FDs can stabilize returns during equity corrections.`,
            actionLabel: 'Add Fixed Income',
            actionHref: '/dashboard/manualassets'
        });
    }

    // Fallback
    if (insights.length === 0) {
        insights.push({
            id: 'stay-course',
            type: 'Opportunity',
            message: `Portfolio is well-balanced. Keep investing consistently to reach your goals.`,
            actionLabel: 'View performance',
            actionHref: '/dashboard/history'
        });
    }

    return insights;
}
