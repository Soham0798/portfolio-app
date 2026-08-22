'use client';

import { useEffect, useState } from 'react';
import { useProfile } from '@/components/ProfileContext';
import styles from './dashboard.module.css';

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

interface ManualAsset {
    _id: string;
    name: string;
    assetType: string;
    currentValue: number;
    totalInvested: number;
    profile: string;
}

interface Summary {
    totalValue: number;
    totalInvested: number;
    totalGain: number;
    totalGainPercent: number;
    totalDayGain: number;
    totalDayGainPercent: number;
    marketValue: number;
    manualValue: number;
}

export default function DashboardPage() {
    const { profile } = useProfile();
    const [holdings, setHoldings] = useState<Holding[]>([]);
    const [manualAssets, setManualAssets] = useState<ManualAsset[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const profileParam = profile === 'combined' ? '' : `?profile=${profile}`;
                const res = await fetch(`/api/holdings${profileParam}`);
                const data = await res.json();
                setHoldings(data.holdings || []);
                setManualAssets(data.manualAssets || []);
                setSummary(data.summary || null);
            } catch (error) {
                console.error('Failed to fetch holdings:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [profile]);

    const formatCurrency = (n: number) => {
        return new Intl.NumberFormat('en-IN', {
            maximumFractionDigits: 0,
        }).format(n);
    };

    const formatPercent = (n: number) => {
        return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
    };

    const assetBuckets = { Equity: 0, Commodities: 0, Debt: 0, Other: 0 };
    holdings.forEach(h => {
        const name = h.name.toLowerCase();
        const type = h.assetType.toUpperCase();
        if (type === 'SGB' || type === 'GOLD' || name.includes('gold') || name.includes('silver')) {
            assetBuckets.Commodities += h.currentValue;
        } else if (type === 'BOND' || type === 'NPS' || name.includes('liquid') || name.includes('debt')) {
            assetBuckets.Debt += h.currentValue;
        } else if (type === 'STOCK' || type === 'MUTUAL_FUND' || type === 'ETF') {
            assetBuckets.Equity += h.currentValue;
        } else {
            assetBuckets.Other += h.currentValue;
        }
    });
    manualAssets.forEach(a => {
        const type = a.assetType.toUpperCase();
        if (type === 'FD' || type === 'RD' || type === 'EPF' || type === 'PPF' || type === 'CASH') {
            assetBuckets.Debt += a.currentValue;
        } else if (type === 'GOLD' || type === 'SGB') {
            assetBuckets.Commodities += a.currentValue;
        } else {
            assetBuckets.Other += a.currentValue;
        }
    });

    const bucketArray = Object.entries(assetBuckets)
        .filter(([_, val]) => val > 0)
        .sort((a, b) => b[1] - a[1]);

    if (loading) {
        return <div className={styles.loading}>Loading portfolio...</div>;
    }

    return (
        <div className={styles.page}>
            {/* --- UNIFIED STATEMENT VIEW --- */}
            {summary && (
                <div className={styles.statementDevice}>
                    <div className={styles.statement}>
                        <div className={styles.eyebrow}>Portfolio Statement · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        <div className={styles.valueRow}>
                            <span className={styles.rupee}>₹</span>
                            <span className={styles.totalValue}>{formatCurrency(summary.totalValue)}</span>
                        </div>

                        <div className={styles.movementRow}>
                            <div className={`${styles.movement} ${summary.totalDayGain >= 0 ? styles.up : styles.down}`}>
                                <span className={styles.tri}>{summary.totalDayGain >= 0 ? '▲' : '▼'}</span>
                                {formatCurrency(Math.abs(summary.totalDayGain))}
                                <span className={styles.label}>today</span>
                            </div>

                            <div className={styles.seal}>
                                <svg viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="#C9A24A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </div>
                        </div>
                    </div>

                    <div className={styles.statLedger}>
                        <div className={styles.stat}>
                            <div className={styles.statLabel}>Invested</div>
                            <div className={styles.statFigure}>{formatCurrency(summary.totalInvested)}</div>
                        </div>
                        <div className={styles.stat}>
                            <div className={styles.statLabel}>Total Gain</div>
                            <div className={`${styles.statFigure} ${summary.totalGain >= 0 ? styles.gain : styles.loss}`}>
                                {summary.totalGain >= 0 ? '+' : '-'}{formatCurrency(Math.abs(summary.totalGain))}
                            </div>
                            <div className={styles.statSub}>{formatPercent(summary.totalGainPercent)}</div>
                        </div>
                        <div className={styles.stat}>
                            <div className={styles.statLabel}>Current</div>
                            <div className={styles.statFigure}>{formatCurrency(summary.totalValue)}</div>
                        </div>
                    </div>

                    {holdings.length > 0 && (
                        <>
                            <div className={styles.allocation}>
                                <div className={styles.ringWrap}>
                                    <svg width="64" height="64" viewBox="0 0 64 64">
                                        <circle cx="32" cy="32" r="26" fill="none" stroke="#1B2740" strokeWidth="8" />

                                        {(() => {
                                            const sorted = [...holdings].sort((a, b) => b.currentValue - a.currentValue);
                                            const top3 = sorted.slice(0, 3);
                                            const ringColors = ['#60A5FA', '#A78BFA', '#34D399'];
                                            const totalLen = 163.36;
                                            let offset = totalLen;

                                            return top3.map((h, i) => {
                                                const pct = h.currentValue / summary.totalValue;
                                                const dash = pct * totalLen;
                                                const thisOffset = offset;
                                                offset -= dash;
                                                return (
                                                    <circle
                                                        key={h.instrumentId}
                                                        cx="32" cy="32" r="26" fill="none"
                                                        stroke={ringColors[i]} strokeWidth="8"
                                                        strokeDasharray={`${dash} ${totalLen - dash}`}
                                                        strokeDashoffset={thisOffset - totalLen}
                                                        strokeLinecap="round"
                                                    />
                                                );
                                            });
                                        })()}
                                    </svg>
                                    <div className={styles.ringCenter}>{holdings.length} funds</div>
                                </div>
                                <div className={styles.allocLegend}>
                                    {(() => {
                                        const sorted = [...holdings].sort((a, b) => b.currentValue - a.currentValue);
                                        const top3 = sorted.slice(0, 3);
                                        const ringColors = ['#60A5FA', '#A78BFA', '#34D399'];

                                        return top3.map((h, i) => (
                                            <div className={styles.allocItem} key={h.instrumentId}>
                                                <span className={styles.allocDot} style={{ background: ringColors[i] }}></span>
                                                <span className={styles.allocName}>{h.name}</span>
                                                <span className={styles.allocPct}>{((h.currentValue / summary.totalValue) * 100).toFixed(0)}%</span>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>

                            {bucketArray.length > 0 && (
                                <div className={styles.allocation}>
                                    <div className={styles.ringWrap}>
                                        <svg width="64" height="64" viewBox="0 0 64 64">
                                            <circle cx="32" cy="32" r="26" fill="none" stroke="#1B2740" strokeWidth="8" />

                                            {(() => {
                                                const ringColors = ['#60A5FA', '#A78BFA', '#34D399', '#FBBF24'];
                                                const totalLen = 163.36;
                                                let offset = totalLen;

                                                return bucketArray.map(([name, val], i) => {
                                                    const pct = val / summary.totalValue;
                                                    const dash = pct * totalLen;
                                                    const thisOffset = offset;
                                                    offset -= dash;
                                                    return (
                                                        <circle
                                                            key={name}
                                                            cx="32" cy="32" r="26" fill="none"
                                                            stroke={ringColors[i % ringColors.length]} strokeWidth="8"
                                                            strokeDasharray={`${dash} ${totalLen - dash}`}
                                                            strokeDashoffset={thisOffset - totalLen}
                                                            strokeLinecap="round"
                                                        />
                                                    );
                                                });
                                            })()}
                                        </svg>
                                        <div className={styles.ringCenter}>Assets</div>
                                    </div>
                                    <div className={styles.allocLegend}>
                                        {(() => {
                                            const ringColors = ['#60A5FA', '#A78BFA', '#34D399', '#FBBF24'];

                                            return bucketArray.map(([name, val], i) => (
                                                <div className={styles.allocItem} key={name}>
                                                    <span className={styles.allocDot} style={{ background: ringColors[i % ringColors.length] }}></span>
                                                    <span className={styles.allocName}>{name}</span>
                                                    <span className={styles.allocPct}>{((val / summary.totalValue) * 100).toFixed(0)}%</span>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    <div className={styles.holdingsHead}>
                        <div className={styles.holdingsTitle}>Holdings</div>
                    </div>

                    {[...holdings].sort((a, b) => b.currentValue - a.currentValue).map((h, i) => {
                        const bgColors = ['#C9A24A', '#6FA97F', '#C1663F', '#5b8fe0', '#9b82e3'];
                        const bg = bgColors[i % bgColors.length];
                        const initials = h.name.substring(0, 2).toUpperCase();

                        return (
                            <div className={styles.holding} key={h.instrumentId}>
                                <div className={styles.holdingBadge} style={{ background: bg }}>{initials}</div>
                                <div className={styles.holdingMain}>
                                    <div className={styles.holdingTop}>
                                        <div>
                                            <div className={styles.holdingName}>{h.name}</div>
                                            <div className={styles.holdingFolio}>{h.tickerSymbol || h.assetType}</div>
                                        </div>
                                        <div className={styles.holdingValue}>
                                            <div className={styles.holdingCmp}>{formatCurrency(h.currentValue)}</div>
                                            <div className={`${styles.holdingGain} ${h.totalGain >= 0 ? styles.up : styles.down}`}>
                                                {h.totalGain >= 0 ? '▲' : '▼'} {formatPercent(h.totalInvested > 0 ? (Math.abs(h.totalGain) / h.totalInvested) * 100 : 0)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.holdingDetail}>
                                        <div className={styles.detailItem}>
                                            <div className={styles.detailLabel}>Qty</div>
                                            <div className={styles.detailFigure}>{h.currentQty.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                                        </div>
                                        <div className={styles.detailItem}>
                                            <div className={styles.detailLabel}>Avg</div>
                                            <div className={styles.detailFigure}>{formatCurrency(h.avgBuyPrice)}</div>
                                        </div>
                                        <div className={styles.detailItem}>
                                            <div className={styles.detailLabel}>CMP</div>
                                            <div className={styles.detailFigure}>{formatCurrency(h.currentPrice)}</div>
                                        </div>
                                        <svg className={styles.spark} width="46" height="18" viewBox="0 0 46 18">
                                            {h.totalGain >= 0 ? (
                                                <polyline points="0,14 8,12 16,13 24,8 32,9 40,3 46,4" fill="none" stroke="#6FA97F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                            ) : (
                                                <polyline points="0,4 8,7 16,6 24,10 32,9 40,14 46,13" fill="none" stroke="#C1663F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                            )}
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    <div className={styles.footerNote}>Values are illustrative · NAV as of previous close</div>
                </div>
            )}

            {/* --- DESKTOP VIEW --- */}
            {summary && (
                <div className={styles.desktopView}>
                    <div className={styles.gridTop}>
                        {/* Desktop Hero */}
                        <div className={styles.hero}>
                            <div className={styles.desktopEyebrow}>Portfolio Statement · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                            <div className={styles.desktopValueRow}>
                                <span className={styles.desktopRupee}>₹</span>
                                <span className={styles.desktopTotalValue}>{formatCurrency(summary.totalValue)}</span>
                            </div>
                            <div className={styles.desktopMovementRow}>
                                <div className={`${styles.desktopMovement} ${summary.totalDayGain >= 0 ? styles.up : styles.down}`}>
                                    {summary.totalDayGain >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(summary.totalDayGain))} <span className={styles.desktopMovementLabel}>today</span>
                                </div>
                                <div className={styles.desktopSeal}>
                                    <svg viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </div>
                            </div>
                            <div className={styles.desktopStatLedger}>
                                <div className={styles.desktopStat}>
                                    <div className={styles.desktopStatLabel}>Invested</div>
                                    <div className={styles.desktopStatFigure}>{formatCurrency(summary.totalInvested)}</div>
                                </div>
                                <div className={styles.desktopStat}>
                                    <div className={styles.desktopStatLabel}>Total Gain</div>
                                    <div className={`${styles.desktopStatFigure} ${summary.totalGain >= 0 ? styles.gain : styles.loss}`}>
                                        {summary.totalGain >= 0 ? '+' : '-'}{formatCurrency(Math.abs(summary.totalGain))}
                                    </div>
                                    <div className={`${styles.desktopStatSub} ${summary.totalGain >= 0 ? '' : styles.loss}`}>
                                        {formatPercent(summary.totalGainPercent)}
                                    </div>
                                </div>
                                <div className={styles.desktopStat}>
                                    <div className={styles.desktopStatLabel}>Current</div>
                                    <div className={styles.desktopStatFigure}>{formatCurrency(summary.totalValue)}</div>
                                </div>
                            </div>
                        </div>

                        {/* Desktop Panels */}
                        <div className={styles.panelStack}>
                            {holdings.length > 0 && (
                                <div className={styles.panel}>
                                    <div className={styles.desktopRingWrap}>
                                        <svg width="74" height="74" viewBox="0 0 74 74">
                                            <circle cx="37" cy="37" r="30" fill="none" stroke="#1B2740" strokeWidth="9" />
                                            {(() => {
                                                const sorted = [...holdings].sort((a, b) => b.currentValue - a.currentValue);
                                                const top3 = sorted.slice(0, 3);
                                                const ringColors = ['#5B8DEF', '#8C97E8', '#4FB08C'];
                                                const totalLen = 188.4;
                                                let offset = totalLen;

                                                return top3.map((h, i) => {
                                                    const pct = h.currentValue / summary.totalValue;
                                                    const dash = pct * totalLen;
                                                    const thisOffset = offset;
                                                    offset -= dash;
                                                    return (
                                                        <circle
                                                            key={h.instrumentId}
                                                            cx="37" cy="37" r="30" fill="none"
                                                            stroke={ringColors[i]} strokeWidth="9"
                                                            strokeDasharray={`${dash} ${totalLen - dash}`}
                                                            strokeDashoffset={thisOffset - totalLen}
                                                            strokeLinecap="round"
                                                        />
                                                    );
                                                });
                                            })()}
                                        </svg>
                                        <div className={styles.desktopRingCenter}>{holdings.length} funds</div>
                                    </div>
                                    <div className={styles.desktopAllocLegend}>
                                        <div className={styles.panelTitle}>Fund Mix</div>
                                        {(() => {
                                            const sorted = [...holdings].sort((a, b) => b.currentValue - a.currentValue);
                                            const top3 = sorted.slice(0, 3);
                                            const ringColors = ['#5B8DEF', '#8C97E8', '#4FB08C'];

                                            return top3.map((h, i) => (
                                                <div className={styles.desktopAllocItem} key={h.instrumentId}>
                                                    <span className={styles.desktopAllocDot} style={{ background: ringColors[i] }}></span>
                                                    <span className={styles.desktopAllocName}>{h.name}</span>
                                                    <span className={styles.desktopAllocPct}>{((h.currentValue / summary.totalValue) * 100).toFixed(0)}%</span>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            )}

                            {bucketArray.length > 0 && (
                                <div className={styles.panel}>
                                    <div className={styles.desktopRingWrap}>
                                        <svg width="74" height="74" viewBox="0 0 74 74">
                                            <circle cx="37" cy="37" r="30" fill="none" stroke="#1B2740" strokeWidth="9" />
                                            {(() => {
                                                const ringColors = ['#5B8DEF', '#253355', '#4FB08C', '#C9A24A'];
                                                const totalLen = 188.4;
                                                let offset = totalLen;

                                                return bucketArray.map(([name, val], i) => {
                                                    const pct = val / summary.totalValue;
                                                    const dash = pct * totalLen;
                                                    const thisOffset = offset;
                                                    offset -= dash;
                                                    return (
                                                        <circle
                                                            key={name}
                                                            cx="37" cy="37" r="30" fill="none"
                                                            stroke={ringColors[i % ringColors.length]} strokeWidth="9"
                                                            strokeDasharray={`${dash} ${totalLen - dash}`}
                                                            strokeDashoffset={thisOffset - totalLen}
                                                            strokeLinecap="round"
                                                        />
                                                    );
                                                });
                                            })()}
                                        </svg>
                                        <div className={styles.desktopRingCenter}>Assets</div>
                                    </div>
                                    <div className={styles.desktopAllocLegend}>
                                        <div className={styles.panelTitle}>Asset Mix</div>
                                        {(() => {
                                            const ringColors = ['#5B8DEF', '#253355', '#4FB08C', '#C9A24A'];
                                            return bucketArray.map(([name, val], i) => (
                                                <div className={styles.desktopAllocItem} key={name}>
                                                    <span className={styles.desktopAllocDot} style={{ background: ringColors[i % ringColors.length] }}></span>
                                                    <span className={styles.desktopAllocName}>{name}</span>
                                                    <span className={styles.desktopAllocPct}>{((val / summary.totalValue) * 100).toFixed(0)}%</span>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.holdingsCard}>
                        <div className={styles.holdingsHead}>
                            <div className={styles.holdingsTitle}>Holdings</div>
                        </div>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Qty</th>
                                    <th>Avg</th>
                                    <th>CMP</th>
                                    <th>Value</th>
                                    <th>Gain</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...holdings].sort((a, b) => b.currentValue - a.currentValue).map((h, i) => {
                                    const bColor = ['#C9A24A', '#5B8DEF', '#8C97E8', '#4FB08C', '#D8735F'][i % 5];
                                    const badgeText = h.name.substring(0, 2).toUpperCase();
                                    const returns = h.currentValue - h.totalInvested;
                                    const returnsPct = h.totalInvested > 0 ? (returns / h.totalInvested) * 100 : 0;

                                    return (
                                        <tr key={h.instrumentId}>
                                            <td>
                                                <div className={styles.nameCell}>
                                                    <div className={styles.badge} style={{ background: bColor }}>{badgeText}</div>
                                                    <div>
                                                        <div className={styles.fundName}>{h.name}</div>
                                                        <div className={styles.fundSub}>{h.tickerSymbol || h.assetType}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{h.currentQty.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                                            <td>{formatCurrency(h.avgBuyPrice)}</td>
                                            <td>{formatCurrency(h.currentPrice)}</td>
                                            <td className={styles.valueCell}>{formatCurrency(h.currentValue)}</td>
                                            <td className={`${styles.gainCell} ${returns >= 0 ? styles.up : styles.down}`}>
                                                {returns >= 0 ? '▲' : '▼'} {Math.abs(returnsPct).toFixed(2)}%
                                            </td>
                                            <td className={styles.sparkCell}>
                                                <svg width="52" height="20" viewBox="0 0 52 20">
                                                    <polyline
                                                        points={returns >= 0 ? "0,17 9,14 18,15 27,8 36,9 45,2 52,4" : "0,4 9,7 18,6 27,10 36,9 45,14 52,13"}
                                                        fill="none"
                                                        stroke={returns >= 0 ? "#34D399" : "#F87171"}
                                                        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
                                                    />
                                                </svg>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
