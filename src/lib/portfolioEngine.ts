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

export function generateInsights(data: PortfolioData): Insight[] {
    const insights: Insight[] = [];
    const totalAssets = data.assets.reduce((sum, a) => sum + a.value, 0) || 1;
    const liquidAssets = data.assets.filter(a => a.isLiquid).reduce((sum, a) => sum + a.value, 0);

    // Liability prepay vs invest
    const highInterestLiabilities = data.liabilities.filter(l => l.interestRate >= 10);
    if (highInterestLiabilities.length > 0 && liquidAssets > data.userProfile.monthlyExpenses * 8) {
        const excessLiquidity = liquidAssets - (data.userProfile.monthlyExpenses * 6);
        if (excessLiquidity > 50000) {
            insights.push({
                id: 'prepay',
                type: 'Opportunity',
                message: `You have ₹${(excessLiquidity / 100000).toFixed(1)}L in excess idle cash. Prepaying your ${highInterestLiabilities[0].name} could save you ₹${((excessLiquidity * highInterestLiabilities[0].interestRate) / 100).toLocaleString('en-IN')} in interest this year.`,
                actionLabel: 'Calculate savings',
                actionHref: '/dashboard/liabilities'
            });
        }
    }

    // Concentration Risk
    data.assets.forEach(a => {
        if ((a.value / totalAssets) > 0.3) {
            insights.push({
                id: `concentration-${a.name}`,
                type: 'Rebalance',
                message: `${a.name} makes up ${Math.round((a.value / totalAssets) * 100)}% of your portfolio. Consider trimming to reduce single-asset risk.`,
                actionLabel: 'View allocation',
                actionHref: '/dashboard/holdings'
            });
        }
    });

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
            message: `At age ${data.userProfile.age}, your portfolio is too conservative (${Math.round(actualEquityPct)}% equity vs recommended ${expectedEquityPct}%). You might fall short of long-term goals.`,
            actionLabel: 'Fix asset mix',
            actionHref: '/dashboard/holdings'
        });
    }



    return insights;
}
