'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './import.module.css';

export default function ImportPage() {
    const [file, setFile] = useState<File | null>(null);
    const [source, setSource] = useState('zerodha');
    const [profile, setProfile] = useState('sameer');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');
    const [successToast, setSuccessToast] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        setResult(null);
        setError('');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('source', source);
            formData.append('profile', profile);

            const apiRoute = source === 'nsdl' ? '/api/import/nsdl' : '/api/import/csv';
            const res = await fetch(apiRoute, {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Import failed');
            } else {
                setResult(data.results);
                setSuccessToast('Import successful!');
                setTimeout(() => setSuccessToast(''), 3000);
            }
        } catch {
            setError('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <h2 className={styles.title}>Import Transactions</h2>
            <p className={styles.subtitle}>
                Upload a CSV tradebook from Zerodha, Groww, or Golden Bulls to bulk-import your transactions.
            </p>

            <div className={`glass-card ${styles.card}`}>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.row}>
                        <div className={styles.field}>
                            <label className="label">Source</label>
                            <select className="input" value={source} onChange={(e) => setSource(e.target.value)}>
                                <option value="zerodha">Zerodha</option>
                                <option value="groww">Groww</option>
                                <option value="goldenbulls">Golden Bulls</option>
                                <option value="nsdl">NSDL (CAS PDF)</option>
                            </select>
                        </div>
                        <div className={styles.field}>
                            <label className="label">Profile</label>
                            <select className="input" value={profile} onChange={(e) => setProfile(e.target.value)}>
                                <option value="sameer">Sameer</option>
                                <option value="snehal">Snehal</option>
                                <option value="soham">Soham</option>
                            </select>
                        </div>
                    </div>

                    <div className={styles.field}>
                        <label className="label">CSV File</label>
                        <div className={styles.fileInput}>
                            <input
                                type="file"
                                accept={source === 'nsdl' ? '.pdf' : '.csv'}
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                required
                            />
                            {file && <p className={styles.fileName}>{file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)</p>}
                        </div>
                    </div>

                    <button type="submit" className={styles.importBtn} disabled={loading || !file} style={{ width: '100%' }}>
                        {loading ? 'Importing...' : 'Import Transactions'}
                    </button>
                </form>
            </div>

            {result && (
                <div className={`glass-card ${styles.results}`}>
                    <h3 className={styles.resultsTitle}>Import Results</h3>
                    <div className={styles.statsRow}>
                        <div className={styles.statBox}>
                            <span className={styles.statNumber}>{result.imported}</span>
                            <span className={styles.statLabel}>Imported</span>
                        </div>
                        <div className={styles.statBox}>
                            <span className={styles.statNumber}>{result.skipped}</span>
                            <span className={styles.statLabel}>Skipped</span>
                        </div>
                        <div className={styles.statBox}>
                            <span className={styles.statNumber}>{result.errors?.length || 0}</span>
                            <span className={styles.statLabel}>Errors</span>
                        </div>
                    </div>

                    {result.errors?.length > 0 && (
                        <div className={styles.errorList}>
                            <h4>Errors:</h4>
                            {result.errors.map((err: string, i: number) => (
                                <p key={i} className={styles.errorItem}>{err}</p>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {error && <p className={styles.errorMsg}>{error}</p>}

            <div className={`glass-card ${styles.instructions}`}>
                <h3 className={styles.instructionsTitle}>How to export your tradebook</h3>

                <div className={styles.instructionBlock}>
                    <h4>Zerodha</h4>
                    <ol className={styles.steps}>
                        <li>Go to <strong>Console → Reports → Tradebook</strong></li>
                        <li>Select date range (max 1 year at a time)</li>
                        <li>Click <strong>Download</strong> (CSV format)</li>
                    </ol>
                </div>

                <div className={styles.instructionBlock}>
                    <h4>Groww</h4>
                    <ol className={styles.steps}>
                        <li>Go to <strong>Dashboard → Investments → Stocks/MF</strong></li>
                        <li>Click <strong>Transaction History → Download</strong></li>
                        <li>Select CSV format</li>
                    </ol>
                </div>

                <div className={styles.instructionBlock}>
                    <h4>Golden Bulls</h4>
                    <ol className={styles.steps}>
                        <li>Download the <strong>Holdings CSV</strong> from your Golden Bulls account</li>
                        <li>The CSV should contain profile sections (e.g. Sameer, Snehal) with columns: Scrip, Balance shares, Average price, etc.</li>
                        <li>Profiles are auto-detected from the CSV — the profile dropdown is ignored for this source</li>
                    </ol>
                </div>

                <div className={styles.instructionBlock}>
                    <h4>NSDL CAS</h4>
                    <ol className={styles.steps}>
                        <li>Check your email for the monthly NSDL Consolidated Account Statement (CAS).</li>
                        <li>Ensure the PDF is <strong>NOT</strong> password protected before uploading (you can print/save as PDF without password).</li>
                        <li>Select <strong>NSDL (CAS PDF)</strong> and choose the profile you want the assets assigned to.</li>
                    </ol>
                </div>
            </div>
            <AnimatePresence>
                {(successToast || error) && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
                        exit={{ opacity: 0, y: 20, scale: 0.9, x: '-50%' }}
                        transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
                        className={styles.toast}
                        style={{
                            background: error ? '#f87171' : '#34d399',
                            color: error ? '#fff' : '#0A0F1C',
                        }}
                    >
                        {error || successToast}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
