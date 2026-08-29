'use client';

import { useEffect, useState, useRef } from 'react';
import { useProfile } from '@/components/ProfileContext';
import styles from './transactions.module.css';
import layoutStyles from '../layout.module.css';
import Select from '@/components/Select';

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
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    const [instSearch, setInstSearch] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const filteredInstruments = instruments.filter(i =>
        i.name.toLowerCase().includes(instSearch.toLowerCase()) ||
        i.tickerSymbol.toLowerCase().includes(instSearch.toLowerCase())
    ).slice(0, 50);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');

        if (!form.instrumentId) {
            setFormError('Please select an instrument.');
            return;
        }

        try {
            const url = editingId ? `/api/transactions/${editingId}` : '/api/transactions';
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    quantity: parseFloat(form.quantity),
                    price: parseFloat(form.price),
                    fees: parseFloat(form.fees),
                }),
            });

            if (res.ok) {
                setFormSuccess(editingId ? 'Transaction updated!' : 'Transaction added!');
                setTimeout(() => {
                    setShowModal(false);
                    setEditingId(null);
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
                    setInstSearch('');
                    fetchTransactions();
                    setFormSuccess('');
                }, 1000);
            } else {
                const data = await res.json();
                setFormError(data.error || 'Failed to save transaction');
            }
        } catch (err) {
            console.error('Failed to create transaction:', err);
            setFormError('Something went wrong');
        }
    };

    const handleEdit = (t: Transaction) => {
        setForm({
            profile: t.profile,
            instrumentId: t.instrumentId?._id || '',
            type: t.type,
            date: new Date(t.date).toISOString().split('T')[0],
            quantity: String(t.quantity),
            price: String(t.price),
            fees: String(t.fees || 0),
            notes: t.notes || '',
        });
        setInstSearch(t.instrumentId ? `${t.instrumentId.name} (${t.instrumentId.tickerSymbol})` : '');
        setEditingId(t._id);
        setShowModal(true);
    };

    const handleDelete = (id: string) => {
        setDeleteConfirmId(id);
    };

    const confirmDelete = async () => {
        if (!deleteConfirmId) return;
        try {
            await fetch(`/api/transactions/${deleteConfirmId}`, { method: 'DELETE' });
            fetchTransactions();
        } catch (err) {
            console.error('Failed to delete:', err);
        } finally {
            setDeleteConfirmId(null);
        }
    };

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

    const formatDate = (d: string) =>
        new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    return (
        <div className={styles.page}>
            {deleteConfirmId && (
                <div className={layoutStyles.modalOverlay} onClick={() => setDeleteConfirmId(null)}>
                    <div className={layoutStyles.modalContent} onClick={e => e.stopPropagation()}>
                        <h3 className={layoutStyles.modalTitle}>Delete Transaction</h3>
                        <p className={layoutStyles.modalDesc}>
                            Are you sure you want to delete this transaction? This action cannot be undone.
                        </p>
                        <div className={layoutStyles.modalActions}>
                            <button className={layoutStyles.modalBtnCancel} onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                            <button className={layoutStyles.modalBtnDanger} onClick={confirmDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.header}>
                <h2 className={styles.title}>Transactions</h2>
                <button className="btn-primary" onClick={() => {
                    setEditingId(null);
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
                    setInstSearch('');
                    setShowModal(true);
                }}>
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
                                        <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                                            <button className={styles.deleteBtn} style={{ marginRight: '8px', color: 'var(--periwinkle)' }} onClick={() => handleEdit(t)}>
                                                ✎
                                            </button>
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
                <div className={styles.overlay} onClick={() => { setShowModal(false); setEditingId(null); setInstSearch(''); }}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>{editingId ? 'Edit Transaction' : 'Add Transaction'}</h3>
                        <form onSubmit={handleSubmit} className={styles.form}>
                            <div className={styles.row}>
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

                            <div className={styles.field} ref={searchRef} style={{ position: 'relative' }}>
                                <label className="label">Instrument</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Search instrument..."
                                    value={instSearch}
                                    onChange={(e) => {
                                        setInstSearch(e.target.value);
                                        setShowDropdown(true);
                                        if (e.target.value === '') {
                                            setForm({ ...form, instrumentId: '' });
                                        }
                                    }}
                                    onFocus={() => setShowDropdown(true)}
                                    autoComplete="off"
                                    required
                                />
                                {showDropdown && (
                                    <div className={styles.dropdown}>
                                        {filteredInstruments.length > 0 ? (
                                            filteredInstruments.map((inst) => (
                                                <button
                                                    key={inst._id}
                                                    type="button"
                                                    className={styles.dropdownItem}
                                                    onClick={() => {
                                                        setForm({ ...form, instrumentId: inst._id });
                                                        setInstSearch(`${inst.name} (${inst.tickerSymbol})`);
                                                        setShowDropdown(false);
                                                    }}
                                                >
                                                    <span className={styles.dropdownName}>{inst.name}</span>
                                                    <span className={styles.dropdownTicker}>{inst.tickerSymbol}</span>
                                                </button>
                                            ))
                                        ) : (
                                            <div className={styles.dropdownEmpty}>No instruments found</div>
                                        )}
                                    </div>
                                )}
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
                                    <input type="text" className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                                </div>
                            </div>

                            {formError && <div style={{ color: '#fca5a5', fontSize: '13px', marginTop: '16px' }}>{formError}</div>}
                            {formSuccess && <div style={{ color: '#34d399', fontSize: '13px', marginTop: '16px' }}>{formSuccess}</div>}

                            <div className={styles.formActions} style={{ marginTop: '24px' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">{editingId ? 'Update' : 'Add'} Transaction</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
