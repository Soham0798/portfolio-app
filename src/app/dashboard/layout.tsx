'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProfileProvider, useProfile } from '@/components/ProfileContext';
import Select from '@/components/Select';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '@/components/ThemeToggle';
import styles from './layout.module.css';

const NAV_GROUPS = [
    {
        label: 'Overview',
        items: [
            {
                label: 'Dashboard',
                path: '/dashboard',
                icon: (
                    <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" rx="1.5" />
                        <rect x="14" y="3" width="7" height="7" rx="1.5" />
                        <rect x="3" y="14" width="7" height="7" rx="1.5" />
                        <rect x="14" y="14" width="7" height="7" rx="1.5" />
                    </svg>
                )
            },
            {
                label: 'Holdings',
                path: '/dashboard/holdings',
                icon: (
                    <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2" />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                )
            }
        ]
    },
    {
        label: 'Activity',
        items: [
            {
                label: 'Transactions',
                path: '/dashboard/transactions',
                icon: (
                    <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="17 1 21 5 17 9" />
                        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                        <polyline points="7 23 3 19 7 15" />
                        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                    </svg>
                )
            },
            {
                label: 'History',
                path: '/dashboard/history',
                icon: (
                    <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                    </svg>
                )
            }
        ]
    },
    {
        label: 'Data',
        items: [
            {
                label: 'Assets',
                path: '/dashboard/manualassets',
                icon: (
                    <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                )
            },
            {
                label: 'Instruments',
                path: '/dashboard/instruments',
                icon: (
                    <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                    </svg>
                )
            },
            {
                label: 'Import',
                path: '/dashboard/import',
                icon: (
                    <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                )
            },
            {
                label: 'Transfer Data',
                path: '/dashboard/transfer',
                icon: (
                    <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 9l5 5 5-5" />
                        <path d="M12 4v10" />
                        <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                    </svg>
                )
            }
        ]
    }
];

function DashboardShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { profile, setProfile } = useProfile();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
    const [clearModalOpen, setClearModalOpen] = useState(false);
    const [clearProfileInput, setClearProfileInput] = useState('');
    const [clearError, setClearError] = useState('');

    const handleLogout = async () => {
        setAccountDropdownOpen(false);
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/auth/login');
    };

    const handleClearData = async () => {
        setAccountDropdownOpen(false);
        setClearProfileInput('');
        setClearError('');
        setClearModalOpen(true);
    };

    const handleClearDataConfirm = async () => {
        const c = clearProfileInput.toLowerCase().trim();
        const validProfiles = ['sameer', 'snehal', 'soham', 'all', 'combined'];

        if (!validProfiles.includes(c)) {
            setClearError('Invalid choice. Must be sameer, snehal, soham, or all.');
            return;
        }

        const profileToDelete = c;

        try {
            const res = await fetch(`/api/settings/clear-data?profile=${profileToDelete}`, { method: 'DELETE' });
            if (res.ok) {
                setClearModalOpen(false);
                setClearProfileInput('');
                window.location.reload();
            } else {
                setClearError('Failed to clear data');
            }
        } catch (err) {
            console.error(err);
            setClearError('An error occurred while clearing data');
        }
    };

    return (
        <div className={styles.container}>
            {/* Mobile overlay */}
            {mobileOpen && <div className={styles.mobileOverlay} onClick={() => setMobileOpen(false)} />}

            {/* Clear Data Modal */}
            {clearModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setClearModalOpen(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>Clear Profile Data</h3>
                        <p className={styles.modalDesc}>
                            Type <strong>all</strong> to delete data for ALL profiles, or type a specific profile name (<strong>sameer</strong>, <strong>snehal</strong>, <strong>soham</strong>) to delete only that profile's data. This action is permanent.
                        </p>

                        <input
                            type="text"
                            className={styles.modalInput}
                            placeholder="Type profile name or 'all'"
                            value={clearProfileInput}
                            onChange={e => {
                                setClearProfileInput(e.target.value);
                                setClearError('');
                            }}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleClearDataConfirm();
                            }}
                            autoFocus
                        />

                        {clearError && <div style={{ color: '#fca5a5', fontSize: '13px', marginBottom: '16px', marginTop: '-12px' }}>{clearError}</div>}

                        <div className={styles.modalActions}>
                            <button className={styles.modalBtnCancel} onClick={() => setClearModalOpen(false)}>Cancel</button>
                            <button className={styles.modalBtnDanger} onClick={handleClearDataConfirm}>Delete Data</button>
                        </div>
                    </div>
                </div>
            )}

            <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
                <div className={styles.brand}>
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                        <rect x="1" y="1" width="20" height="20" rx="5" stroke="#60a5fa" strokeWidth="1.4" />
                        <path d="M5.5 14L9 9.5L12 12L16.5 6.5" stroke="#60a5fa" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>Portfolio</span>
                </div>

                <nav className={styles.nav}>
                    {NAV_GROUPS.map((group, index) => (
                        <div key={group.label} className={styles.groupContainer}>
                            <div className={styles.group}>
                                <div className={styles.groupLabel}>{group.label}</div>
                                <div className={styles.navList}>
                                    {group.items.map((item) => (
                                        <button
                                            key={item.path}
                                            className={`${styles.item} ${pathname === item.path ? styles.active : ''}`}
                                            onClick={() => { router.push(item.path); setMobileOpen(false); }}
                                        >
                                            {pathname === item.path && (
                                                <motion.div
                                                    layoutId="nav-active-pill"
                                                    className={styles.activePill}
                                                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                                />
                                            )}
                                            <span className={styles.icon} style={{ position: 'relative', zIndex: 1 }}>{item.icon}</span>
                                            <span className={styles.label} style={{ position: 'relative', zIndex: 1 }}>{item.label}</span>
                                            {'kbd' in item && (item as any).kbd && <span className={styles.kbd} style={{ position: 'relative', zIndex: 1 }}>{(item as any).kbd}</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {index < NAV_GROUPS.length - 1 && <hr className={styles.divider} />}
                        </div>
                    ))}
                </nav>

                <div className={styles.sidebarFoot} style={{ position: 'relative' }}>
                    <div
                        className={styles.account}
                        onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                        style={{ cursor: 'pointer' }}
                    >
                        <div className={styles.avatar}>SA</div>
                        <div className={styles.accountInfo}>
                            <span className={styles.accountName}>Sameer</span>
                            <span className={styles.accountEmail}>sameer@portfolio.co</span>
                        </div>
                        <svg className={styles.chev} style={{ transform: accountDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
                            <path d="M4 5.5L7 8.5L10 5.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>

                    <AnimatePresence>
                        {accountDropdownOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                                style={{
                                    position: 'absolute',
                                    bottom: '100%',
                                    left: '12px',
                                    right: '12px',
                                    marginBottom: '8px',
                                    background: 'var(--surface-raised)',
                                    border: '1px solid var(--hairline)',
                                    borderRadius: '12px',
                                    padding: '8px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                    zIndex: 100
                                }}
                            >
                                <Link href="/dashboard/planning" className={styles.menuItem} onClick={() => setAccountDropdownOpen(false)}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                                    Profile settings
                                </Link>

                                <button className={styles.clearData} onClick={handleClearData} style={{ margin: 0 }}>
                                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3">
                                        <path d="M2.5 3.5H10.5M5 3.5V2.3C5 2 5.3 1.7 5.6 1.7H7.4C7.7 1.7 8 2 8 2.3V3.5M9.5 3.5V10.5C9.5 11 9.1 11.5 8.5 11.5H4.5C3.9 11.5 3.5 11 3.5 10.5V3.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Clear all data
                                </button>

                                <button className={styles.logout} onClick={handleLogout} style={{ margin: 0 }}>
                                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
                                        <path d="M6 2.5H3C2.4 2.5 2 2.9 2 3.5V11.5C2 12.1 2.4 12.5 3 12.5H6" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M9.5 5L12.5 7.5L9.5 10" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M12.5 7.5H6" strokeLinecap="round" />
                                    </svg>
                                    Logout
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </aside>

            <main className={styles.main}>
                <header className={styles.topBar}>
                    {/* Mobile hamburger */}
                    <button className={styles.hamburger} onClick={() => setMobileOpen(true)} aria-label="Open menu">
                        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6">
                            <path d="M4 6h14M4 11h14M4 16h14" strokeLinecap="round" />
                        </svg>
                    </button>

                    <div className={styles.profileSwitcher} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div className={`tab-group hide-on-mobile`}>
                            {(['sameer', 'snehal', 'soham', 'combined'] as const).map((p) => {
                                let dotStyle = {};
                                if (p === 'sameer') dotStyle = { background: '#5b8fe0' };
                                else if (p === 'snehal') dotStyle = { background: '#9b82e3' };
                                else if (p === 'soham') dotStyle = { background: '#4fb797' };
                                else dotStyle = { background: 'linear-gradient(90deg, #5b8fe0, #9b82e3, #4fb797)' };

                                return (
                                    <button
                                        key={p}
                                        className={`tab ${profile === p ? 'active' : ''}`}
                                        onClick={() => setProfile(p)}
                                    >
                                        <span className="pdot" style={dotStyle}></span>
                                        {p.charAt(0).toUpperCase() + p.slice(1)}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="hide-on-desktop" style={{ width: '150px' }}>
                            <Select
                                value={profile}
                                onChange={(value) => setProfile(value as any)}
                                options={[
                                    { value: 'sameer', label: 'Sameer' },
                                    { value: 'snehal', label: 'Snehal' },
                                    { value: 'soham', label: 'Soham' },
                                    { value: 'combined', label: 'Combined' }
                                ]}
                            />
                        </div>
                        <ThemeToggle />
                    </div>
                </header>

                <div className={styles.content}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={pathname}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <ProfileProvider>
            <DashboardShell>{children}</DashboardShell>
        </ProfileProvider>
    );
}
