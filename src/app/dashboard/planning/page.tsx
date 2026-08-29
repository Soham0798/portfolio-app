'use client';

import { useState, useEffect } from 'react';
import { useProfile } from '@/components/ProfileContext';
import styles from './planning.module.css';
import NumberInput from '@/components/NumberInput';

export default function PlanningPage() {
    const { profile } = useProfile();
    const [userProfile, setUserProfile] = useState({ dob: '', monthlyIncome: 0, monthlyExpenses: 0, insuranceCover: 0 });
    const [liabilities, setLiabilities] = useState<any[]>([]);
    const [goals, setGoals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // New item state
    const [newLiability, setNewLiability] = useState({ name: '', type: 'Home', outstanding: '', emi: '', interestRate: '' });
    const [newGoal, setNewGoal] = useState({ name: '', target: '', current: '', timelineYears: '' });
    
    // Edit state
    const [editLiabilityId, setEditLiabilityId] = useState<string | null>(null);
    const [editGoalId, setEditGoalId] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, [profile]);

    async function fetchData() {
        setLoading(true);
        const profileParam = profile === 'combined' ? '' : `?profile=${profile}`;
        
        const [profRes, liabRes, goalRes] = await Promise.all([
            fetch(`/api/profile${profileParam}`),
            fetch(`/api/liabilities${profileParam}`),
            fetch(`/api/goals${profileParam}`)
        ]);

        const profData = await profRes.json();
        const liabData = await liabRes.json();
        const goalData = await goalRes.json();

        const p = profData.profile || {};
        setUserProfile({
            ...p,
            dob: p.dob ? new Date(p.dob).toISOString().split('T')[0] : '',
            monthlyIncome: p.monthlyIncome || 0,
            monthlyExpenses: p.monthlyExpenses || 0,
            insuranceCover: p.insuranceCover || 0
        });
        setLiabilities(liabData.liabilities || []);
        setGoals(goalData.goals || []);
        setLoading(false);
    }

    async function saveProfile() {
        await fetch('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...userProfile, profile: profile === 'combined' ? 'default' : profile })
        });
        alert('Profile saved!');
    }

    async function saveLiability(e: React.FormEvent) {
        e.preventDefault();
        const url = editLiabilityId ? `/api/liabilities/${editLiabilityId}` : '/api/liabilities';
        const method = editLiabilityId ? 'PUT' : 'POST';
        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...newLiability, profile: profile === 'combined' ? 'default' : profile })
        });
        setNewLiability({ name: '', type: 'Home', outstanding: '', emi: '', interestRate: '' });
        setEditLiabilityId(null);
        fetchData();
    }

    async function deleteLiability(id: string) {
        if (!confirm('Are you sure?')) return;
        await fetch(`/api/liabilities/${id}`, { method: 'DELETE' });
        fetchData();
    }

    async function saveGoal(e: React.FormEvent) {
        e.preventDefault();
        const url = editGoalId ? `/api/goals/${editGoalId}` : '/api/goals';
        const method = editGoalId ? 'PUT' : 'POST';
        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...newGoal, profile: profile === 'combined' ? 'default' : profile })
        });
        setNewGoal({ name: '', target: '', current: '', timelineYears: '' });
        setEditGoalId(null);
        fetchData();
    }

    async function deleteGoal(id: string) {
        if (!confirm('Are you sure?')) return;
        await fetch(`/api/goals/${id}`, { method: 'DELETE' });
        fetchData();
    }

    if (loading) return <div className={styles.page}>Loading planning data...</div>;

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.title}>Financial Planning</h1>
            </div>

            {profile !== 'combined' && (
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>
                        About You
                        <button className={styles.btnPrimary} onClick={saveProfile}>Save Profile</button>
                    </div>
                    <div className={styles.grid}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Date of Birth</label>
                            <input type="date" className={styles.input} value={userProfile.dob} onChange={e => setUserProfile({ ...userProfile, dob: e.target.value })} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Monthly Income (₹)</label>
                            <NumberInput className={styles.input} value={userProfile.monthlyIncome} onChange={val => setUserProfile({ ...userProfile, monthlyIncome: val })} step={5000} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Monthly Expenses (₹)</label>
                            <NumberInput className={styles.input} value={userProfile.monthlyExpenses} onChange={val => setUserProfile({ ...userProfile, monthlyExpenses: val })} step={5000} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Term Insurance Cover (₹)</label>
                            <NumberInput className={styles.input} value={userProfile.insuranceCover} onChange={val => setUserProfile({ ...userProfile, insuranceCover: val })} step={100000} />
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.section}>
                <div className={styles.sectionTitle}>Your Liabilities</div>
                
                <form className={styles.grid} onSubmit={saveLiability}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Loan Name</label>
                        <input className={styles.input} placeholder="e.g. SBI Home Loan" required value={newLiability.name} onChange={e => setNewLiability({...newLiability, name: e.target.value})} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Outstanding (₹)</label>
                        <NumberInput className={styles.input} required value={newLiability.outstanding} onChange={val => setNewLiability({...newLiability, outstanding: String(val)})} step={10000} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Monthly EMI (₹)</label>
                        <NumberInput className={styles.input} required value={newLiability.emi} onChange={val => setNewLiability({...newLiability, emi: String(val)})} step={1000} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Interest Rate (%)</label>
                        <NumberInput className={styles.input} step="0.1" required value={newLiability.interestRate} onChange={val => setNewLiability({...newLiability, interestRate: String(val)})} />
                    </div>
                    <div className={styles.formGroup} style={{ justifyContent: 'flex-end', flexDirection: 'row', gap: '8px' }}>
                        {editLiabilityId && (
                            <button type="button" className={styles.btnDanger} style={{ background: 'transparent', border: '1px solid #4a5568' }} onClick={() => {
                                setEditLiabilityId(null);
                                setNewLiability({ name: '', type: 'Home', outstanding: '', emi: '', interestRate: '' });
                            }}>Cancel</button>
                        )}
                        <button type="submit" className={styles.btnSecondary}>{editLiabilityId ? 'Update Liability' : 'Add Liability'}</button>
                    </div>
                </form>

                <div className={styles.list}>
                    {liabilities.map(l => (
                        <div key={l._id} className={styles.listItem}>
                            <div className={styles.itemMain}>
                                <div className={styles.itemName}>{l.name}</div>
                                <div className={styles.itemDesc}>₹{l.outstanding.toLocaleString()} outstanding • EMI: ₹{l.emi.toLocaleString()} • {l.interestRate}%</div>
                            </div>
                            <div className={styles.itemActions} style={{ display: 'flex', gap: '8px' }}>
                                <button className={styles.btnSecondary} style={{ background: 'transparent', border: '1px solid var(--border-subtle)', padding: '6px 12px' }} onClick={() => {
                                    setEditLiabilityId(l._id);
                                    setNewLiability({
                                        name: l.name,
                                        type: l.type || 'Home',
                                        outstanding: String(l.outstanding),
                                        emi: String(l.emi),
                                        interestRate: String(l.interestRate)
                                    });
                                }}>Edit</button>
                                <button className={styles.btnDanger} onClick={() => deleteLiability(l._id)}>Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.section}>
                <div className={styles.sectionTitle}>Financial Goals</div>
                
                <form className={styles.grid} onSubmit={saveGoal}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Goal Name</label>
                        <input className={styles.input} placeholder="e.g. Daughter's Education" required value={newGoal.name} onChange={e => setNewGoal({...newGoal, name: e.target.value})} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Target Amount (₹)</label>
                        <NumberInput className={styles.input} required value={newGoal.target} onChange={val => setNewGoal({...newGoal, target: String(val)})} step={100000} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Current Savings (₹)</label>
                        <NumberInput className={styles.input} required value={newGoal.current} onChange={val => setNewGoal({...newGoal, current: String(val)})} step={10000} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Years Left</label>
                        <NumberInput className={styles.input} required value={newGoal.timelineYears} onChange={val => setNewGoal({...newGoal, timelineYears: String(val)})} step={1} />
                    </div>
                    <div className={styles.formGroup} style={{ justifyContent: 'flex-end', flexDirection: 'row', gap: '8px' }}>
                        {editGoalId && (
                            <button type="button" className={styles.btnDanger} style={{ background: 'transparent', border: '1px solid #4a5568' }} onClick={() => {
                                setEditGoalId(null);
                                setNewGoal({ name: '', target: '', current: '', timelineYears: '' });
                            }}>Cancel</button>
                        )}
                        <button type="submit" className={styles.btnSecondary}>{editGoalId ? 'Update Goal' : 'Add Goal'}</button>
                    </div>
                </form>

                <div className={styles.list}>
                    {goals.map(g => (
                        <div key={g._id} className={styles.listItem}>
                            <div className={styles.itemMain}>
                                <div className={styles.itemName}>{g.name}</div>
                                <div className={styles.itemDesc}>Target: ₹{g.target.toLocaleString()} • Current: ₹{g.current.toLocaleString()} • {g.timelineYears} years left</div>
                            </div>
                            <div className={styles.itemActions} style={{ display: 'flex', gap: '8px' }}>
                                <button className={styles.btnSecondary} style={{ background: 'transparent', border: '1px solid var(--border-subtle)', padding: '6px 12px' }} onClick={() => {
                                    setEditGoalId(g._id);
                                    setNewGoal({
                                        name: g.name,
                                        target: String(g.target),
                                        current: String(g.current),
                                        timelineYears: String(g.timelineYears)
                                    });
                                }}>Edit</button>
                                <button className={styles.btnDanger} onClick={() => deleteGoal(g._id)}>Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
