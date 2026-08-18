'use client';

import { useEffect, useState } from 'react';
import { useProfile } from '@/components/ProfileContext';
import styles from './holdings.module.css';

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
    totalInvested: number;
    totalFees: number;
    dayGain: number;
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

export default function HoldingsPage() {
    const { profile } = useProfile();
    const [holdings, setHoldings] = useState<Holding[]>([]);
    const [manualAssets, setManualAssets] = useState<ManualAsset[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<'value' | 'gain' | 'dayGain'>('value');

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
            } catch (err) {
                console.error('Failed to fetch holdings:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [profile]);

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);

    const formatPercent = (n: number) =>
        `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

    const sortedHoldings = [...holdings].sort((a, b) => {
        if (sortBy === 'gain') return b.totalGain - a.totalGain;
        if (sortBy === 'dayGain') return b.dayGain - a.dayGain;
        return b.currentValue - a.currentValue;
    });

    const grouped = sortedHoldings.reduce((acc, h) => {
        if (!acc[h.assetType]) acc[h.assetType] = [];
        acc[h.assetType].push(h);
        return acc;
    }, {} as Record<string, Holding[]>);

    const assetTypeLabels: Record<string, string> = {
        STOCK: ' Stocks',
        MUTUAL_FUND: ' Mutual Funds',
        ETF: 'ETFs',
        SGB: 'Sovereign Gold Bonds',
        NPS: 'NPS',
        GOLD: 'Gold',
        BOND: 'Bonds',
    };

    if (loading) {
        return <div className={styles.loading}>Loading holdings...</div>;
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h2 className={styles.title}>Holdings</h2>
                <div className="tab-group">
                    {(['value', 'gain', 'dayGain'] as const).map((s) => (
                        <button
                            key={s}
                            className={`tab ${sortBy === s ? 'active' : ''}`}
                            onClick={() => setSortBy(s)}
                        >
                            {s === 'value' ? 'By Value' : s === 'gain' ? 'By P&L' : 'By Day'}
                        </button>
                    ))}
                </div>
            </div>

            {summary && (
                <div className={styles.summaryBar}>
                    {/* Total Value */}
                    <div className={styles.card}>
                        <div className={styles.cardTitle}>
                            <span className={`${styles.cardIcon} ${styles.blue}`}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                            </span>
                            <p className={styles.cardTitleText}>Total Value</p>
                        </div>
                        <div className={styles.cardData}>
                            <p className={styles.cardDataValue}>{formatCurrency(summary.totalValue)}</p>
                            <div className={styles.cardRange}>
                                <div className={`${styles.cardRangeFill} ${styles.blue}`} style={{ width: '100%' }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Total Invested */}
                    <div className={styles.card}>
                        <div className={styles.cardTitle}>
                            <span className={`${styles.cardIcon} ${styles.purple}`}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 15h0M2 9.5h20"/></svg>
                            </span>
                            <p className={styles.cardTitleText}>Invested</p>
                        </div>
                        <div className={styles.cardData}>
                            <p className={styles.cardDataValue}>{formatCurrency(summary.totalInvested)}</p>
                            <div className={styles.cardRange}>
                                <div className={`${styles.cardRangeFill} ${styles.purple}`} style={{ width: `${summary.totalValue > 0 ? (summary.totalInvested / summary.totalValue) * 100 : 0}%` }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Total P&L */}
                    <div className={styles.card}>
                        <div className={styles.cardTitle}>
                            <span className={styles.cardIcon}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                            </span>
                            <p className={styles.cardTitleText}>Total P&L</p>
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

                    {/* Day Change */}
                    <div className={styles.card}>
                        <div className={styles.cardTitle}>
                            <span className={`${styles.cardIcon} ${styles.orange}`}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            </span>
                            <p className={styles.cardTitleText}>Day Change</p>
                            <p className={`${styles.cardPercent} ${summary.totalDayGain < 0 ? styles.loss : ''}`}>
                                {summary.totalDayGain >= 0 ? '▲' : '▼'} {Math.abs(summary.totalDayGainPercent).toFixed(2)}%
                            </p>
                        </div>
                        <div className={styles.cardData}>
                            <p className={styles.cardDataValue}>{formatCurrency(Math.abs(summary.totalDayGain))}</p>
                            <div className={styles.cardRange}>
                                <div className={`${styles.cardRangeFill} ${summary.totalDayGain < 0 ? styles.red : styles.orange}`} style={{ width: `${Math.min(Math.abs(summary.totalDayGainPercent) * 10, 100)}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {Object.entries(grouped).map(([assetType, items]) => {
                const groupValue = items.reduce((s, h) => s + h.currentValue, 0);
                const groupGain = items.reduce((s, h) => s + h.totalGain, 0);

                return (
                    <div key={assetType} className={`glass-card ${styles.groupCard}`}>
                        <div className={styles.groupHeader}>
                            <h3 className={styles.groupTitle}>
                                {assetTypeLabels[assetType] || assetType}
                            </h3>
                            <div className={styles.groupStats}>
                                <span>{formatCurrency(groupValue)}</span>
                                <span className={groupGain >= 0 ? 'gain' : 'loss'}>
                                    {formatCurrency(groupGain)}
                                </span>
                            </div>
                        </div>

                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Qty</th>
                                    <th>Avg Price</th>
                                    <th>CMP</th>
                                    <th>Value</th>
                                    <th>P&L</th>
                                    <th>Day</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((h) => {
                                    const gainPercent = h.totalInvested > 0
                                        ? ((h.totalGain / h.totalInvested) * 100).toFixed(1)
                                        : '0';

                                    return (
                                        <tr key={h.instrumentId}>
                                            <td>
                                                <div className={styles.holdingName}>{h.name}</div>
                                                <div className={styles.holdingTicker}>{h.tickerSymbol}</div>
                                            </td>
                                            <td>{h.currentQty}</td>
                                            <td>{formatCurrency(h.avgBuyPrice)}</td>
                                            <td>{formatCurrency(h.currentPrice)}</td>
                                            <td className={styles.valueCell}>{formatCurrency(h.currentValue)}</td>
                                            <td className={h.totalGain >= 0 ? 'gain' : 'loss'}>
                                                <div>{formatCurrency(h.totalGain)}</div>
                                                <div className={styles.percentSmall}>{gainPercent}%</div>
                                            </td>
                                            <td className={h.dayGain >= 0 ? 'gain' : 'loss'}>
                                                {formatCurrency(h.dayGain)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                );
            })}

            {manualAssets.length > 0 && (
                <div className={`glass-card ${styles.groupCard}`}>
                    <div className={styles.groupHeader}>
                        <h3 className={styles.groupTitle}>🏦 Manual Assets</h3>
                        <div className={styles.groupStats}>
                            <span>{formatCurrency(manualAssets.reduce((s, a) => s + a.currentValue, 0))}</span>
                        </div>
                    </div>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Invested</th>
                                <th>Current Value</th>
                                <th>Returns</th>
                            </tr>
                        </thead>
                        <tbody>
                            {manualAssets.map((a) => {
                                const returns = a.currentValue - a.totalInvested;
                                return (
                                    <tr key={a._id}>
                                        <td className={styles.holdingName}>{a.name}</td>
                                        <td className={styles.holdingTicker}>{a.assetType}</td>
                                        <td>{formatCurrency(a.totalInvested)}</td>
                                        <td>{formatCurrency(a.currentValue)}</td>
                                        <td className={returns >= 0 ? 'gain' : 'loss'}>{formatCurrency(returns)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {holdings.length === 0 && manualAssets.length === 0 && (
                <p className={styles.empty}>No holdings yet. Add transactions or manual assets to get started.</p>
            )}
        </div>
    );
}
