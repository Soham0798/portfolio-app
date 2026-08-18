'use client';

import { useState } from 'react';
import styles from './login.module.css';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Login failed');
                return;
            }

            window.location.href = '/dashboard';
        } catch {
            setError('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={`${styles.glow} ${styles.glowA}`}></div>
            <div className={`${styles.glow} ${styles.glowB}`}></div>
            <div className={styles.shell}>
                {/* LEFT: live ledger */}
                <div className={styles.ledger}>
                    <div>
                        <h2 className={styles.headline}>Every position, tracked to <em className={styles.em}>the tick.</em></h2>

                        <div className={styles.tickerRow}>
                            <div className={styles.tick}>
                                <span className={styles.label}>AUM</span>
                                <span className={styles.value}>$482.6M <span className={styles.delta}>▲ 2.4%</span></span>
                            </div>
                            <div className={styles.tick}>
                                <span className={styles.label}>YTD Return</span>
                                <span className={styles.value}>18.9% <span className={styles.delta}>▲</span></span>
                            </div>
                            <div className={styles.tick}>
                                <span className={styles.label}>Positions</span>
                                <span className={styles.value}>128</span>
                            </div>
                        </div>
                    </div>


                </div>

                {/* RIGHT: sign in */}
                <div className={styles.auth}>
                    <h1 className={styles.authTitle}>Sign in</h1>
                    <p className={styles.subhead}>Access your portfolio dashboard.</p>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.field}>
                            <label htmlFor="username" className={styles.fieldLabel}>Username</label>
                            <div className={styles.inputBox}>
                                <input
                                    id="username"
                                    type="text"
                                    placeholder="Username"
                                    autoComplete="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className={styles.input}
                                    required
                                />
                            </div>
                        </div>

                        <div className={styles.field}>
                            <label htmlFor="password" className={styles.fieldLabel}>Password</label>
                            <div className={styles.inputBox}>
                                <input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••••"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={styles.input}
                                    required
                                />
                            </div>
                        </div>

                        {error && <p className={styles.error}>{error}</p>}

                        <div className={styles.rowBetween}>
                            <label className={styles.remember}>
                                <input type="checkbox" className={styles.checkbox} /> Keep me signed in
                            </label>
                        </div>

                        <button type="submit" className={styles.submitBtn} disabled={loading}>
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
