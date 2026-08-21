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
                            <div className={styles.movementDivider}></div>
                            <div className={`${styles.movement} ${summary.totalGain >= 0 ? styles.up : styles.down}`}>
                                <span className={styles.tri}>{summary.totalGain >= 0 ? '▲' : '▼'}</span>
                                {formatCurrency(Math.abs(summary.totalGain))} · {formatPercent(Math.abs(summary.totalGainPercent))}
                                <span className={styles.label}>overall</span>
                            </div>
                            <div className={styles.seal}>
                                <svg viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="#C9A24A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
                        <div className={styles.allocation}>
                            <div className={styles.ringWrap}>
                                <svg width="64" height="64" viewBox="0 0 64 64">
                                    <circle cx="32" cy="32" r="26" fill="none" stroke="#20261F" strokeWidth="8"/>
                                    
                                    {(() => {
                                        const sorted = [...holdings].sort((a,b) => b.currentValue - a.currentValue);
                                        const top3 = sorted.slice(0, 3);
                                        const ringColors = ['#C9A24A', '#6FA97F', '#C1663F'];
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
                                    const sorted = [...holdings].sort((a,b) => b.currentValue - a.currentValue);
                                    const top3 = sorted.slice(0, 3);
                                    const ringColors = ['#C9A24A', '#6FA97F', '#C1663F'];
                                    
                                    return top3.map((h, i) => (
                                        <div className={styles.allocItem} key={h.instrumentId}>
                                            <span className={styles.allocDot} style={{background: ringColors[i]}}></span>
                                            <span className={styles.allocName}>{h.name}</span>
                                            <span className={styles.allocPct}>{((h.currentValue / summary.totalValue) * 100).toFixed(0)}%</span>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    )}

                    <div className={styles.holdingsHead}>
                        <div className={styles.holdingsTitle}>Holdings</div>
                        <div className={styles.holdingsCount}>{String(holdings.length).padStart(3, '0')} / assets</div>
                    </div>

                    {[...holdings].sort((a,b) => b.currentValue - a.currentValue).map((h, i) => {
                        const bgColors = ['#C9A24A', '#6FA97F', '#C1663F', '#5b8fe0', '#9b82e3'];
                        const bg = bgColors[i % bgColors.length];
                        const initials = h.name.substring(0, 2).toUpperCase();
                        
                        return (
                            <div className={styles.holding} key={h.instrumentId}>
                                <div className={styles.holdingBadge} style={{background: bg}}>{initials}</div>
                                <div className={styles.holdingMain}>
                                    <div className={styles.holdingTop}>
                                        <div>
                                            <div className={styles.holdingName}>{h.name}</div>
                                            <div className={styles.holdingFolio}>{h.tickerSymbol || h.assetType}</div>
                                        </div>
                                        <div className={styles.holdingValue}>
                                            <div className={styles.holdingCmp}>{formatCurrency(h.currentValue)}</div>
                                            <div className={`${styles.holdingGain} ${h.totalGain >= 0 ? styles.up : styles.down}`}>
                                                {h.totalGain >= 0 ? '▲' : '▼'} {formatPercent(h.totalInvested > 0 ? (Math.abs(h.totalGain)/h.totalInvested)*100 : 0)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.holdingDetail}>
                                        <div className={styles.detailItem}>
                                            <div className={styles.detailLabel}>Qty</div>
                                            <div className={styles.detailFigure}>{h.currentQty.toLocaleString('en-IN', {maximumFractionDigits:2})}</div>
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
                                                <polyline points="0,14 8,12 16,13 24,8 32,9 40,3 46,4" fill="none" stroke="#6FA97F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                                            ) : (
                                                <polyline points="0,4 8,7 16,6 24,10 32,9 40,14 46,13" fill="none" stroke="#C1663F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
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
        </div>
    );
}
