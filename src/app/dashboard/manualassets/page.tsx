'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useProfile } from '@/components/ProfileContext';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './manualassets.module.css';
import layoutStyles from '../layout.module.css';
import Select from '@/components/Select';

interface ManualAsset {
    _id: string;
    profile: string;
    assetType: string;
    name: string;
    currentValue: number;
    totalInvested: number;
    interestRate: number;
    maturityDate: string | null;
    status: string;
    isMarket?: boolean;
}

interface SearchResult {
    symbol: string;
    name: string;
    exchange?: string;
    schemeCode?: string;
    type: string;
    currentPrice?: number | null;
}

const MANUAL_TYPES = ['FD', 'EPF', 'PPF', 'ULIP'];
const MARKET_TYPES = ['STOCK', 'MUTUAL_FUND', 'SGB', 'NPS'];

export default function AssetsPage() {
    const { profile } = useProfile();
    const [assets, setAssets] = useState<ManualAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    const [isLiveRefreshing, setIsLiveRefreshing] = useState(false);

    // Manual asset form
    const [form, setForm] = useState({
        profile: 'sameer',
        assetType: 'STOCK',
        name: '',
        currentValue: '',
        totalInvested: '',
        interestRate: '',
        maturityDate: '',
    });

    // Market asset form (stock/MF)
    const [marketForm, setMarketForm] = useState({
        profile: 'sameer',
        date: new Date().toISOString().split('T')[0],
        quantity: '',
        price: '',
        fees: '0',
    });

    // Search state in modal
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [selectedInstrument, setSelectedInstrument] = useState<SearchResult | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Quick Search & Filter on Assets list
    const [pageSearchQuery, setPageSearchQuery] = useState('');
    const [pageFilterType, setPageFilterType] = useState('ALL');

    const isMarketType = MARKET_TYPES.includes(form.assetType);

    const filteredAssets = assets.filter((asset) => {
        // Type filter
        if (pageFilterType === 'STOCK' && asset.assetType !== 'STOCK' && asset.assetType !== 'ETF') return false;
        if (pageFilterType === 'MUTUAL_FUND' && asset.assetType !== 'MUTUAL_FUND') return false;
        if (pageFilterType === 'SGB' && asset.assetType !== 'SGB' && asset.assetType !== 'GOLD') return false;
        if (pageFilterType === 'FD' && asset.assetType !== 'FD') return false;
        if (pageFilterType === 'EPF_PPF' && asset.assetType !== 'EPF' && asset.assetType !== 'PPF') return false;
        if (pageFilterType === 'NPS' && asset.assetType !== 'NPS') return false;
        if (pageFilterType === 'OTHER' && ['STOCK', 'ETF', 'MUTUAL_FUND', 'SGB', 'GOLD', 'FD', 'EPF', 'PPF', 'NPS'].includes(asset.assetType)) return false;

        // Search query filter (matches name, assetType, or profile)
        if (pageSearchQuery.trim()) {
            const q = pageSearchQuery.toLowerCase().trim();
            const matchesName = (asset.name || '').toLowerCase().includes(q);
            const matchesType = (asset.assetType || '').toLowerCase().includes(q);
            const matchesProfile = (asset.profile || '').toLowerCase().includes(q);
            return matchesName || matchesType || matchesProfile;
        }

        return true;
    });

    const getCount = (type: string) => {
        if (type === 'ALL') return assets.length;
        if (type === 'STOCK') return assets.filter(a => a.assetType === 'STOCK' || a.assetType === 'ETF').length;
        if (type === 'MUTUAL_FUND') return assets.filter(a => a.assetType === 'MUTUAL_FUND').length;
        if (type === 'SGB') return assets.filter(a => a.assetType === 'SGB' || a.assetType === 'GOLD').length;
        if (type === 'FD') return assets.filter(a => a.assetType === 'FD').length;
        if (type === 'EPF_PPF') return assets.filter(a => a.assetType === 'EPF' || a.assetType === 'PPF').length;
        if (type === 'NPS') return assets.filter(a => a.assetType === 'NPS').length;
        if (type === 'OTHER') return assets.filter(a => !['STOCK', 'ETF', 'MUTUAL_FUND', 'SGB', 'GOLD', 'FD', 'EPF', 'PPF', 'NPS'].includes(a.assetType)).length;
        return 0;
    };

    const fetchAssets = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const profileParam = profile === 'combined' ? '' : `?profile=${profile}`;
            const res = await fetch(`/api/holdings${profileParam}`, { cache: 'no-store' });
            const data = await res.json();
            
            const mappedHoldings = (data.holdings || []).map((h: any) => ({
                _id: h.instrumentId,
                profile: profile === 'combined' ? 'Combined' : profile,
                assetType: h.assetType,
                name: h.name,
                currentValue: h.currentValue,
                totalInvested: h.totalInvested,
                interestRate: 0,
                maturityDate: null,
                status: 'ACTIVE',
                isMarket: true
            }));
            
            setAssets([...mappedHoldings, ...(data.manualAssets || [])]);
        } catch (err) {
            console.error('Failed to fetch assets:', err);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const triggerLiveRefresh = async () => {
        setIsLiveRefreshing(true);
        try {
            const res = await fetch('/api/prices/refresh-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profileId: profile }),
            });
            if (res.ok) {
                // Silently re-fetch assets to get the new live prices
                await fetchAssets(true);
            }
        } catch (err) {
            console.error('Live refresh failed:', err);
        } finally {
            setIsLiveRefreshing(false);
        }
    };

    useEffect(() => {
        // Initial load (shows spinner)
        fetchAssets().then(() => {
            // After initial DB load, fetch live prices silently
            triggerLiveRefresh();
        });
    }, [profile]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const searchInstruments = useCallback(async (query: string) => {
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        setSearchLoading(true);
        try {
            const type = form.assetType;
            const res = await fetch(`/api/instruments/search?q=${encodeURIComponent(query)}&type=${type}`);
            const data = await res.json();
            setSearchResults(data.results || []);
            setShowDropdown(true);
        } catch {
            setSearchResults([]);
        } finally {
            setSearchLoading(false);
        }
    }, [form.assetType]);

    const handleSearchInput = (value: string) => {
        setSearchQuery(value);
        setSelectedInstrument(null);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => searchInstruments(value), 300);
    };

    const handleSelectInstrument = (result: SearchResult) => {
        setSelectedInstrument(result);
        setSearchQuery(result.name);
        setShowDropdown(false);
        if (result.type === 'SGB' && result.currentPrice) {
            setMarketForm(prev => ({
                ...prev,
                price: result.currentPrice!.toString(),
            }));
        }
    };

    const resetForm = () => {
        const defaultProfile = profile === 'combined' ? 'sameer' : profile;
        setForm({
            profile: defaultProfile,
            assetType: 'STOCK',
            name: '',
            currentValue: '',
            totalInvested: '',
            interestRate: '',
            maturityDate: '',
        });
        setMarketForm({
            profile: defaultProfile,
            date: new Date().toISOString().split('T')[0],
            quantity: '',
            price: '',
            fees: '0',
        });
        setSearchQuery('');
        setSelectedInstrument(null);
        setSearchResults([]);
        setEditingId(null);
    };

    const handleMarketSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');
        
        if (!selectedInstrument) {
            setFormError('Please search and select an instrument first.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/manualassets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assetType: form.assetType,
                    profile: marketForm.profile,
                    tickerSymbol: selectedInstrument.symbol,
                    name: selectedInstrument.name,
                    schemeCode: selectedInstrument.schemeCode || null,
                    exchange: selectedInstrument.exchange || '',
                    date: marketForm.date,
                    quantity: parseFloat(marketForm.quantity),
                    price: parseFloat(marketForm.price),
                    fees: parseFloat(marketForm.fees || '0'),
                }),
            });

            const data = await res.json();
            if (res.ok) {
                setShowModal(false);
                resetForm();
                setFormSuccess(`Added ${selectedInstrument.name} to your Assets!`);
                fetchAssets();
                setTimeout(() => {
                    setFormSuccess('');
                }, 3000);
            } else {
                setFormError(data.error || 'Failed to add instrument');
            }
        } catch {
            setFormError('Something went wrong');
        } finally {
            setSubmitting(false);
        }
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');
        setSubmitting(true);
        
        try {
            const url = editingId ? `/api/manualassets/${editingId}` : '/api/manualassets';
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    currentValue: parseFloat(form.currentValue),
                    totalInvested: parseFloat(form.totalInvested),
                    interestRate: parseFloat(form.interestRate || '0'),
                    maturityDate: form.maturityDate || null,
                }),
            });

            if (res.ok) {
                setShowModal(false);
                resetForm();
                setFormSuccess(editingId ? 'Asset updated!' : 'Asset added!');
                fetchAssets();
                setTimeout(() => {
                    setFormSuccess('');
                }, 3000);
            } else {
                const data = await res.json();
                setFormError(data.error || 'Failed to save asset');
                setTimeout(() => setFormError(''), 3000);
            }
        } catch (err) {
            console.error('Failed to save asset:', err);
            setFormError('Something went wrong');
            setTimeout(() => setFormError(''), 3000);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (asset: ManualAsset) => {
        setForm({
            profile: asset.profile,
            assetType: asset.assetType,
            name: asset.name,
            currentValue: asset.currentValue.toString(),
            totalInvested: asset.totalInvested.toString(),
            interestRate: asset.interestRate.toString(),
            maturityDate: asset.maturityDate ? asset.maturityDate.split('T')[0] : '',
        });
        setEditingId(asset._id);
        setShowModal(true);
    };

    const handleDelete = (id: string) => {
        setDeleteConfirmId(id);
    };

    const confirmDelete = async () => {
        if (!deleteConfirmId) return;
        try {
            await fetch(`/api/manualassets/${deleteConfirmId}`, { method: 'DELETE' });
            fetchAssets();
        } catch (err) {
            console.error('Failed to delete:', err);
        } finally {
            setDeleteConfirmId(null);
        }
    };

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

    return (
        <div className={styles.page}>
            {deleteConfirmId && (
                <div className={layoutStyles.modalOverlay} onClick={() => setDeleteConfirmId(null)}>
                    <div className={layoutStyles.modalContent} onClick={e => e.stopPropagation()}>
                        <h3 className={layoutStyles.modalTitle}>Delete Asset</h3>
                        <p className={layoutStyles.modalDesc}>
                            Are you sure you want to delete this manual asset? This action cannot be undone.
                        </p>
                        <div className={layoutStyles.modalActions}>
                            <button className={layoutStyles.modalBtnCancel} onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                            <button className={layoutStyles.modalBtnDanger} onClick={confirmDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h2 className={styles.title}>Assets</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '4px 10px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                        {isLiveRefreshing ? (
                            <>
                                <div className={styles.liveDot} style={{ background: '#f59e0b', boxShadow: '0 0 0 0 rgba(245, 158, 11, 0.7)' }}></div>
                                Fetching live prices...
                            </>
                        ) : (
                            <>
                                <div className={styles.liveDot}></div>
                                Prices are live
                            </>
                        )}
                    </div>
                </div>
                <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
                    + Add Asset
                </button>
            </div>

            {/* Quick Search & Filter Toolbar */}
            {assets.length > 0 && (
                <div className={styles.toolbar}>
                    <div className={styles.searchBarWrapper}>
                        <div className={styles.searchIcon}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </div>
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="Quick search assets by name, scrip, type or profile... (e.g. HDFC, SGB, Sameer)"
                            value={pageSearchQuery}
                            onChange={(e) => setPageSearchQuery(e.target.value)}
                        />
                        {pageSearchQuery && (
                            <button
                                type="button"
                                className={styles.searchClearBtn}
                                onClick={() => setPageSearchQuery('')}
                                title="Clear search"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <div className={styles.filterChips}>
                        {[
                            { id: 'ALL', label: 'All' },
                            { id: 'STOCK', label: 'Stocks & ETFs' },
                            { id: 'MUTUAL_FUND', label: 'Mutual Funds' },
                            { id: 'SGB', label: 'Gold & SGB' },
                            { id: 'FD', label: 'Fixed Deposits' },
                            { id: 'EPF_PPF', label: 'EPF / PPF' },
                            { id: 'NPS', label: 'NPS' },
                            { id: 'OTHER', label: 'Other' },
                        ].filter(chip => chip.id === 'ALL' || getCount(chip.id) > 0).map(chip => (
                            <button
                                key={chip.id}
                                type="button"
                                className={`${styles.filterChip} ${pageFilterType === chip.id ? styles.filterChipActive : ''}`}
                                onClick={() => setPageFilterType(chip.id)}
                            >
                                <span>{chip.label}</span>
                                <span className={styles.chipCount}>{getCount(chip.id)}</span>
                            </button>
                        ))}
                    </div>

                    {(pageSearchQuery || pageFilterType !== 'ALL') && (
                        <div className={styles.resultsMeta}>
                            <span>
                                Showing {filteredAssets.length} of {assets.length} assets
                                {pageSearchQuery && <span> matching <strong>"{pageSearchQuery}"</strong></span>}
                            </span>
                            <button
                                type="button"
                                style={{ background: 'none', border: 'none', color: 'var(--accent-primary, #3b82f6)', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                                onClick={() => { setPageSearchQuery(''); setPageFilterType('ALL'); }}
                            >
                                Reset filters
                            </button>
                        </div>
                    )}
                </div>
            )}

            {loading ? (
                <p className={styles.loading}>Loading...</p>
            ) : assets.length === 0 ? (
                <p className={styles.empty}>No assets yet. Add stocks, mutual funds, FDs, and more.</p>
            ) : filteredAssets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--bg-card, rgba(255,255,255,0.03))', borderRadius: '16px', border: '1px dashed var(--border-subtle)' }}>
                    <p style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 500, marginBottom: '8px' }}>
                        No assets found matching "{pageSearchQuery}"
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                        Try searching with a different keyword or clear your filters.
                    </p>
                    <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: '13px', padding: '8px 16px' }}
                        onClick={() => { setPageSearchQuery(''); setPageFilterType('ALL'); }}
                    >
                        Clear Search & Filters
                    </button>
                </div>
            ) : (
                <motion.div layout className={styles.grid}>
                    <AnimatePresence mode="popLayout">
                        {filteredAssets.map((asset) => {
                            const returns = asset.currentValue - asset.totalInvested;
                            const returnsPercent = asset.totalInvested > 0
                                ? ((returns / asset.totalInvested) * 100).toFixed(1)
                                : '0';

                            return (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.96 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.96 }}
                                    transition={{ duration: 0.2 }}
                                    key={asset._id}
                                    className={`glass-card ${styles.card}`}
                                >
                                    <div className={styles.cardHeader}>
                                        <span className={styles.assetBadge}>{asset.assetType}</span>
                                        <span className={styles.profileBadge}>{asset.profile}</span>
                                    </div>

                                    <h3 className={styles.assetName}>{asset.name}</h3>

                                    <div className={styles.valueRow}>
                                        <span className={styles.currentValue}>{formatCurrency(asset.currentValue)}</span>
                                        <span className={returns >= 0 ? 'gain' : 'loss'}>
                                            {returns >= 0 ? '▲' : '▼'} {returnsPercent}%
                                        </span>
                                    </div>

                                    <div className={styles.details}>
                                        <div className={styles.detailRow}>
                                            <span>Invested</span>
                                            <span>{formatCurrency(asset.totalInvested)}</span>
                                        </div>
                                        <div className={styles.detailRow}>
                                            <span>Returns</span>
                                            <span className={returns >= 0 ? 'gain' : 'loss'}>{formatCurrency(returns)}</span>
                                        </div>
                                        {asset.interestRate > 0 && (
                                            <div className={styles.detailRow}>
                                                <span>Interest Rate</span>
                                                <span>{asset.interestRate}%</span>
                                            </div>
                                        )}
                                        {asset.maturityDate && (
                                            <div className={styles.detailRow}>
                                                <span>Maturity</span>
                                                <span>{new Date(asset.maturityDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.cardActions}>
                                        {!asset.isMarket && (
                                            <>
                                                <button className="btn-secondary" onClick={() => handleEdit(asset)}>
                                                    Edit
                                                </button>
                                                <button className={styles.deleteBtn} onClick={() => handleDelete(asset._id)}>
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                        {asset.isMarket && (
                                            <span style={{ fontSize: '11px', color: 'var(--paper-dim)' }}>Managed via Transactions</span>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </motion.div>
            )}

            {showModal && (
                <div className={styles.overlay} onClick={() => { setShowModal(false); resetForm(); }}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>{editingId ? 'Update Asset' : 'Add Asset'}</h3>

                        {/* Asset Type Tabs */}
                        {!editingId && (
                            <div className="tab-group" style={{ marginBottom: '20px', width: '100%', display: 'flex' }}>
                                {['STOCK', 'MUTUAL_FUND', 'FD', 'EPF', 'PPF', 'NPS', 'SGB', 'ULIP'].map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        style={{ flex: 1, justifyContent: 'center' }}
                                        className={`tab ${form.assetType === t ? 'active' : ''}`}
                                        onClick={() => {
                                            setForm({ ...form, assetType: t });
                                            setSearchQuery('');
                                            setSelectedInstrument(null);
                                            setSearchResults([]);
                                        }}
                                    >
                                        {t === 'MUTUAL_FUND' ? 'MF' : t}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* ========== MARKET ASSET FORM (Stock / MF) ========== */}
                        {isMarketType && !editingId ? (
                            <form onSubmit={handleMarketSubmit} className={styles.form}>
                                <div className={styles.field} ref={searchRef}>
                                    <label className="label">
                                        Search {form.assetType === 'STOCK' ? 'Stock' : form.assetType === 'MUTUAL_FUND' ? 'Mutual Fund' : form.assetType === 'NPS' ? 'NPS Scheme' : 'Sovereign Gold Bond Series'}
                                    </label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder={form.assetType === 'STOCK' ? 'e.g. Reliance, HDFC Bank...' : form.assetType === 'MUTUAL_FUND' ? 'e.g. Parag Parikh, Motilal Oswal...' : form.assetType === 'NPS' ? 'e.g. SBI Pension Fund...' : 'e.g. SGB 2020-21, Aug 2028, Series IV...'}
                                        value={searchQuery}
                                        onChange={(e) => handleSearchInput(e.target.value)}
                                        autoComplete="off"
                                    />
                                    {searchLoading && (
                                        <div className={styles.searchHint}>Searching...</div>
                                    )}

                                    {showDropdown && searchResults.length > 0 && (
                                        <div className={styles.dropdown}>
                                            {searchResults.map((r, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    className={styles.dropdownItem}
                                                    onClick={() => handleSelectInstrument(r)}
                                                >
                                                    <span className={styles.dropdownName}>{r.name}</span>
                                                    <span className={styles.dropdownTicker}>{r.symbol}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {showDropdown && searchResults.length === 0 && searchQuery.length >= 2 && !searchLoading && (
                                        <div className={styles.dropdown}>
                                            <div className={styles.dropdownEmpty}>No results found</div>
                                        </div>
                                    )}
                                </div>

                                {selectedInstrument && (
                                    <div className={styles.selectedBadge}>
                                        ✓ {selectedInstrument.name}
                                        <span className={styles.selectedTicker}>{selectedInstrument.symbol}</span>
                                    </div>
                                )}

                                <div className={styles.field}>
                                    <label className="label">Profile</label>
                                    <Select 
                                        value={marketForm.profile} 
                                        onChange={(value) => setMarketForm({ ...marketForm, profile: value })}
                                        options={[
                                            { value: 'sameer', label: 'Sameer' },
                                            { value: 'snehal', label: 'Snehal' },
                                            { value: 'soham', label: 'Soham' }
                                        ]}
                                    />
                                </div>
                                <div className={styles.field}>
                                    <label className="label">Date</label>
                                    <input type="date" className="input" value={marketForm.date} onChange={(e) => setMarketForm({ ...marketForm, date: e.target.value })} required />
                                </div>

                                <div className={styles.row}>
                                    <div className={styles.field}>
                                        <label className="label">{form.assetType === 'SGB' ? 'Quantity (in Grams)' : 'Quantity'}</label>
                                        <input type="number" className="input" placeholder="0" step="any" value={marketForm.quantity} onChange={(e) => setMarketForm({ ...marketForm, quantity: e.target.value })} required />
                                    </div>
                                    <div className={styles.field}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <label className="label">{form.assetType === 'SGB' ? 'Gold Rate (₹/gram)' : 'Price per unit (₹)'}</label>
                                            {form.assetType === 'SGB' && selectedInstrument?.currentPrice && (
                                                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                                                    Live: ₹{selectedInstrument.currentPrice.toLocaleString('en-IN')}/g
                                                </span>
                                            )}
                                        </div>
                                        <input type="number" className="input" placeholder="0" step="any" value={marketForm.price} onChange={(e) => setMarketForm({ ...marketForm, price: e.target.value })} required />
                                    </div>
                                </div>

                                {form.assetType !== 'NPS' && (
                                    <div className={styles.field}>
                                        <label className="label">Fees / Charges (₹)</label>
                                        <input type="number" className="input" placeholder="0" step="any" value={marketForm.fees} onChange={(e) => setMarketForm({ ...marketForm, fees: e.target.value })} />
                                    </div>
                                )}

                                <div className={styles.formActions} style={{ marginTop: '24px' }}>
                                    <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                                    <button type="submit" className="btn-primary" disabled={submitting}>
                                        {submitting ? 'Adding...' : 'Add to Portfolio'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            /* ========== MANUAL ASSET FORM (FD/EPF/etc) ========== */
                            <form onSubmit={handleManualSubmit} className={styles.form}>
                                <div className={styles.field}>
                                    <label className="label">Profile</label>
                                    <Select 
                                        value={form.profile} 
                                        onChange={(value) => setForm({ ...form, profile: value })}
                                        options={[
                                            { value: 'sameer', label: 'Sameer' },
                                            { value: 'snehal', label: 'Snehal' },
                                            { value: 'soham', label: 'Soham' }
                                        ]}
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label className="label">Name</label>
                                    <input type="text" className="input" placeholder="e.g. SBI FD - 7.1%" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                                </div>

                                <div className={styles.row}>
                                    <div className={styles.field}>
                                        <label className="label">Current Value</label>
                                        <input type="number" className="input" placeholder="0" step="any" value={form.currentValue} onChange={(e) => setForm({ ...form, currentValue: e.target.value })} required />
                                    </div>
                                    <div className={styles.field}>
                                        <label className="label">Total Invested</label>
                                        <input type="number" className="input" placeholder="0" step="any" value={form.totalInvested} onChange={(e) => setForm({ ...form, totalInvested: e.target.value })} required />
                                    </div>
                                </div>

                                <div className={styles.row}>
                                    <div className={styles.field}>
                                        <label className="label">Interest Rate (%)</label>
                                        <input type="number" className="input" placeholder="0" step="any" value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} />
                                    </div>
                                    <div className={styles.field}>
                                        <label className="label">Maturity Date</label>
                                        <input type="date" className="input" value={form.maturityDate} onChange={(e) => setForm({ ...form, maturityDate: e.target.value })} />
                                    </div>
                                </div>

                                <div className={styles.formActions} style={{ marginTop: '24px' }}>
                                    <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                                    <button type="submit" className="btn-primary">{editingId ? 'Update' : 'Add Asset'}</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            <AnimatePresence>
                {(formSuccess || formError) && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
                        exit={{ opacity: 0, y: 20, scale: 0.9, x: '-50%' }}
                        transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
                        className={styles.toast}
                        style={{
                            background: formError ? '#f87171' : '#34d399',
                            color: formError ? '#fff' : '#0A0F1C',
                        }}
                    >
                        {formError || formSuccess}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
