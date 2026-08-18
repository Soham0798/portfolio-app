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
                <div className={`glass-card ${styles.hero}`}>
                    <div className={styles.heroMain}>
                        <p className={styles.heroLabel}>Total Portfolio Value</p>
                        <h2 className={styles.heroValue}>{formatCurrency(summary.totalValue)}</h2>
                        <div className={styles.heroChanges}>
                            <div className={styles.changeBlock}>
                                <span className={summary.totalDayGain >= 0 ? 'gain' : 'loss'}>
                                    {summary.totalDayGain >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(summary.totalDayGain))} ({formatPercent(summary.totalDayGainPercent)})
                                </span>
                                <span className={styles.heroChangeLabel}>Today</span>
                            </div>
                            <div className={styles.changeDivider}></div>
                            <div className={styles.changeBlock}>
                                <span className={summary.totalGain >= 0 ? 'gain' : 'loss'}>
                                    {summary.totalGain >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(summary.totalGain))} ({formatPercent(summary.totalGainPercent)})
                                </span>
                                <span className={styles.heroChangeLabel}>Overall</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.heroStats}>
                        {/* Total Invested */}
                        <div className={styles.card}>
                            <div className={styles.cardTitle}>
                                <span className={`${styles.cardIcon} ${styles.blue}`}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 15h0M2 9.5h20"/></svg>
                                </span>
                                <p className={styles.cardTitleText}>Invested</p>
                            </div>
                            <div className={styles.cardData}>
                                <p className={styles.cardDataValue}>{formatCurrency(summary.totalInvested)}</p>
                                <div className={styles.cardRange}>
                                    <div className={`${styles.cardRangeFill} ${styles.blue}`} style={{ width: '100%' }}></div>
                                </div>
                            </div>
                        </div>

                        {/* Total Gain */}
                        <div className={styles.card}>
                            <div className={styles.cardTitle}>
                                <span className={styles.cardIcon}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                                </span>
                                <p className={styles.cardTitleText}>Total Gain</p>
                                <p className={`${styles.cardPercent} ${summary.totalGain < 0 ? styles.loss : ''}`}>
                                    {summary.totalGain >= 0 ? '▲' : '▼'} {Math.abs(summary.totalGainPercent).toFixed(2)}%
                                </p>
                            </div>
                            <div className={styles.cardData}>
                                <p className={styles.cardDataValue}>{formatCurrency(Math.abs(summary.totalGain))}</p>
                                <div className={styles.cardRange}>
                                    <div className={`${styles.cardRangeFill} ${summary.totalGain < 0 ? styles.red : ''}`} style={{ width: `${Math.min(Math.abs(summary.totalGainPercent), 100)}%` }}></div>
                                </div>
                            </div>
                        </div>

                        {/* Market Assets */}
                        <div className={styles.card}>
                            <div className={styles.cardTitle}>
                                <span className={`${styles.cardIcon} ${styles.purple}`}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
                                </span>
                                <p className={styles.cardTitleText}>Market Assets</p>
                            </div>
                            <div className={styles.cardData}>
                                <p className={styles.cardDataValue}>{formatCurrency(summary.marketValue)}</p>
                                <div className={styles.cardRange}>
                                    <div className={`${styles.cardRangeFill} ${styles.purple}`} style={{ width: `${summary.totalValue > 0 ? (summary.marketValue / summary.totalValue) * 100 : 0}%` }}></div>
                                </div>
                            </div>
                        </div>

                        {/* Manual Assets */}
                        <div className={styles.card}>
                            <div className={styles.cardTitle}>
                                <span className={`${styles.cardIcon} ${styles.orange}`}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/></svg>
                                </span>
                                <p className={styles.cardTitleText}>Manual Assets</p>
                            </div>
                            <div className={styles.cardData}>
                                <p className={styles.cardDataValue}>{formatCurrency(summary.manualValue)}</p>
                                <div className={styles.cardRange}>
                                    <div className={`${styles.cardRangeFill} ${styles.orange}`} style={{ width: `${summary.totalValue > 0 ? (summary.manualValue / summary.totalValue) * 100 : 0}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className={`glass-card ${styles.tableCard}`}>
                <h3 className={styles.sectionTitle}>Holdings</h3>
                {holdings.length === 0 ? (
                    <p className={styles.emptyState}>No holdings yet. Add transactions to get started.</p>
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
