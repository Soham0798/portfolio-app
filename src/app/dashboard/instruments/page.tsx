'use client';

import { useEffect, useState } from 'react';
import styles from './instruments.module.css';

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
    const [filterType, setFilterType] = useState('ALL');

    const [form, setForm] = useState({
        name: '',
        tickerSymbol: '',
        assetType: 'STOCK',
        exchange: 'NSE',
    });

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
                fetchInstruments();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed');
            }
        } catch (err) {
            console.error('Failed:', err);
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

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this instrument?')) return;
        try {
            await fetch(`/api/instruments/${id}`, { method: 'DELETE' });
            fetchInstruments();
        } catch (err) {
            console.error('Failed:', err);
        }
    };

    const filtered = filterType === 'ALL'
        ? instruments
        : instruments.filter(i => i.assetType === filterType);

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

    return (
        <div className={styles.page}>
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
                <div className={styles.overlay} onClick={() => { setShowModal(false); resetForm(); }}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>{editingId ? 'Edit Instrument' : 'Add Instrument'}</h3>
                        <form onSubmit={handleSubmit} className={styles.form}>
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
                                    placeholder="e.g. RELIANCE.NS"
                                    value={form.tickerSymbol}
                                    onChange={(e) => setForm({ ...form, tickerSymbol: e.target.value })}
                                    required
                                />
                            </div>

                            <div className={styles.row}>
                                <div className={styles.field}>
                                    <label className="label">Asset Type</label>
                                    <select className="input" value={form.assetType} onChange={(e) => setForm({ ...form, assetType: e.target.value })}>
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

                            <div className={styles.formActions}>
                                <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                                <button type="submit" className="btn-primary">{editingId ? 'Update' : 'Add'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
