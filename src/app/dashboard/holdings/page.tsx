'use client';

import { useEffect, useState, useMemo } from 'react';
import { useProfile } from '@/components/ProfileContext';
import styles from './holdings.module.css';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

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
    updatedAt: string;
}

interface Summary {
    totalValue: number;
    totalInvested: number;
    totalGain: number;
    totalGainPercent: number;
    totalDayGain: number;
    totalDayGainPercent: number;
}

const badgeColors = ['#5B8DEF', '#8C97E8', '#4FB08C', '#D8735F', '#C9A24A'];

export default function HoldingsPage() {
    const { profile } = useProfile();
    const [holdings, setHoldings] = useState<Holding[]>([]);
    const [manualAssets, setManualAssets] = useState<ManualAsset[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState<'stocks' | 'funds' | 'manual'>('stocks');
    const [sortPrefs, setSortPrefs] = useState<Record<string, 'value' | 'pnl' | 'day'>>({
        stocks: 'value',
        funds: 'value',
        manual: 'value'
    });

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

    const formatCurrency = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n || 0);

    const stocks = useMemo(() => holdings.filter(h => h.assetType === 'STOCK' || h.assetType === 'ETF'), [holdings]);
    const funds = useMemo(() => holdings.filter(h => h.assetType !== 'STOCK' && h.assetType !== 'ETF'), [holdings]);
    
    const stocksValue = stocks.reduce((s, h) => s + h.currentValue, 0);
    const stocksPnl = stocks.reduce((s, h) => s + h.totalGain, 0);
    
    const fundsValue = funds.reduce((s, h) => s + h.currentValue, 0);
    const fundsPnl = funds.reduce((s, h) => s + h.totalGain, 0);
    
    const manualValue = manualAssets.reduce((s, a) => s + (a.currentValue || 0), 0);
    const manualInvested = manualAssets.reduce((s, a) => s + (a.totalInvested || 0), 0);
    const manualPnl = manualValue - manualInvested;

    const handleSort = (section: string, mode: 'value' | 'pnl' | 'day') => {
        setSortPrefs(prev => ({ ...prev, [section]: mode }));
    };

    const sortedStocks = useMemo(() => {
        return [...stocks].sort((a, b) => {
            if (sortPrefs.stocks === 'pnl') return b.totalGain - a.totalGain;
            if (sortPrefs.stocks === 'day') return b.dayGain - a.dayGain;
            return b.currentValue - a.currentValue;
        });
    }, [stocks, sortPrefs.stocks]);

    const sortedFunds = useMemo(() => {
        return [...funds].sort((a, b) => {
            if (sortPrefs.funds === 'pnl') return b.totalGain - a.totalGain;
            if (sortPrefs.funds === 'day') return b.dayGain - a.dayGain;
            return b.currentValue - a.currentValue;
        });
    }, [funds, sortPrefs.funds]);

    const sortedManual = useMemo(() => {
        return [...manualAssets].sort((a, b) => {
            const pnlA = (a.currentValue || 0) - (a.totalInvested || 0);
            const pnlB = (b.currentValue || 0) - (b.totalInvested || 0);
            if (sortPrefs.manual === 'pnl') return pnlB - pnlA;
            return (b.currentValue || 0) - (a.currentValue || 0);
        });
    }, [manualAssets, sortPrefs.manual]);

    if (loading) {
        return <div className={styles.loading}>Loading holdings...</div>;
    }

    const profileLabel = profile === 'combined' ? 'Combined' : profile.charAt(0).toUpperCase() + profile.slice(1);

    return (
        <div className={styles.page}>
            <div className={styles.pageInner}>

                <div className={styles.pageHead}>
                    <div className={styles.eyebrow}>{profileLabel} · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    <div className={styles.pageTitle}>Holdings</div>
                </div>

                {summary && (
                    <div className={styles.statBand}>
                        <div className={styles.stat}>
                            <div className={styles.statTop}>
                                <div className={styles.statIcon} style={{ background: 'rgba(91,141,239,0.15)' }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="#5B8DEF" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
                                </div>
                                <div className={styles.statLabel}>Total Value</div>
                            </div>
                            <div className={styles.statFigure}>{formatCurrency(summary.totalValue)}</div>
                            <div className={styles.statBar}><div className={styles.statBarFill} style={{ width: '100%', background: '#5B8DEF' }}></div></div>
                        </div>
                        <div className={styles.stat}>
                            <div className={styles.statTop}>
                                <div className={styles.statIcon} style={{ background: 'rgba(140,151,232,0.15)' }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="#8C97E8" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" /></svg>
                                </div>
                                <div className={styles.statLabel}>Invested</div>
                            </div>
                            <div className={styles.statFigure}>{formatCurrency(summary.totalInvested)}</div>
                            <div className={styles.statBar}><div className={styles.statBarFill} style={{ width: `${summary.totalValue > 0 ? (summary.totalInvested / summary.totalValue) * 100 : 0}%`, background: '#8C97E8' }}></div></div>
                        </div>
                        <div className={styles.stat}>
                            <div className={styles.statTop}>
                                <div className={styles.statIcon} style={{ background: 'rgba(79,176,140,0.15)' }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="#4FB08C" strokeWidth="2"><path d="M23 6l-9.5 9.5-5-5L1 18" /><path d="M17 6h6v6" /></svg>
                                </div>
                                <div className={styles.statLabel}>Total P&L</div>
                                <div className={styles.statTag} style={{ color: summary.totalGain >= 0 ? '#4FB08C' : '#D8735F' }}>
                                    {summary.totalGain >= 0 ? '▲' : '▼'} {Math.abs(summary.totalGainPercent || 0).toFixed(2)}%
                                </div>
                            </div>
                            <div className={styles.statFigure} style={{ color: summary.totalGain >= 0 ? '#4FB08C' : '#D8735F' }}>
                                {formatCurrency(Math.abs(summary.totalGain))}
                            </div>
                            <div className={styles.statBar}><div className={styles.statBarFill} style={{ width: `${Math.min(Math.abs(summary.totalGainPercent || 0), 100)}%`, background: summary.totalGain >= 0 ? '#4FB08C' : '#D8735F' }}></div></div>
                        </div>
                        <div className={styles.stat}>
                            <div className={styles.statTop}>
                                <div className={styles.statIcon} style={{ background: 'rgba(79,176,140,0.15)' }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="#4FB08C" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l4 2" /></svg>
                                </div>
                                <div className={styles.statLabel}>Day Change</div>
                                <div className={styles.statTag} style={{ color: summary.totalDayGain >= 0 ? '#4FB08C' : '#D8735F' }}>
                                    {summary.totalDayGain >= 0 ? '▲' : '▼'} {Math.abs(summary.totalDayGainPercent || 0).toFixed(2)}%
                                </div>
                            </div>
                            <div className={styles.statFigure} style={{ color: summary.totalDayGain >= 0 ? '#4FB08C' : '#D8735F' }}>
                                {formatCurrency(Math.abs(summary.totalDayGain))}
                            </div>
                            <div className={styles.statBar}><div className={styles.statBarFill} style={{ width: `${Math.min(Math.abs(summary.totalDayGainPercent || 0) * 10, 100)}%`, background: summary.totalDayGain >= 0 ? '#4FB08C' : '#D8735F' }}></div></div>
                        </div>
                    </div>
                )}

                {/* ===== Category switcher ===== */}
                <div className={styles.categorySwitch}>
                    <div className={`${styles.catTab} ${activeTab === 'stocks' ? styles.active : ''}`} onClick={() => setActiveTab('stocks')} style={{ '--cat-color': '#5B8DEF' } as any}>
                        <div className={styles.catTabTop}>
                            <div className={styles.catIcon} style={{ background: 'rgba(91,141,239,0.15)' }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="#5B8DEF" strokeWidth="2"><path d="M3 3v18h18" /><path d="M7 15l4-5 3 3 5-7" /></svg>
                            </div>
                            <div className={styles.catName}>Stocks</div>
                            <div className={styles.catCount}>{stocks.length}</div>
                        </div>
                        <div className={styles.catValue}>{formatCurrency(stocksValue)}</div>
                        <div className={`${styles.catSub} ${stocksPnl >= 0 ? styles.up : styles.down}`}>
                            {stocksPnl >= 0 ? '▲' : '▼'} {stocksPnl >= 0 ? '+' : '-'}{formatCurrency(Math.abs(stocksPnl))}
                        </div>
                    </div>

                    <div className={`${styles.catTab} ${activeTab === 'funds' ? styles.active : ''}`} onClick={() => setActiveTab('funds')} style={{ '--cat-color': '#8C97E8' } as any}>
                        <div className={styles.catTabTop}>
                            <div className={styles.catIcon} style={{ background: 'rgba(140,151,232,0.15)' }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="#8C97E8" strokeWidth="2"><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18M8 6V4h8v2" /></svg>
                            </div>
                            <div className={styles.catName}>Mutual Funds</div>
                            <div className={styles.catCount}>{funds.length}</div>
                        </div>
                        <div className={styles.catValue}>{formatCurrency(fundsValue)}</div>
                        <div className={`${styles.catSub} ${fundsPnl >= 0 ? styles.up : styles.down}`}>
                            {fundsPnl >= 0 ? '▲' : '▼'} {fundsPnl >= 0 ? '+' : '-'}{formatCurrency(Math.abs(fundsPnl))}
                        </div>
                    </div>

                    <div className={`${styles.catTab} ${activeTab === 'manual' ? styles.active : ''}`} onClick={() => setActiveTab('manual')} style={{ '--cat-color': '#D0A24C' } as any}>
                        <div className={styles.catTabTop}>
                            <div className={styles.catIcon} style={{ background: 'rgba(208,162,76,0.15)' }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="#D0A24C" strokeWidth="2"><path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" /></svg>
                            </div>
                            <div className={styles.catName}>Other Assets</div>
                            <div className={styles.catCount}>{manualAssets.length}</div>
                        </div>
                        <div className={styles.catValue}>{formatCurrency(manualValue)}</div>
                        <div className={`${styles.catSub} ${manualPnl >= 0 ? styles.up : styles.down}`}>
                            {manualPnl >= 0 ? '▲' : '▼'} {manualPnl >= 0 ? '+' : '-'}{formatCurrency(Math.abs(manualPnl))}
                        </div>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                {/* ===== Stocks section ===== */}
                {activeTab === 'stocks' && (
                <motion.div 
                    key="stocks"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                    className={styles.sectionCard}
                >
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionHeadLeft}>
                            <div className={styles.sectionTitle}>Stocks</div>
                            <div className={styles.sectionTotals}>
                                <span>{formatCurrency(stocksValue)}</span>
                                <span className={stocksPnl >= 0 ? styles.pnl : styles.pnlLoss}>
                                    {stocksPnl >= 0 ? '+' : ''}{formatCurrency(stocksPnl)}
                                </span>
                            </div>
                        </div>
                        <div className={styles.sortPills}>
                            <div className={`${styles.sortPill} ${sortPrefs.stocks === 'value' ? styles.active : ''}`} onClick={() => handleSort('stocks', 'value')}>
                                {sortPrefs.stocks === 'value' && <motion.div layoutId="sortThumb-stocks" className={styles.sortThumb} transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
                                <span style={{position:'relative', zIndex: 1}}>By Value</span>
                            </div>
                            <div className={`${styles.sortPill} ${sortPrefs.stocks === 'pnl' ? styles.active : ''}`} onClick={() => handleSort('stocks', 'pnl')}>
                                {sortPrefs.stocks === 'pnl' && <motion.div layoutId="sortThumb-stocks" className={styles.sortThumb} transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
                                <span style={{position:'relative', zIndex: 1}}>By P&L</span>
                            </div>
                            <div className={`${styles.sortPill} ${sortPrefs.stocks === 'day' ? styles.active : ''}`} onClick={() => handleSort('stocks', 'day')}>
                                {sortPrefs.stocks === 'day' && <motion.div layoutId="sortThumb-stocks" className={styles.sortThumb} transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
                                <span style={{position:'relative', zIndex: 1}}>By Day</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        {sortedStocks.map((h, i) => (
                            <HoldingRow key={h.instrumentId} holding={h} badgeColor={badgeColors[i % badgeColors.length]} formatCurrency={formatCurrency} />
                        ))}
                        {sortedStocks.length === 0 && (
                            <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--paper-dim)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', margin: '16px', border: '1px dashed var(--hairline)' }}>
                                No stocks found
                            </div>
                        )}
                    </div>
                </motion.div>
                )}

                {/* ===== Mutual Funds section ===== */}
                {activeTab === 'funds' && (
                <motion.div 
                    key="funds"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                    className={styles.sectionCard}
                >
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionHeadLeft}>
                            <div className={styles.sectionTitle}>Mutual Funds</div>
                            <div className={styles.sectionTotals}>
                                <span>{formatCurrency(fundsValue)}</span>
                                <span className={fundsPnl >= 0 ? styles.pnl : styles.pnlLoss}>
                                    {fundsPnl >= 0 ? '+' : ''}{formatCurrency(fundsPnl)}
                                </span>
                            </div>
                        </div>
                        <div className={styles.sortPills}>
                            <div className={`${styles.sortPill} ${sortPrefs.funds === 'value' ? styles.active : ''}`} onClick={() => handleSort('funds', 'value')}>
                                {sortPrefs.funds === 'value' && <motion.div layoutId="sortThumb-funds" className={styles.sortThumb} transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
                                <span style={{position:'relative', zIndex: 1}}>By Value</span>
                            </div>
                            <div className={`${styles.sortPill} ${sortPrefs.funds === 'pnl' ? styles.active : ''}`} onClick={() => handleSort('funds', 'pnl')}>
                                {sortPrefs.funds === 'pnl' && <motion.div layoutId="sortThumb-funds" className={styles.sortThumb} transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
                                <span style={{position:'relative', zIndex: 1}}>By P&L</span>
                            </div>
                            <div className={`${styles.sortPill} ${sortPrefs.funds === 'day' ? styles.active : ''}`} onClick={() => handleSort('funds', 'day')}>
                                {sortPrefs.funds === 'day' && <motion.div layoutId="sortThumb-funds" className={styles.sortThumb} transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
                                <span style={{position:'relative', zIndex: 1}}>By Day</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        {sortedFunds.map((h, i) => (
                            <HoldingRow key={h.instrumentId} holding={h} badgeColor={badgeColors[(i+2) % badgeColors.length]} formatCurrency={formatCurrency} />
                        ))}
                        {sortedFunds.length === 0 && (
                            <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--paper-dim)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', margin: '16px', border: '1px dashed var(--hairline)' }}>
                                No mutual funds found
                            </div>
                        )}
                    </div>
                </motion.div>
                )}

                {/* ===== Manual Assets section ===== */}
                {activeTab === 'manual' && (
                <motion.div 
                    key="manual"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                    className={styles.sectionCard}
                >
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionHeadLeft}>
                            <div className={styles.sectionTitle}>Other Assets</div>
                            <div className={styles.sectionTotals}>
                                <span>{formatCurrency(manualValue)}</span>
                                <span className={manualPnl >= 0 ? styles.pnl : styles.pnlLoss}>
                                    {manualPnl >= 0 ? '+' : ''}{formatCurrency(manualPnl)}
                                </span>
                            </div>
                        </div>
                        <div className={styles.sortPills}>
                            <div className={`${styles.sortPill} ${sortPrefs.manual === 'value' ? styles.active : ''}`} onClick={() => handleSort('manual', 'value')}>
                                {sortPrefs.manual === 'value' && <motion.div layoutId="sortThumb-manual" className={styles.sortThumb} transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
                                <span style={{position:'relative', zIndex: 1}}>By Value</span>
                            </div>
                            <div className={`${styles.sortPill} ${sortPrefs.manual === 'pnl' ? styles.active : ''}`} onClick={() => handleSort('manual', 'pnl')}>
                                {sortPrefs.manual === 'pnl' && <motion.div layoutId="sortThumb-manual" className={styles.sortThumb} transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
                                <span style={{position:'relative', zIndex: 1}}>By P&L</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        {sortedManual.map((a, i) => {
                            const returns = (a.currentValue || 0) - (a.totalInvested || 0);
                            const lastUpdated = a.updatedAt ? Math.floor((Date.now() - new Date(a.updatedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
                            let displayName = a.name;
                            let unitsStr = '';
                            
                            const unitMatch = a.name.match(/\s*\(([\d.,]+)\s*(units|g)\)$/i);
                            if (unitMatch) {
                                unitsStr = `${unitMatch[1]} ${unitMatch[2] === 'g' ? 'g' : ''}`;
                                displayName = a.name.replace(unitMatch[0], '');
                            }
                            
                            return (
                                <motion.div layout initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }} key={a._id} className={styles.holding}>
                                    <div className={styles.badge} style={{ background: '#D0A24C' }}>{displayName.substring(0, 2).toUpperCase()}</div>
                                    <div className={styles.holdingMain}>
                                        <div className={styles.holdingTop}>
                                            <div>
                                                <div className={styles.holdingName}>{displayName}</div>
                                                <div className={styles.holdingFolio}>
                                                    <span className={styles.manualTag}>Manual</span>
                                                    Updated {lastUpdated === 0 ? 'today' : `${lastUpdated} days ago`}
                                                </div>
                                            </div>
                                            <div className={styles.holdingCmp}>{formatCurrency(a.currentValue || 0)}</div>
                                        </div>
                                        <div className={styles.holdingDetail}>
                                            {unitsStr && (
                                                <div className={styles.detailItem}>
                                                    <div className={styles.detailLabel}>Qty</div>
                                                    <div className={styles.detailFigure}>{unitsStr}</div>
                                                </div>
                                            )}
                                            <div className={styles.detailItem}>
                                                <div className={styles.detailLabel}>Invested</div>
                                                <div className={styles.detailFigure}>{formatCurrency(a.totalInvested || 0)}</div>
                                            </div>
                                            <div className={styles.detailItem}>
                                                <div className={styles.detailLabel}>Current</div>
                                                <div className={styles.detailFigure}>{formatCurrency(a.currentValue || 0)}</div>
                                            </div>
                                            <div className={styles.holdingChips}>
                                                <div className={`${styles.chip} ${returns >= 0 ? styles.up : styles.down}`}>
                                                    <span className={styles.chipLabel}>P&L</span>
                                                    {returns >= 0 ? '▲' : '▼'}{formatCurrency(Math.abs(returns))}
                                                </div>
                                                <Link href={`/dashboard/manual-assets/edit/${a._id}`} className={styles.editBtn}>
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="#8A96B5" strokeWidth="1.8"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                        {sortedManual.length === 0 && <div style={{ padding: '24px', textAlign: 'center', color: 'var(--paper-dim)' }}>No manual assets found</div>}
                    </div>
                </motion.div>
                )}
                </AnimatePresence>
            </div>
        </div>
    );
}

function HoldingRow({ holding, badgeColor, formatCurrency }: { holding: Holding, badgeColor: string, formatCurrency: (n: number) => string }) {
    const gainPct = holding.totalInvested ? (holding.totalGain / holding.totalInvested) * 100 : 0;
    
    return (
        <motion.div layout initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }} className={styles.holding}>
            <div className={styles.badge} style={{ background: badgeColor }}>{holding.name.substring(0, 2).toUpperCase()}</div>
            <div className={styles.holdingMain}>
                <div className={styles.holdingTop}>
                    <div>
                        <div className={styles.holdingName}>{holding.name}</div>
                        <div className={styles.holdingFolio}>{holding.tickerSymbol}</div>
                    </div>
                    <div className={styles.holdingCmp}>{formatCurrency(holding.currentValue)}</div>
                </div>
                <div className={styles.holdingDetail}>
                    <div className={styles.detailItem}>
                        <div className={styles.detailLabel}>Qty</div>
                        <div className={styles.detailFigure}>{holding.currentQty.toFixed(2)}</div>
                    </div>
                    <div className={styles.detailItem}>
                        <div className={styles.detailLabel}>Avg</div>
                        <div className={styles.detailFigure}>{formatCurrency(holding.avgBuyPrice)}</div>
                    </div>
                    <div className={styles.detailItem}>
                        <div className={styles.detailLabel}>CMP</div>
                        <div className={styles.detailFigure}>{formatCurrency(holding.currentPrice)}</div>
                    </div>
                    <div className={styles.holdingChips}>
                        <div className={`${styles.chip} ${holding.totalGain >= 0 ? styles.up : styles.down}`}>
                            <span className={styles.chipLabel}>P&L</span>
                            {holding.totalGain >= 0 ? '▲' : '▼'}{Math.abs(gainPct).toFixed(2)}% (₹{formatCurrency(Math.abs(holding.totalGain))})
                        </div>
                        <div className={`${styles.chip} ${holding.dayGain >= 0 ? styles.up : styles.down}`}>
                            <span className={styles.chipLabel}>Day</span>
                            {holding.dayGain >= 0 ? '▲' : '▼'}{formatCurrency(Math.abs(holding.dayGain))}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
