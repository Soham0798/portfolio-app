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

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [selectedInstrument, setSelectedInstrument] = useState<SearchResult | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isMarketType = MARKET_TYPES.includes(form.assetType);

    const fetchAssets = async () => {
        setLoading(true);
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
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssets();
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
                <h2 className={styles.title}>Assets</h2>
                <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
                    + Add Asset
                </button>
            </div>

            {loading ? (
                <p className={styles.loading}>Loading...</p>
            ) : assets.length === 0 ? (
                <p className={styles.empty}>No assets yet. Add stocks, mutual funds, FDs, and more.</p>
            ) : (
                <div className={styles.grid}>
                    {assets.map((asset) => {
                        const returns = asset.currentValue - asset.totalInvested;
                        const returnsPercent = asset.totalInvested > 0
                            ? ((returns / asset.totalInvested) * 100).toFixed(1)
                            : '0';

                        return (
                            <div key={asset._id} className={`glass-card ${styles.card}`}>
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
                            </div>
                        );
                    })}
                </div>
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
                                        Search {form.assetType === 'STOCK' ? 'Stock' : form.assetType === 'MUTUAL_FUND' ? 'Mutual Fund' : form.assetType === 'NPS' ? 'NPS Scheme' : 'SGB'}
                                    </label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder={form.assetType === 'STOCK' ? 'e.g. Reliance, HDFC Bank...' : form.assetType === 'MUTUAL_FUND' ? 'e.g. Parag Parikh, Motilal Oswal...' : form.assetType === 'NPS' ? 'e.g. SBI Pension Fund...' : 'e.g. SGBAUG28...'}
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
                                        <label className="label">Quantity</label>
                                        <input type="number" className="input" placeholder="0" step="any" value={marketForm.quantity} onChange={(e) => setMarketForm({ ...marketForm, quantity: e.target.value })} required />
                                    </div>
                                    <div className={styles.field}>
                                        <label className="label">Price per unit (₹)</label>
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
