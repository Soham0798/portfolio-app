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
    const { profile, setProfile } = useProfile();
    const [holdings, setHoldings] = useState<Holding[]>([]);
    const [manualAssets, setManualAssets] = useState<ManualAsset[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<'value' | 'pnl' | 'day'>('value');

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
        if (sortBy === 'pnl') return b.totalGain - a.totalGain;
        if (sortBy === 'day') return b.dayGain - a.dayGain;
        return b.currentValue - a.currentValue;
    });

    const grouped = sortedHoldings.reduce((acc, h) => {
        if (!acc[h.assetType]) acc[h.assetType] = [];
        acc[h.assetType].push(h);
        return acc;
    }, {} as Record<string, Holding[]>);

    const assetTypeLabels: Record<string, string> = {
        STOCK: 'Stocks',
        MUTUAL_FUND: 'Mutual Funds',
        ETF: 'ETFs',
        SGB: 'Sovereign Gold Bonds',
        NPS: 'NPS',
        GOLD: 'Gold',
        BOND: 'Bonds',
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#8A96B5', fontFamily: '"IBM Plex Mono", monospace', fontSize: '12px' }}>
                Loading holdings...
            </div>
        );
    }

    return (
        <div className={styles.device}>
            <div className={styles.topbar}>
                <div className={styles.pageTitle}>Holdings</div>
            </div>

            <div className={styles.scrollBody}>
                {summary && (
                    <div className={styles.statGrid}>
                        <div className={styles.statCard}>
                            <div className={styles.statCardHead}>
                                <div className={styles.statCardIcon} style={{ background: 'rgba(96,165,250,0.15)' }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                                </div>
                                <div className={styles.statCardLabel}>Total Value</div>
                            </div>
                            <div className={styles.statCardFigure}>{formatCurrency(summary.totalValue)}</div>
                            <div className={styles.statBar}><div className={styles.statBarFill} style={{ width: '100%', background: '#60A5FA' }}></div></div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statCardHead}>
                                <div className={styles.statCardIcon} style={{ background: 'rgba(167,139,250,0.15)' }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
                                </div>
                                <div className={styles.statCardLabel}>Invested</div>
                            </div>
                            <div className={styles.statCardFigure}>{formatCurrency(summary.totalInvested)}</div>
                            <div className={styles.statBar}>
                                <div className={styles.statBarFill} style={{ width: `${summary.totalValue > 0 ? (summary.totalInvested / summary.totalValue) * 100 : 0}%`, background: '#A78BFA' }}></div>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statCardHead}>
                                <div className={styles.statCardIcon} style={{ background: 'rgba(52,211,153,0.15)' }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>
                                </div>
                                <div className={styles.statCardLabel}>Total P&L</div>
                                <div className={styles.statCardTag} style={{ color: summary.totalGain >= 0 ? '#34D399' : '#F87171' }}>
                                    {summary.totalGain >= 0 ? '▲' : '▼'} {Math.abs(summary.totalGainPercent).toFixed(2)}%
                                </div>
                            </div>
                            <div className={styles.statCardFigure} style={{ color: summary.totalGain >= 0 ? '#34D399' : '#F87171' }}>
                                {formatCurrency(Math.abs(summary.totalGain))}
                            </div>
                            <div className={styles.statBar}>
                                <div className={styles.statBarFill} style={{ width: `${Math.min(Math.abs(summary.totalGainPercent), 100)}%`, background: summary.totalGain >= 0 ? '#34D399' : '#F87171' }}></div>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statCardHead}>
                                <div className={styles.statCardIcon} style={{ background: 'rgba(248,113,113,0.15)' }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></svg>
                                </div>
                                <div className={styles.statCardLabel}>Day Change</div>
                                <div className={styles.statCardTag} style={{ color: summary.totalDayGain >= 0 ? '#34D399' : '#F87171' }}>
                                    {summary.totalDayGain >= 0 ? '▲' : '▼'} {Math.abs(summary.totalDayGainPercent).toFixed(2)}%
                                </div>
                            </div>
                            <div className={styles.statCardFigure} style={{ color: summary.totalDayGain >= 0 ? '#34D399' : '#F87171' }}>
                                {formatCurrency(Math.abs(summary.totalDayGain))}
                            </div>
                            <div className={styles.statBar}>
                                <div className={styles.statBarFill} style={{ width: `${Math.min(Math.abs(summary.totalDayGainPercent) * 10, 100)}%`, background: summary.totalDayGain >= 0 ? '#34D399' : '#F87171' }}></div>
                            </div>
                        </div>
                    </div>
                )}

                <div className={styles.segmented}>
                    <div className={`${styles.segment} ${sortBy === 'value' ? styles.active : ''}`} onClick={() => setSortBy('value')}>By Value</div>
                    <div className={`${styles.segment} ${sortBy === 'pnl' ? styles.active : ''}`} onClick={() => setSortBy('pnl')}>By P&L</div>
                    <div className={`${styles.segment} ${sortBy === 'day' ? styles.active : ''}`} onClick={() => setSortBy('day')}>By Day</div>
                </div>

                {Object.entries(grouped).map(([assetType, items]) => {
                    const groupValue = items.reduce((s, h) => s + h.currentValue, 0);
                    const groupGain = items.reduce((s, h) => s + h.totalGain, 0);
                    
                    // Simple color rotation for badges based on name
                    const badgeColors = ['#60A5FA', '#A78BFA', '#34D399', '#FBBF24'];

                    return (
                        <div key={assetType} className={styles.sectionCard}>
                            <div className={styles.sectionHead}>
                                <div className={styles.sectionTitle}>{assetTypeLabels[assetType] || assetType}</div>
                                <div className={styles.sectionTotals}>
                                    <span>{formatCurrency(groupValue)}</span>
                                    <span className={groupGain >= 0 ? styles.pnl : styles.pnlLoss}>
                                        {groupGain >= 0 ? '+' : ''}{formatCurrency(groupGain)}
                                    </span>
                                </div>
                            </div>

                            <div>
                                {items.map((h, i) => {
                                    const bColor = badgeColors[i % badgeColors.length];
                                    const badgeText = h.name.substring(0, 2).toUpperCase();

                                    return (
                                        <div key={h.instrumentId} className={styles.holding}>
                                            <div className={styles.badge} style={{ background: bColor }}>{badgeText}</div>
                                            <div className={styles.holdingMain}>
                                                <div className={styles.holdingTop}>
                                                    <div>
                                                        <div className={styles.holdingName}>{h.name}</div>
                                                        <div className={styles.holdingFolio}>{h.tickerSymbol}</div>
                                                    </div>
                                                    <div className={styles.holdingCmp}>{formatCurrency(h.currentValue)}</div>
                                                </div>
                                                <div className={styles.holdingDetail}>
                                                    <div className={styles.detailItem}>
                                                        <div className={styles.detailLabel}>Qty</div>
                                                        <div className={styles.detailFigure}>{h.currentQty.toFixed(2)}</div>
                                                    </div>
                                                    <div className={styles.detailItem}>
                                                        <div className={styles.detailLabel}>Avg</div>
                                                        <div className={styles.detailFigure}>{formatCurrency(h.avgBuyPrice)}</div>
                                                    </div>
                                                    <div className={styles.detailItem}>
                                                        <div className={styles.detailLabel}>CMP</div>
                                                        <div className={styles.detailFigure}>{formatCurrency(h.currentPrice)}</div>
                                                    </div>
                                                    <div className={styles.holdingChips}>
                                                        <div className={`${styles.chip} ${h.totalGain >= 0 ? styles.up : styles.down}`}>
                                                            <span className={styles.chipLabel}>P&L</span>
                                                            {h.totalGain >= 0 ? '▲' : '▼'}{formatCurrency(Math.abs(h.totalGain))}
                                                        </div>
                                                        <div className={`${styles.chip} ${h.dayGain >= 0 ? styles.up : styles.down}`}>
                                                            <span className={styles.chipLabel}>Day</span>
                                                            {h.dayGain >= 0 ? '▲' : '▼'}{formatCurrency(Math.abs(h.dayGain))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {manualAssets.length > 0 && (
                    <div className={styles.sectionCard}>
                        <div className={styles.sectionHead}>
                            <div className={styles.sectionTitle}>Manual Assets</div>
                            <div className={styles.sectionTotals}>
                                <span>{formatCurrency(manualAssets.reduce((s, a) => s + a.currentValue, 0))}</span>
                            </div>
                        </div>

                        <div>
                            {manualAssets.map((a, i) => {
                                const bColor = ['#60A5FA', '#A78BFA', '#34D399', '#FBBF24'][i % 4];
                                const badgeText = a.name.substring(0, 2).toUpperCase();
                                const returns = a.currentValue - a.totalInvested;

                                return (
                                    <div key={a._id} className={styles.holding}>
                                        <div className={styles.badge} style={{ background: bColor }}>{badgeText}</div>
                                        <div className={styles.holdingMain}>
                                            <div className={styles.holdingTop}>
                                                <div>
                                                    <div className={styles.holdingName}>{a.name}</div>
                                                    <div className={styles.holdingFolio}>{a.assetType}</div>
                                                </div>
                                                <div className={styles.holdingCmp}>{formatCurrency(a.currentValue)}</div>
                                            </div>
                                            <div className={styles.holdingDetail}>
                                                <div className={styles.detailItem}>
                                                    <div className={styles.detailLabel}>Invested</div>
                                                    <div className={styles.detailFigure}>{formatCurrency(a.totalInvested)}</div>
                                                </div>
                                                <div className={styles.holdingChips}>
                                                    <div className={`${styles.chip} ${returns >= 0 ? styles.up : styles.down}`}>
                                                        <span className={styles.chipLabel}>Returns</span>
                                                        {returns >= 0 ? '▲' : '▼'}{formatCurrency(Math.abs(returns))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
