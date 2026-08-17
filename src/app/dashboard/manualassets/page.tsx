'use client';

import { useEffect, useState } from 'react';
import { useProfile } from '@/components/ProfileContext';
import styles from './manualassets.module.css';

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
}

export default function ManualAssetsPage() {
    const { profile } = useProfile();
    const [assets, setAssets] = useState<ManualAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [form, setForm] = useState({
        profile: 'sameer',
        assetType: 'FD',
        name: '',
        currentValue: '',
        totalInvested: '',
        interestRate: '',
        maturityDate: '',
    });

    const fetchAssets = async () => {
        setLoading(true);
        try {
            const profileParam = profile === 'combined' ? '' : `?profile=${profile}`;
            const res = await fetch(`/api/manualassets${profileParam}`);
            const data = await res.json();
            setAssets(data.assets || []);
        } catch (err) {
            console.error('Failed to fetch assets:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssets();
    }, [profile]);

    const resetForm = () => {
        setForm({
            profile: 'sameer',
            assetType: 'FD',
            name: '',
            currentValue: '',
            totalInvested: '',
            interestRate: '',
            maturityDate: '',
        });
        setEditingId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
                fetchAssets();
            }
        } catch (err) {
            console.error('Failed to save asset:', err);
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

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this asset?')) return;
        try {
            await fetch(`/api/manualassets/${id}`, { method: 'DELETE' });
            fetchAssets();
        } catch (err) {
            console.error('Failed to delete:', err);
        }
    };

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h2 className={styles.title}>Manual Assets</h2>
                <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
                    + Add Asset
                </button>
            </div>

            {loading ? (
                <p className={styles.loading}>Loading...</p>
            ) : assets.length === 0 ? (
                <p className={styles.empty}>No manual assets yet. Add FDs, EPF, PPF, or ULIP entries.</p>
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
                                    <button className="btn-secondary" onClick={() => handleEdit(asset)}>
                                        Edit
                                    </button>
                                    <button className={styles.deleteBtn} onClick={() => handleDelete(asset._id)}>
                                        Delete
                                    </button>
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
                        <form onSubmit={handleSubmit} className={styles.form}>
                            <div className={styles.row}>
                                <div className={styles.field}>
                                    <label className="label">Profile</label>
                                    <select className="input" value={form.profile} onChange={(e) => setForm({ ...form, profile: e.target.value })}>
                                        <option value="sameer">Sameer</option>
                                        <option value="snehal">Snehal</option>
                                    </select>
                                </div>
                                <div className={styles.field}>
                                    <label className="label">Type</label>
                                    <select className="input" value={form.assetType} onChange={(e) => setForm({ ...form, assetType: e.target.value })}>
                                        <option value="FD">Fixed Deposit</option>
                                        <option value="EPF">EPF</option>
                                        <option value="PPF">PPF</option>
                                        <option value="ULIP">ULIP</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
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

                            <div className={styles.formActions}>
                                <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                                <button type="submit" className="btn-primary">{editingId ? 'Update' : 'Add Asset'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
