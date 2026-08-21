'use client';

import { useEffect, useState } from 'react';
import { useProfile } from '@/components/ProfileContext';
import styles from './transactions.module.css';

interface Transaction {
    _id: string;
    profile: string;
    type: string;
    date: string;
    quantity: number;
    price: number;
    fees: number;
    notes: string;
    instrumentId: {
        _id: string;
        name: string;
        tickerSymbol: string;
        assetType: string;
    };
}

interface Instrument {
    _id: string;
    name: string;
    tickerSymbol: string;
    assetType: string;
}

export default function TransactionsPage() {
    const { profile } = useProfile();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [instruments, setInstruments] = useState<Instrument[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [showModal, setShowModal] = useState(false);

    const [form, setForm] = useState({
        profile: 'sameer',
        instrumentId: '',
        type: 'BUY',
        date: new Date().toISOString().split('T')[0],
        quantity: '',
        price: '',
        fees: '0',
        notes: '',
    });

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const profileParam = profile === 'combined' ? '' : `&profile=${profile}`;
            const res = await fetch(`/api/transactions?page=${page}&limit=15${profileParam}`);
            const data = await res.json();
            setTransactions(data.transactions || []);
            setTotalPages(data.pagination?.totalPages || 1);
        } catch (err) {
            console.error('Failed to fetch transactions:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchInstruments = async () => {
        try {
            const res = await fetch('/api/instruments');
            const data = await res.json();
            setInstruments(data.instruments || []);
        } catch (err) {
            console.error('Failed to fetch instruments:', err);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, [profile, page]);

    useEffect(() => {
        fetchInstruments();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    quantity: parseFloat(form.quantity),
                    price: parseFloat(form.price),
                    fees: parseFloat(form.fees),
                }),
            });

            if (res.ok) {
                setShowModal(false);
                setForm({
                    profile: 'sameer',
                    instrumentId: '',
                    type: 'BUY',
                    date: new Date().toISOString().split('T')[0],
                    quantity: '',
                    price: '',
                    fees: '0',
                    notes: '',
                });
                fetchTransactions();
            }
        } catch (err) {
            console.error('Failed to create transaction:', err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this transaction?')) return;
        try {
            await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
            fetchTransactions();
        } catch (err) {
            console.error('Failed to delete:', err);
        }
    };

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

    const formatDate = (d: string) =>
        new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h2 className={styles.title}>Transactions</h2>
                <button className="btn-primary" onClick={() => setShowModal(true)}>
                    + Add Transaction
                </button>
            </div>

            <div className={`glass-card ${styles.tableCard}`}>
                {loading ? (
                    <p className={styles.loading}>Loading...</p>
                ) : transactions.length === 0 ? (
                    <p className={styles.empty}>No transactions yet.</p>
                ) : (
                    <>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th className={styles.hideMobile}>Date</th>
                                    <th className={styles.hideMobile}>Profile</th>
                                    <th>Instrument</th>
                                    <th>Type</th>
                                    <th className={styles.hideMobile}>Qty</th>
                                    <th className={styles.hideMobile}>Price</th>
                                    <th>Total</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((t) => (
                                    <tr key={t._id}>
                                        <td className={styles.hideMobile}>{formatDate(t.date)}</td>
                                        <td className={`${styles.profile} ${styles.hideMobile}`}>{t.profile}</td>
                                        <td>
                                            <div className={styles.instName}>{t.instrumentId?.name || '—'}</div>
                                            <div className={styles.instTicker}>{t.instrumentId?.tickerSymbol || ''}</div>
                                        </td>
                                        <td>
                                            <span className={`${styles.badge} ${styles[`badge${t.type}`]}`}>
                                                {t.type}
                                            </span>
                                        </td>
                                        <td className={styles.hideMobile}>{t.quantity}</td>
                                        <td className={styles.hideMobile}>{formatCurrency(t.price)}</td>
                                        <td>{formatCurrency(t.quantity * t.price)}</td>
                                        <td>
                                            <button className={styles.deleteBtn} onClick={() => handleDelete(t._id)}>
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {totalPages > 1 && (
                            <div className={styles.pagination}>
                                <button
                                    className="btn-secondary"
                                    disabled={page <= 1}
                                    onClick={() => setPage(p => p - 1)}
                                >
                                    ← Prev
                                </button>
                                <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
                                <button
                                    className="btn-secondary"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    Next →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {showModal && (
                <div className={styles.overlay} onClick={() => setShowModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>Add Transaction</h3>
                        <form onSubmit={handleSubmit} className={styles.form}>
                            <div className={styles.row}>
                                <div className={styles.field}>
                                    <label className="label">Profile</label>
                                    <select
                                        className="input"
                                        value={form.profile}
                                        onChange={(e) => setForm({ ...form, profile: e.target.value })}
                                    >
                                        <option value="sameer">Sameer</option>
                                        <option value="snehal">Snehal</option>
                                        <option value="soham">Soham</option>
                                    </select>
                                </div>
                                <div className={styles.field}>
                                    <label className="label">Type</label>
                                    <select
                                        className="input"
                                        value={form.type}
                                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                                    >
                                        <option value="BUY">Buy</option>
                                        <option value="SELL">Sell</option>
                                        <option value="DIVIDEND">Dividend</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.field}>
                                <label className="label">Instrument</label>
                                <select
                                    className="input"
                                    value={form.instrumentId}
                                    onChange={(e) => setForm({ ...form, instrumentId: e.target.value })}
                                    required
                                >
                                    <option value="">Select instrument...</option>
                                    {instruments.map((inst) => (
                                        <option key={inst._id} value={inst._id}>
                                            {inst.name} ({inst.tickerSymbol})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.field}>
                                <label className="label">Date</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={form.date}
                                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                                    required
                                />
                            </div>

                            <div className={styles.row}>
                                <div className={styles.field}>
                                    <label className="label">Quantity</label>
                                    <input
                                        type="number"
                                        className="input"
                                        placeholder="0"
                                        step="any"
                                        value={form.quantity}
                                        onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className={styles.field}>
                                    <label className="label">Price per unit</label>
                                    <input
                                        type="number"
                                        className="input"
                                        placeholder="0.00"
                                        step="any"
                                        value={form.price}
                                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className={styles.row}>
                                <div className={styles.field}>
                                    <label className="label">Fees</label>
                                    <input
                                        type="number"
                                        className="input"
                                        placeholder="0"
                                        step="any"
                                        value={form.fees}
                                        onChange={(e) => setForm({ ...form, fees: e.target.value })}
                                    />
                                </div>
                                <div className={styles.field}>
                                    <label className="label">Notes</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Optional"
                                        value={form.notes}
                                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className={styles.formActions}>
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    Add Transaction
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
