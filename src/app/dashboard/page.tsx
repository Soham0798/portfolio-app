'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import GaugeMeter from '@/components/GaugeMeter';
import { useProfile } from '@/components/ProfileContext';
import styles from './dashboard.module.css';
import Link from 'next/link';
import NumberInput from '@/components/NumberInput';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';

interface Holding {
    instrumentId: string;
    name: string;
    tickerSymbol: string;
    assetType: string;
    currentQty: number;
    avgBuyPrice: number;
    currentPrice: number;
    currentValue: number;
    totalGain: number;
    dayGain: number;
    totalInvested: number;
}

interface Liability {
    name: string;
    type: string;
    outstanding: number;
    emi: number;
    interestRate: number;
}

interface Goal {
    name: string;
    target: number;
    current: number;
    timelineYears: number;
}

interface Insight {
    id: string;
    type: 'Urgent' | 'Opportunity' | 'Rebalance';
    message: string;
    actionLabel: string;
    actionHref: string;
}

interface HealthScore {
    total: number;
    subScores: Record<string, { score: number; weight: number; message: string }>;
}

interface Summary {
    totalValue: number;
    totalInvested: number;
    totalGain: number;
    totalDayGain: number;
    netWorth: number;
    isProfileConfigured: boolean;
    userProfile?: {
        age: number;
    };
}

export default function DashboardPage() {
    const { profile } = useProfile();
    const [holdings, setHoldings] = useState<Holding[]>([]);
    const [liabilities, setLiabilities] = useState<Liability[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [insights, setInsights] = useState<Insight[]>([]);
    const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [snapshots, setSnapshots] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isLiveRefreshing, setIsLiveRefreshing] = useState(false);
    const [trendRange, setTrendRange] = useState<'7D' | '1M' | '3M' | '1Y' | 'ALL'>('ALL');

    const [showBreakdown, setShowBreakdown] = useState(false);
    const [showAgePrompt, setShowAgePrompt] = useState(false);
    const [isSubmittingAge, setIsSubmittingAge] = useState(false);
    const [promptDob, setPromptDob] = useState('');

    const fetchData = useCallback(async (silent = false, signal?: AbortSignal) => {
        if (!silent) setLoading(true);
        try {
            const profileParam = profile === 'combined' ? '' : `?profile=${profile}`;
            
            const reqInit = signal ? { signal } : {};
            const [res, snapRes] = await Promise.all([
                fetch(`/api/holdings${profileParam}`, reqInit),
                fetch(`/api/snapshots${profileParam}`, reqInit)
            ]);
            
            const data = await res.json();
            const snapData = await snapRes.json();
            
            if (signal?.aborted) return;

            setHoldings(data.holdings || []);
            setLiabilities(data.liabilities || []);
            setGoals(data.goals || []);
            setInsights(data.insights || []);
            setHealthScore(data.healthScore || null);
            setSummary(data.summary || null);
            let processedSnapshots = snapData.snapshots || [];
            if (profile !== 'combined') {
                processedSnapshots = processedSnapshots.map((s: any) => {
                    if (s.byProfile && s.byProfile[profile]) {
                        return { ...s, ...s.byProfile[profile] };
                    }
                    return s;
                });
            }
            setSnapshots(processedSnapshots);

            if (data.summary && !data.summary.isProfileConfigured && profile !== 'combined') {
                setShowAgePrompt(true);
            }
        } catch (error: any) {
            if (error.name === 'AbortError') return;
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            if (!signal?.aborted && !silent) setLoading(false);
        }
    }, [profile]);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        const triggerLiveRefresh = async () => {
            setIsLiveRefreshing(true);
            try {
                const res = await fetch('/api/prices/refresh-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ profileId: profile }),
                    signal,
                });
                if (res.ok && !signal.aborted) {
                    await fetchData(true, signal);
                }
            } catch (err: any) {
                if (err.name === 'AbortError') return;
                console.error('Live refresh failed:', err);
            } finally {
                if (!signal.aborted) setIsLiveRefreshing(false);
            }
        };

        // Initial load (shows spinner)
        fetchData(false, signal).then(() => {
            // After initial DB load, fetch live prices silently
            if (!signal.aborted) triggerLiveRefresh();
        });

        return () => controller.abort();
    }, [profile, fetchData]);

    const handleSaveAge = async () => {
        if (!promptDob) return;
        setIsSubmittingAge(true);
        try {
            await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dob: promptDob, profile: profile === 'combined' ? 'default' : profile })
            });
            setShowAgePrompt(false);
            fetchData();
        } catch (e) {
            console.error('Failed to save age', e);
        } finally {
            setIsSubmittingAge(false);
        }
    };

    const formatCurrency = (n: number) => {
        return new Intl.NumberFormat('en-IN', {
            maximumFractionDigits: 0,
        }).format(n);
    };

    if (loading) {
        return <div className={styles.loading}>Loading Portfolio...</div>;
    }

    const calculatePayoffDate = (outstanding: number, emi: number, interestRate: number) => {
        if (emi <= 0 || outstanding <= 0) return null;
        
        const monthlyRate = (interestRate / 100) / 12;
        let months = 0;
        
        if (monthlyRate === 0) {
            months = outstanding / emi;
        } else {
            const v = 1 - (outstanding * monthlyRate) / emi;
            if (v <= 0) return 'Never (EMI too low)';
            months = -Math.log(v) / Math.log(1 + monthlyRate);
        }
        
        if (months > 1200) return '100+ years';
    
        const date = new Date();
        date.setMonth(date.getMonth() + Math.ceil(months));
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    const netWorth = summary?.netWorth || 0;
    const totalAssets = summary?.totalValue || 0;
    const totalLiabilities = liabilities.reduce((acc, l) => acc + (l.outstanding || 0), 0);
    const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) : 0;
    const debtToAssetPercent = debtToAssetRatio * 100;
    
    // Calculate if debt is "good" or "bad" based on age
    const age = summary?.userProfile?.age || 30;
    // Rule of thumb: Age 20 can tolerate ~50% debt-to-asset, drops 1% per year, min 10%
    const maxAcceptableDebt = Math.max(10, 50 - (age - 20));
    const isDebtGood = debtToAssetPercent <= maxAcceptableDebt;

    let debtInsight = "";
    if (isDebtGood) {
        debtInsight = `Healthy for age ${age}`;
    } else {
        debtInsight = `High for age ${age} (Target: <${(maxAcceptableDebt / 100).toFixed(2)})`;
    }
    
    // Liquid roughly 30 days
    const liquidTypes = ['EQUITY', 'MUTUAL_FUND', 'CASH', 'FD', 'ETF', 'GOLD'];
    const liquidAssets = holdings
        .filter(h => liquidTypes.includes(h.assetType))
        .reduce((acc, h) => acc + h.currentValue, 0);

    // Group assets for donut
    const assetBuckets: Record<string, number> = {
        'Direct equity': 0,
        'Mutual funds': 0,
        'Fixed deposits': 0,
        'EPF / PPF': 0,
        'Gold': 0,
        'Cash': 0,
        'Other': 0
    };

    holdings.forEach(h => {
        if (h.assetType === 'EQUITY' || h.assetType === 'STOCK') assetBuckets['Direct equity'] += h.currentValue;
        else if (h.assetType === 'MUTUAL_FUND') assetBuckets['Mutual funds'] += h.currentValue;
        else if (h.assetType === 'FD') assetBuckets['Fixed deposits'] += h.currentValue;
        else if (h.assetType === 'EPF' || h.assetType === 'PPF') assetBuckets['EPF / PPF'] += h.currentValue;
        else if (h.assetType === 'GOLD' || h.assetType === 'SGB') assetBuckets['Gold'] += h.currentValue;
        else if (h.assetType === 'CASH') assetBuckets['Cash'] += h.currentValue;
        else assetBuckets['Other'] += h.currentValue;
    });

    const bucketArray = Object.entries(assetBuckets).filter(([_, val]) => val > 0).sort((a, b) => b[1] - a[1]);
    const allocColors = ['#60a5fa', '#34d399', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6', '#64748b'];

    let conicGradient = '';
    let currentDegree = 0;
    bucketArray.forEach(([name, val], index) => {
        const pct = val / totalAssets;
        const degrees = pct * 360;
        const color = allocColors[index % allocColors.length];
        conicGradient += `${color} ${currentDegree}deg ${currentDegree + degrees}deg, `;
        currentDegree += degrees;
    });
    conicGradient = conicGradient.slice(0, -2); // remove last comma

    // Calculate dynamic age risk score based on actual age
    const currentAge = summary?.userProfile?.age || 30;
    const equityVal = assetBuckets['Direct equity'] + assetBuckets['Mutual funds'];
    const actualEquityPct = totalAssets > 0 ? (equityVal / totalAssets) * 100 : 0;
    const expected = 110 - currentAge;
    const low = expected - 10, high = expected + 10;
    
    let ageRiskScore = 0;
    if (actualEquityPct >= low && actualEquityPct <= high) ageRiskScore = 100;
    else if (actualEquityPct < low) ageRiskScore = 100 - (low - actualEquityPct) * 3.5;
    else ageRiskScore = 100 - (actualEquityPct - high) * 3.5;
    ageRiskScore = Math.max(0, Math.min(100, Math.round(ageRiskScore)));

    // Recalculate total score
    let overallScore = 0;
    if (healthScore) {
        Object.entries(healthScore.subScores).forEach(([key, val]) => {
            if (key === 'ageRisk') {
                overallScore += ageRiskScore * val.weight;
            } else {
                overallScore += val.score * val.weight;
            }
        });
    }

    return (
        <div className={styles.page}>
            <div className={styles.app}>
                <div className={styles.heroCard}>
                    <div className={styles.topline}>
                        <div className={styles.wordmark}>Portf<span>o</span>lio</div>
                        <div className={styles.synced}>
                            {isLiveRefreshing ? (
                                <>
                                    <span className={styles.pulse} style={{ background: '#f59e0b', boxShadow: '0 0 0 0 rgba(245, 158, 11, 0.7)' }}></span>
                                    Fetching live market prices...
                                </>
                            ) : (
                                <>
                                    <span className={styles.pulse}></span>
                                    Prices are live
                                </>
                            )}
                        </div>
                    </div>

                    {/* HERO */}
                    <div className={styles.hero}>
                        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: '400px' }}>
                            <div className={styles.heroEyebrow}>Net worth · as of today</div>
                            <div className={styles.heroNumber}>₹{formatCurrency(netWorth)}</div>
                            
                            {(() => {
                                const now = new Date();
                                const cutoff = new Date();
                                if (trendRange === '7D') cutoff.setDate(now.getDate() - 7);
                                else if (trendRange === '1M') cutoff.setMonth(now.getMonth() - 1);
                                else if (trendRange === '3M') cutoff.setMonth(now.getMonth() - 3);
                                else if (trendRange === '1Y') cutoff.setFullYear(now.getFullYear() - 1);
                                else cutoff.setFullYear(2000);

                                const filteredSnapshots = snapshots.filter(s => new Date(s.dateString) >= cutoff);
                                const chartData = filteredSnapshots.map(s => {
                                    const date = new Date(s.dateString);
                                    return {
                                        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                                        month: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                                        value: profile === 'combined' ? s.totalValue : (s.byProfile?.[profile as keyof typeof s.byProfile]?.totalValue || 0)
                                    };
                                });

                                let deltaVal = 0;
                                let deltaPct = 0;
                                if (chartData.length > 0) {
                                    const firstVal = chartData[0].value;
                                    deltaVal = netWorth - firstVal;
                                    deltaPct = firstVal > 0 ? (deltaVal / firstVal) * 100 : 0;
                                }

                                return (
                                    <>
                                        <div className={`${styles.heroDelta} ${deltaVal < 0 ? styles.neg : ''}`} style={{ marginTop: '4px' }}>
                                            {deltaVal >= 0 ? '▲' : '▼'} ₹{formatCurrency(Math.abs(deltaVal))} ({Math.abs(deltaPct).toFixed(1)}%) {trendRange === 'ALL' ? 'all time' : `in last ${trendRange}`}
                                        </div>
                                        
                                        <div style={{ width: '100%', height: '140px', marginTop: '24px', marginLeft: '-10px' }}>
                                            {chartData.length > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                                        <defs>
                                                            <linearGradient id="fillgrad" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.35"/>
                                                                <stop offset="100%" stopColor="#60a5fa" stopOpacity="0"/>
                                                            </linearGradient>
                                                        </defs>
                                                        <XAxis dataKey="month" hide={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} minTickGap={30} />
                                                        <Tooltip 
                                                            contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-subtle)', borderRadius: '8px', fontSize: '12px' }}
                                                            itemStyle={{ color: 'var(--text-primary)' }}
                                                            formatter={(value: any) => [`₹${formatCurrency(Number(value) || 0)}`, 'Net Worth']}
                                                            labelFormatter={(label) => label}
                                                        />
                                                        <Area type="monotone" dataKey="value" stroke="#60a5fa" strokeWidth={2.5} fillOpacity={1} fill="url(#fillgrad)" />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '13px' }}>
                                                    Not enough data points yet for this range.
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles.trendPills} style={{ alignSelf: 'flex-start', marginTop: '16px' }}>
                                            {['7D', '1M', '3M', '1Y', 'ALL'].map(range => (
                                                <button 
                                                    key={range} 
                                                    className={`${styles.trendPill} ${trendRange === range ? styles.active : ''}`}
                                                    onClick={() => setTrendRange(range as any)}
                                                >
                                                    {range}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                        
                        <div className={styles.heroBadge}>
                            <GaugeMeter score={Math.round(overallScore)} />
                            <div className={styles.badgeCaption}>Portfolio health score — 8 factors combined</div>
                            {profile !== 'combined' && (
                                <div className={styles.ageControl}>
                                    Age
                                    <span className={styles.staticAge}>{currentAge}</span>
                                    <span>yrs</span>
                                    <Link href="/dashboard/planning" className={styles.editAgeLink}>Edit</Link>
                                </div>
                            )}
                            <button className={styles.breakdownLink} onClick={() => setShowBreakdown(!showBreakdown)}>
                                {showBreakdown ? 'Hide breakdown' : 'View breakdown'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* SCORE BREAKDOWN */}
                <div className={`${styles.breakdownPanel} ${showBreakdown ? styles.open : ''}`}>
                    <div className={styles.sectionHead} style={{ marginBottom: '14px' }}>
                        <div className={styles.sectionTitle} style={{ fontSize: '17px' }}>How {Math.round(overallScore)} is calculated</div>
                        <div className={styles.sectionSub}>Weighted average of 8 factors</div>
                    </div>
                    <div>
                        {healthScore && Object.entries(healthScore.subScores).map(([key, val]) => {
                            const isAgeRow = key === 'ageRisk';
                            const scoreToUse = isAgeRow ? ageRiskScore : val.score;
                            return (
                                <div className={styles.breakdownRow} key={key}>
                                    <div className={`${styles.bdName} ${isAgeRow ? styles.highlight : ''}`}>
                                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                    </div>
                                    <div className={styles.breakdownTrack}>
                                        <div className={`${styles.breakdownFill} ${isAgeRow ? styles.highlight : ''}`} style={{ width: `${scoreToUse}%` }}></div>
                                    </div>
                                    <div className={styles.bdScore}>{Math.round(scoreToUse)}</div>
                                    <div className={styles.bdWeight}>{Math.round(val.weight * 100)}%</div>
                                </div>
                            );
                        })}
                    </div>
                    <div className={styles.breakdownTotal}>
                        <div><span className={styles.btLabel}>Overall score</span></div>
                        <div className={styles.btValue}>{Math.round(overallScore)} / 100</div>
                    </div>
                </div>

                {/* QUICK STATS */}
                <div className={styles.quickstats}>
                    <div className={styles.qsCell}>
                        <div className={styles.qsLabel}>Total assets</div>
                        <div className={styles.qsValue}>₹{formatCurrency(totalAssets)}</div>
                    </div>
                    <div className={styles.qsCell}>
                        <div className={styles.qsLabel}>Total liabilities</div>
                        <div className={styles.qsValue}>₹{formatCurrency(totalLiabilities)}</div>
                    </div>
                    <div className={styles.qsCell}>
                        <div className={styles.qsLabel}>Debt-to-asset</div>
                        <div className={`${styles.qsValue} ${isDebtGood ? styles.up : styles.down}`}>{debtToAssetRatio.toFixed(2)}</div>
                        <div className={styles.qsHint}>{debtInsight}</div>
                    </div>
                    <div className={styles.qsCell}>
                        <div className={styles.qsLabel}>Liquid within 30 days</div>
                        <div className={`${styles.qsValue} ${styles.up}`}>₹{formatCurrency(liquidAssets)}</div>
                    </div>
                </div>

                {/* ACTIONABLE INSIGHTS */}
                <div className={styles.section}>
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionTitle}>Today's suggestions</div>
                        <div className={styles.sectionSub}>{insights.filter(i => i.id !== 'stay-course').length} need attention</div>
                    </div>

                    {insights.map((insight, idx) => {
                        let tagClass = styles.tagOpportunity;
                        if (insight.type === 'Urgent') tagClass = styles.tagUrgent;
                        if (insight.type === 'Rebalance') tagClass = styles.tagRebalance;

                        return (
                            <div className={styles.insightRow} key={idx}>
                                <div className={`${styles.insightTag} ${tagClass}`}></div>
                                <div>
                                    <div className={styles.insightKicker}>{insight.type}</div>
                                    <div className={styles.insightText}>{insight.message}</div>
                                </div>
                                <a href={insight.actionHref} className={styles.insightCta}>{insight.actionLabel}</a>
                            </div>
                        );
                    })}
                </div>

                {/* ALLOCATION + LIABILITIES */}
                <div className={styles.gridMain}>
                    <div className={styles.section}>
                        <div className={styles.sectionHead}>
                            <div className={styles.sectionTitle}>What you own</div>
                            <div className={styles.sectionSub}>{bucketArray.length} asset classes</div>
                        </div>
                        <div className={styles.donutWrap}>
                            <div className={styles.donut} style={{ background: conicGradient ? `conic-gradient(${conicGradient})` : 'var(--bg-secondary)' }}>
                                <div className={styles.donutCenter}>
                                    <div className={styles.amt}>₹{formatCurrency(totalAssets)}</div>
                                    <div className={styles.lbl}>Assets</div>
                                </div>
                            </div>
                            <div className={styles.legend}>
                                {bucketArray.map(([name, val], index) => {
                                    const color = allocColors[index % allocColors.length];
                                    const pct = totalAssets > 0 ? (val / totalAssets) * 100 : 0;
                                    return (
                                        <div className={styles.legendRow} key={name}>
                                            <span className={styles.sw} style={{ background: color }}></span>
                                            <span className={styles.name}>{name}</span>
                                            <span className={styles.pct}>{Math.round(pct)}%</span>
                                            <span className={styles.val}>₹{formatCurrency(val)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <div className={styles.sectionHead}>
                            <div className={styles.sectionTitle}>What you owe</div>
                            <div className={styles.sectionSub}>{liabilities.length} liabilities</div>
                        </div>
                        
                        {liabilities.length === 0 ? (
                            <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No liabilities found.</div>
                        ) : (
                            liabilities.map(l => (
                                <div className={styles.loanCard} key={l.name}>
                                    <div className={styles.loanTop}>
                                        <div className={styles.loanName}>{l.name}</div>
                                        <div className={styles.loanRate}>{l.interestRate}% p.a.</div>
                                    </div>
                                    <div className={styles.loanAmt}>₹{formatCurrency(l.outstanding)} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>outstanding</span></div>
                                    
                                    <div className={styles.loanFoot}>
                                        <div><div className={styles.k}>EMI</div><div className={styles.v}>₹{formatCurrency(l.emi)} / mo</div></div>
                                        <div><div className={styles.k}>Type</div><div className={styles.v}>{l.type}</div></div>
                                        {calculatePayoffDate(l.outstanding, l.emi, l.interestRate) && (
                                            <div><div className={styles.k}>Payoff Date</div><div className={styles.v}>{calculatePayoffDate(l.outstanding, l.emi, l.interestRate)}</div></div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}

                        <div style={{ marginTop: '22px' }}>
                            <div className={styles.sectionSub} style={{ marginBottom: '12px' }}>Goals this is funding</div>
                            <div className={styles.goals}>
                                {goals.length === 0 ? (
                                    <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No goals found.</div>
                                ) : (
                                    goals.map(g => {
                                        const pct = g.target > 0 ? (g.current / g.target) * 100 : 0;
                                        return (
                                            <div className={styles.goalRow} key={g.name}>
                                                <div className={styles.goalTop}>
                                                    <span className={styles.gName}>{g.name}</span>
                                                    <span className={styles.gAmt}>₹{formatCurrency(g.current)} / ₹{formatCurrency(g.target)}</span>
                                                </div>
                                                <div className={styles.goalBar}>
                                                    <div className={styles.goalBarFill} style={{ width: `${Math.min(100, pct)}%` }}></div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>



                {showAgePrompt && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modalContent}>
                            <h2 style={{ marginBottom: '12px', fontSize: '20px' }}>Welcome to Portfolio</h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px', lineHeight: '1.5' }}>
                                To accurately calculate your Portfolio Health Score and Age-Risk Alignment, we need to know your date of birth.
                            </p>
                            <div style={{ marginBottom: '20px' }}>
                                <input 
                                    type="date"
                                    placeholder="Enter your Date of Birth" 
                                    value={promptDob}
                                    onChange={(e) => setPromptDob(e.target.value)}
                                    className={styles.ageInputModal}
                                    autoFocus
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }}
                                />
                            </div>
                            <button 
                                onClick={handleSaveAge} 
                                disabled={isSubmittingAge || !promptDob}
                                className={styles.saveAgeBtn}
                            >
                                {isSubmittingAge ? 'Saving...' : 'Save & Continue'}
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
