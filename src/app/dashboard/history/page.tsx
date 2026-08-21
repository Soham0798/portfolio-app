'use client';

import { useEffect, useState } from 'react';
import { useProfile } from '@/components/ProfileContext';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import styles from './history.module.css';

interface Snapshot {
    dateString: string;
    totalValue: number;
    totalInvested: number;
    dayGain: number;
    byProfile: {
        sameer: { totalValue: number; dayGain: number };
        snehal: { totalValue: number; dayGain: number };
        soham: { totalValue: number; dayGain: number };
    };
}

export default function HistoryPage() {
    const { profile } = useProfile();
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState('3M');

    const fetchSnapshots = async () => {
        setLoading(true);
        try {
            const now = new Date();
            let from = '';
            switch (range) {
                case '1M': from = new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0]; break;
                case '3M': from = new Date(now.setMonth(now.getMonth() - 3)).toISOString().split('T')[0]; break;
                case '6M': from = new Date(now.setMonth(now.getMonth() - 6)).toISOString().split('T')[0]; break;
                case '1Y': from = new Date(now.setFullYear(now.getFullYear() - 1)).toISOString().split('T')[0]; break;
                case 'ALL': from = ''; break;
            }

            const params = from ? `?from=${from}` : '';
            const res = await fetch(`/api/snapshots${params}`);
            const data = await res.json();
            setSnapshots(data.snapshots || []);
        } catch (err) {
            console.error('Failed to fetch snapshots:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSnapshots();
    }, [range]);

    const chartData = snapshots.map((s) => {
        if (profile === 'sameer') {
            return { date: s.dateString, value: s.byProfile?.sameer?.totalValue || 0 };
        }
        if (profile === 'snehal') {
            return { date: s.dateString, value: s.byProfile?.snehal?.totalValue || 0 };
        }
        if (profile === 'soham') {
            return { date: s.dateString, value: s.byProfile?.soham?.totalValue || 0 };
        }
        return { date: s.dateString, value: s.totalValue };
    });

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

    const startValue = chartData.length > 0 ? chartData[0].value : 0;
    const endValue = chartData.length > 0 ? chartData[chartData.length - 1].value : 0;
    const periodReturn = endValue - startValue;
    const periodReturnPercent = startValue > 0 ? ((periodReturn / startValue) * 100).toFixed(2) : '0';

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h2 className={styles.title}>Portfolio History</h2>
                <div className="tab-group">
                    {['1M', '3M', '6M', '1Y', 'ALL'].map((r) => (
                        <button
                            key={r}
                            className={`tab ${range === r ? 'active' : ''}`}
                            onClick={() => setRange(r)}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            {chartData.length > 0 && (
                <div className={`glass-card ${styles.summary}`}>
                    <div>
                        <p className={styles.summaryLabel}>Current Value</p>
                        <p className={styles.summaryValue}>{formatCurrency(endValue)}</p>
                    </div>
                    <div>
                        <p className={styles.summaryLabel}>Period Return ({range})</p>
                        <p className={`${styles.summaryValue} ${periodReturn >= 0 ? 'gain' : 'loss'}`}>
                            {formatCurrency(periodReturn)} ({periodReturnPercent}%)
                        </p>
                    </div>
                </div>
            )}

            <div className={`glass-card ${styles.chartCard}`}>
                {loading ? (
                    <p className={styles.loading}>Loading chart...</p>
                ) : chartData.length === 0 ? (
                    <p className={styles.empty}>No snapshot data yet. Snapshots are generated daily by the cron job.</p>
                ) : (
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis
                                dataKey="date"
                                tick={{ fill: '#555570', fontSize: 11 }}
                                tickLine={false}
                                axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                                tickFormatter={(d: string) => {
                                    const date = new Date(d);
                                    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                                }}
                            />
                            <YAxis
                                tick={{ fill: '#555570', fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v: number) => `₹${(v / 100000).toFixed(1)}L`}
                                width={60}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: '#111118',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: '#f0f0f5',
                                    fontSize: '13px',
                                }}
                                formatter={(value) => [typeof value === 'number' ? formatCurrency(value) : String(value ?? ''), 'Value']}
                                labelFormatter={(label) => new Date(String(label)).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                            />
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#60a5fa"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4, fill: '#60a5fa' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>

            {snapshots.length > 0 && (
                <div className={`glass-card ${styles.tableCard}`}>
                    <h3 className={styles.sectionTitle}>Daily Snapshots</h3>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Total Value</th>
                                <th>Day Change</th>
                                <th>Sameer</th>
                                <th>Snehal</th>
                                <th>Soham</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...snapshots].reverse().slice(0, 30).map((s) => (
                                <tr key={s.dateString}>
                                    <td>{new Date(s.dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                                    <td>{formatCurrency(s.totalValue)}</td>
                                    <td className={s.dayGain >= 0 ? 'gain' : 'loss'}>
                                        {s.dayGain >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(s.dayGain))}
                                    </td>
                                    <td>{formatCurrency(s.byProfile?.sameer?.totalValue || 0)}</td>
                                    <td>{formatCurrency(s.byProfile?.snehal?.totalValue || 0)}</td>
                                    <td>{formatCurrency(s.byProfile?.soham?.totalValue || 0)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
