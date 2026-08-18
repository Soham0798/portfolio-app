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
            {summary && (
                <div className={styles.hero}>
                    <div className={styles.heroLabel}>Total Portfolio Value</div>
                    <div className={styles.heroValue}>{formatCurrency(summary.totalValue)}</div>
                    <div className={styles.heroDeltas}>
                        <div className={styles.delta}>
                            <span className={`${styles.amt} ${summary.totalDayGain < 0 ? styles.loss : ''}`}>
                                {summary.totalDayGain >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(summary.totalDayGain))} ({formatPercent(Math.abs(summary.totalDayGainPercent))})
                            </span>
                            <span className={styles.ctx}>Today</span>
                        </div>
                        <div className={styles.deltaSep}></div>
                        <div className={styles.delta}>
                            <span className={`${styles.amt} ${summary.totalGain < 0 ? styles.loss : ''}`}>
                                {summary.totalGain >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(summary.totalGain))} ({formatPercent(Math.abs(summary.totalGainPercent))})
                            </span>
                            <span className={styles.ctx}>Overall</span>
                        </div>
                    </div>

                    <div className={styles.ledgerStrip}>
                        {/* Invested */}
                        <div className={styles.lcol}>
                            <div className={styles.lcolHead}>
                                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3">
                                    <rect x="1.5" y="3.5" width="12" height="8.5" rx="1.3" />
                                    <path d="M1.5 6.2H13.5" strokeLinecap="round" />
                                </svg>
                                <span className={styles.lname}>Invested</span>
                            </div>
                            <div className={styles.lcolVal}>{formatCurrency(summary.totalInvested)}</div>
                            <div className={summary.totalInvested === 0 ? `${styles.ltrack} ${styles.empty}` : styles.ltrack}>
                                <div className={`${styles.lfill} ${styles.blue}`} style={{ width: '100%' }}></div>
                            </div>
                        </div>

                        {/* Total Gain */}
                        <div className={styles.lcol}>
                            <div className={styles.lcolHead}>
                                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3">
                                    <path d="M1.5 11L5.5 6.5L8 9L13.5 3" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M9.8 3H13.5V6.7" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <span className={styles.lname}>Total Gain</span>
                                <span className={`${styles.lchip} ${summary.totalGain >= 0 ? styles.pos : styles.neg}`}>
                                    {summary.totalGain >= 0 ? '▲' : '▼'} {Math.abs(summary.totalGainPercent).toFixed(2)}%
                                </span>
                            </div>
                            <div className={styles.lcolVal}>{formatCurrency(Math.abs(summary.totalGain))}</div>
                            <div className={summary.totalInvested === 0 ? `${styles.ltrack} ${styles.empty}` : styles.ltrack}>
                                <div className={`${styles.lfill} ${summary.totalGain < 0 ? styles.red : ''}`} style={{ width: `${Math.min(Math.abs(summary.totalGainPercent), 100)}%` }}></div>
                            </div>
                        </div>

                        {/* Market Assets */}
                        <div className={styles.lcol}>
                            <div className={styles.lcolHead}>
                                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3">
                                    <path d="M2.5 12.5V6.5M7.5 12.5V2.5M12.5 12.5V9" strokeLinecap="round" />
                                </svg>
                                <span className={styles.lname}>Market Assets</span>
                            </div>
                            <div className={styles.lcolVal}>{formatCurrency(summary.marketValue)}</div>
                            <div className={summary.totalValue === 0 ? `${styles.ltrack} ${styles.empty}` : styles.ltrack}>
                                <div className={`${styles.lfill} ${styles.purple}`} style={{ width: `${(summary.marketValue / summary.totalValue) * 100}%` }}></div>
                            </div>
                        </div>

                        {/* Manual Assets */}
                        <div className={styles.lcol}>
                            <div className={styles.lcolHead}>
                                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3">
                                    <rect x="1.5" y="4" width="12" height="9" rx="1.3" />
                                    <path d="M1.5 4L3 1.5H12L13.5 4" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M6 7.2H9" strokeLinecap="round" />
                                </svg>
                                <span className={styles.lname}>Manual Assets</span>
                            </div>
                            <div className={styles.lcolVal}>{formatCurrency(summary.manualValue)}</div>
                            <div className={summary.totalValue === 0 ? `${styles.ltrack} ${styles.empty}` : styles.ltrack}>
                                <div className={`${styles.lfill} ${styles.orange}`} style={{ width: `${(summary.manualValue / summary.totalValue) * 100}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.tableCard}>
                <h3 className={styles.sectionTitle}>Holdings</h3>
                {holdings.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#7c8794" strokeWidth="1.4">
                                <rect x="3" y="2.5" width="14" height="15" rx="1.6" />
                                <path d="M6.5 6.5H13.5M6.5 9.5H13.5M6.5 12.5H10.5" strokeLinecap="round" />
                            </svg>
                        </div>
                        <h3>No holdings yet</h3>
                        <p>Add a transaction or import your existing portfolio and your positions will show up here automatically.</p>
                    </div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Qty</th>
                                <th>Avg Price</th>
                                <th>CMP</th>
                                <th>Current Value</th>
                                <th>P&L</th>
                                <th>Day Change</th>
                            </tr>
                        </thead>
                        <tbody>
                            {holdings.map((h) => (
                                <tr key={h.instrumentId}>
                                    <td>
                                        <div className={styles.holdingName}>{h.name}</div>
                                        <div className={styles.holdingTicker}>{h.tickerSymbol}</div>
                                    </td>
                                    <td>{h.currentQty}</td>
                                    <td>{formatCurrency(h.avgBuyPrice)}</td>
                                    <td>{formatCurrency(h.currentPrice)}</td>
                                    <td>{formatCurrency(h.currentValue)}</td>
                                    <td className={h.totalGain >= 0 ? 'gain' : 'loss'}>
                                        {formatCurrency(h.totalGain)}
                                    </td>
                                    <td className={h.dayGain >= 0 ? 'gain' : 'loss'}>
                                        {formatCurrency(h.dayGain)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
