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
            style: 'currency',
            currency: 'INR',
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
                            <span className={summary.totalDayGain >= 0 ? 'gain' : 'loss'}>
                                {summary.totalDayGain >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(summary.totalDayGain))} ({formatPercent(summary.totalDayGainPercent)})
                            </span>
                            <span className={styles.heroChangeLabel}>Today</span>
                        </div>
                    </div>

                    <div className={styles.heroStats}>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>Invested</span>
                            <span className={styles.statValue}>{formatCurrency(summary.totalInvested)}</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>Total Gain</span>
                            <span className={`${styles.statValue} ${summary.totalGain >= 0 ? 'gain' : 'loss'}`}>
                                {formatCurrency(summary.totalGain)} ({formatPercent(summary.totalGainPercent)})
                            </span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>Market Assets</span>
                            <span className={styles.statValue}>{formatCurrency(summary.marketValue)}</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>Manual Assets</span>
                            <span className={styles.statValue}>{formatCurrency(summary.manualValue)}</span>
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
