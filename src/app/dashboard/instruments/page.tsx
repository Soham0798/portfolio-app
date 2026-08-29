'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './instruments.module.css';
import layoutStyles from '../layout.module.css';

interface Instrument {
    _id: string;
    tickerSymbol: string;
    name: string;
    assetType: string;
    exchange: string;
    currentPrice: number;
    previousClose: number;
    isActive: boolean;
}

const ASSET_TYPES = ['STOCK', 'MUTUAL_FUND', 'ETF', 'SGB', 'NPS', 'GOLD', 'BOND'];

export default function InstrumentsPage() {
    const [instruments, setInstruments] = useState<Instrument[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    const [filterType, setFilterType] = useState('ALL');

    const [form, setForm] = useState({
        name: '',
        tickerSymbol: '',
        assetType: 'STOCK',
        exchange: 'NSE',
    });

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleSearch = (query: string, assetType: string) => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        searchTimerRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/instruments/search?q=${encodeURIComponent(query)}&type=${assetType}`);
                const data = await res.json();
                setSearchResults(data.results || []);
            } catch {
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    };

    const fetchInstruments = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/instruments?active=false');
            const data = await res.json();
            setInstruments(data.instruments || []);
        } catch (err) {
            console.error('Failed to fetch:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInstruments();
    }, []);

    const resetForm = () => {
        setForm({ name: '', tickerSymbol: '', assetType: 'STOCK', exchange: 'NSE' });
        setEditingId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');

        try {
            const url = editingId ? `/api/instruments/${editingId}` : '/api/instruments';
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });

            if (res.ok) {
                setShowModal(false);
                resetForm();
                setFormSuccess(editingId ? 'Instrument updated!' : 'Instrument added!');
                fetchInstruments();
                setTimeout(() => {
                    setFormSuccess('');
                }, 3000);
            } else {
                const data = await res.json();
                setFormError(data.error || 'Failed to save instrument');
                setTimeout(() => setFormError(''), 3000);
            }
        } catch (err) {
            console.error('Failed:', err);
            setFormError('Something went wrong');
            setTimeout(() => setFormError(''), 3000);
        }
    };

    const handleEdit = (inst: Instrument) => {
        setForm({
            name: inst.name,
            tickerSymbol: inst.tickerSymbol,
            assetType: inst.assetType,
            exchange: inst.exchange,
        });
        setEditingId(inst._id);
        setShowModal(true);
    };

    const handleDelete = (id: string) => {
        setDeleteConfirmId(id);
    };

    const confirmDelete = async () => {
        if (!deleteConfirmId) return;
        try {
            await fetch(`/api/instruments/${deleteConfirmId}`, { method: 'DELETE' });
            fetchInstruments();
        } catch (err) {
            console.error('Failed:', err);
        } finally {
            setDeleteConfirmId(null);
        }
    };

    const filtered = filterType === 'ALL'
        ? instruments
        : instruments.filter(i => i.assetType === filterType);

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

    return (
        <div className={styles.page}>
            {deleteConfirmId && (
                <div className={layoutStyles.modalOverlay} onClick={() => setDeleteConfirmId(null)}>
                    <div className={layoutStyles.modalContent} onClick={e => e.stopPropagation()}>
                        <h3 className={layoutStyles.modalTitle}>Delete Instrument</h3>
                        <p className={layoutStyles.modalDesc}>
                            Are you sure you want to delete this instrument? This action cannot be undone.
                        </p>
                        <div className={layoutStyles.modalActions}>
                            <button className={layoutStyles.modalBtnCancel} onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                            <button className={layoutStyles.modalBtnDanger} onClick={confirmDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.header}>
                <h2 className={styles.title}>Instruments</h2>
                <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
                    + Add Instrument
                </button>
            </div>

            {/* Filter tabs */}
            <div className={styles.filters}>
                <div className="tab-group">
                    {['ALL', ...ASSET_TYPES].map((t) => (
                        <button
                            key={t}
                            className={`tab ${filterType === t ? 'active' : ''}`}
                            onClick={() => setFilterType(t)}
                        >
                            {t === 'ALL' ? 'All' : t.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            <div className={`glass-card ${styles.tableCard}`}>
                {loading ? (
                    <p className={styles.empty}>Loading...</p>
                ) : filtered.length === 0 ? (
                    <p className={styles.empty}>No instruments found. Add one to get started.</p>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Ticker</th>
                                <th>Type</th>
                                <th>Exchange</th>
                                <th>Price</th>
                                <th>Prev Close</th>
                                <th>Day %</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((inst) => {
                                const dayChange = inst.previousClose > 0
                                    ? ((inst.currentPrice - inst.previousClose) / inst.previousClose * 100)
                                    : 0;

                                return (
                                    <tr key={inst._id}>
                                        <td className={styles.instName}>{inst.name}</td>
                                        <td className={styles.ticker}>{inst.tickerSymbol}</td>
                                        <td><span className={styles.typeBadge}>{inst.assetType}</span></td>
                                        <td>{inst.exchange || '—'}</td>
                                        <td>{formatCurrency(inst.currentPrice)}</td>
                                        <td>{formatCurrency(inst.previousClose)}</td>
                                        <td className={dayChange >= 0 ? 'gain' : 'loss'}>
                                            {dayChange >= 0 ? '+' : ''}{dayChange.toFixed(2)}%
                                        </td>
                                        <td>
                                            <div className={styles.actions}>
                                                <button className={styles.editBtn} onClick={() => handleEdit(inst)}>Edit</button>
                                                <button className={styles.deleteBtn} onClick={() => handleDelete(inst._id)}>✕</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <div className={`glass-card ${styles.helpCard}`}>
                <h3 className={styles.helpTitle}>Ticker Symbol Guide</h3>
                <div className={styles.helpGrid}>
                    <div>
                        <h4>Stocks (Yahoo Finance)</h4>
                        <p>Use <code>.NS</code> for NSE, <code>.BO</code> for BSE</p>
                        <p>Example: <code>RELIANCE.NS</code>, <code>TCS.NS</code>, <code>INFY.NS</code></p>
                    </div>
                    <div>
                        <h4>Mutual Funds (AMFI)</h4>
                        <p>Use the AMFI scheme code (numeric)</p>
                        <p>Example: <code>120503</code> (PPFAS Flexi Cap)</p>
                    </div>
                    <div>
                        <h4>NPS</h4>
                        <p>Use scheme code like <code>SM001001</code></p>
                    </div>
                    <div>
                        <h4>Gold / SGB</h4>
                        <p>Gold: <code>GC=F</code> (Yahoo symbol)</p>
                        <p>SGB: <code>SGBSEP28.NS</code></p>
                    </div>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className={styles.overlay} onClick={() => { setShowModal(false); resetForm(); setSearchQuery(''); setSearchResults([]); }}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>{editingId ? 'Edit Instrument' : 'Add Instrument'}</h3>
                        <form onSubmit={handleSubmit} className={styles.form}>

                            <div className={styles.row}>
                                <div className={styles.field}>
                                    <label className="label">Asset Type</label>
                                    <select className="input" value={form.assetType} onChange={(e) => {
                                        setForm({ ...form, assetType: e.target.value, name: '', tickerSymbol: '' });
                                        setSearchQuery('');
                                        setSearchResults([]);
                                    }}>
                                        {ASSET_TYPES.map((t) => (
                                            <option key={t} value={t}>{t.replace('_', ' ')}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.field}>
                                    <label className="label">Exchange</label>
                                    <select className="input" value={form.exchange} onChange={(e) => setForm({ ...form, exchange: e.target.value })}>
                                        <option value="NSE">NSE</option>
                                        <option value="BSE">BSE</option>
                                        <option value="AMFI">AMFI</option>
                                        <option value="NPS">NPS Trust</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                            </div>

                            {/* Search field for STOCK and MUTUAL_FUND */}
                            {(form.assetType === 'STOCK' || form.assetType === 'MUTUAL_FUND') && !editingId && (
                                <div className={styles.field} style={{ position: 'relative' }}>
                                    <label className="label">
                                        Search {form.assetType === 'STOCK' ? 'Stock' : 'Mutual Fund'}
                                    </label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder={form.assetType === 'STOCK' ? 'Type to search stocks... e.g. Reliance' : 'Type to search mutual funds... e.g. PPFAS Flexi'}
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            handleSearch(e.target.value, form.assetType);
                                        }}
                                        autoComplete="off"
                                    />
                                    {isSearching && (
                                        <div className={styles.searchStatus}>Searching...</div>
                                    )}
                                    {searchResults.length > 0 && (
                                        <div className={styles.searchDropdown}>
                                            {searchResults.map((r, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    className={styles.searchItem}
                                                    title={r.name}
                                                    onClick={() => {
                                                        setForm({
                                                            ...form,
                                                            name: r.name,
                                                            tickerSymbol: r.schemeCode || r.symbol,
                                                            exchange: r.type === 'MUTUAL_FUND' ? 'AMFI' : 'NSE',
                                                        });
                                                        setSearchQuery(r.name);
                                                        setSearchResults([]);
                                                    }}
                                                >
                                                    <span className={styles.searchItemName}>{r.name}</span>
                                                    <span className={styles.searchItemTicker}>{r.schemeCode || r.symbol}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className={styles.field}>
                                <label className="label">Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g. Reliance Industries"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className={styles.field}>
                                <label className="label">Ticker Symbol</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder={form.assetType === 'MUTUAL_FUND' ? 'e.g. 120503' : 'e.g. RELIANCE.NS'}
                                    value={form.tickerSymbol}
                                    onChange={(e) => setForm({ ...form, tickerSymbol: e.target.value })}
                                    required
                                />
                            </div>
                            
                                <div className={styles.formActions} style={{ marginTop: '24px' }}>
                                    <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); resetForm(); setSearchQuery(''); setSearchResults([]); }}>Cancel</button>
                                    <button type="submit" className="btn-primary">{editingId ? 'Update' : 'Add Instrument'}</button>
                                </div>
                        </form>
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
