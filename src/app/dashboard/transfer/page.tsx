'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../import/import.module.css';

export default function TransferPage() {
    const router = useRouter();
    const [fromProfile, setFromProfile] = useState('sameer');
    const [toProfile, setToProfile] = useState('soham');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (fromProfile === toProfile) {
            setError('Please select two different profiles');
            return;
        }

        if (!confirm(`Are you sure you want to move ALL data from ${fromProfile} to ${toProfile}?`)) {
            return;
        }

        setLoading(true);
        setResult(null);
        setError('');

        try {
            const res = await fetch('/api/settings/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fromProfile, toProfile }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Transfer failed');
            } else {
                setResult(data);
            }
        } catch {
            setError('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <h2 className={styles.title}>Transfer Data</h2>
            <p className={styles.subtitle}>
                Bulk move all transactions and manual assets from one profile to another.
            </p>

            <div className={`glass-card ${styles.card}`}>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.row}>
                        <div className={styles.field}>
                            <label className="label">From Profile</label>
                            <select className="input" value={fromProfile} onChange={(e) => setFromProfile(e.target.value)}>
                                <option value="sameer">Sameer</option>
                                <option value="snehal">Snehal</option>
                                <option value="soham">Soham</option>
                            </select>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '24px' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c8794" strokeWidth="2">
                                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>

                        <div className={styles.field}>
                            <label className="label">To Profile</label>
                            <select className="input" value={toProfile} onChange={(e) => setToProfile(e.target.value)}>
                                <option value="sameer">Sameer</option>
                                <option value="snehal">Snehal</option>
                                <option value="soham">Soham</option>
                            </select>
                        </div>
                    </div>

                    <button type="submit" className={styles.importBtn} disabled={loading} style={{ width: '100%' }}>
                        {loading ? 'Transferring...' : 'Transfer All Data'}
                    </button>
                </form>
            </div>

            {result && (
                <div className={`glass-card ${styles.results}`}>
                    <h3 className={styles.resultsTitle}>Transfer Complete</h3>
                    <div className={styles.statsRow}>
                        <div className={styles.statBox}>
                            <span className={styles.statNumber}>{result.transactionsMoved}</span>
                            <span className={styles.statLabel}>Transactions Moved</span>
                        </div>
                        <div className={styles.statBox}>
                            <span className={styles.statNumber}>{result.assetsMoved}</span>
                            <span className={styles.statLabel}>Assets Moved</span>
                        </div>
                    </div>
                    <p style={{ marginTop: '16px', color: '#4fb797', textAlign: 'center' }}>
                        Your portfolio dashboard has been updated.
                    </p>
                </div>
            )}

            {error && <p className={styles.errorMsg}>{error}</p>}
        </div>
    );
}
