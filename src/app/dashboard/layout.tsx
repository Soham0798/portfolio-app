'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ProfileProvider, useProfile } from '@/components/ProfileContext';
import styles from './layout.module.css';

const NAV_GROUPS = [
    {
        label: 'Overview',
        items: [
            {
                label: 'Dashboard',
                path: '/dashboard',
                kbd: '⌘1',
                icon: (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                        <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" />
                        <rect x="8.5" y="1.5" width="6" height="6" rx="1.2" />
                        <rect x="1.5" y="8.5" width="6" height="6" rx="1.2" />
                        <rect x="8.5" y="8.5" width="6" height="6" rx="1.2" />
                    </svg>
                )
            },
            {
                label: 'Holdings',
                path: '/dashboard/holdings',
                kbd: '⌘2',
                icon: (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                        <path d="M1.5 12.5V3.5C1.5 2.9 2 2.5 2.5 2.5H13.5C14 2.5 14.5 2.9 14.5 3.5V12.5" strokeLinecap="round" />
                        <path d="M1.5 12.5H14.5" strokeLinecap="round" />
                        <path d="M4 9.5L6.5 7L8.5 8.5L12 5" strokeLinecap="round" strokeLinejoin="round" />
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
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                        <path d="M3 5.5H13M13 5.5L10.5 3M13 5.5L10.5 8" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M13 10.5H3M3 10.5L5.5 8M3 10.5L5.5 13" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )
            },
            {
                label: 'History',
                path: '/dashboard/history',
                icon: (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                        <circle cx="8" cy="8" r="6.2" />
                        <path d="M8 4.8V8L10.2 9.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )
            }
        ]
    },
    {
        label: 'Data',
        items: [
            {
                label: 'Manual Assets',
                path: '/dashboard/manualassets',
                icon: (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                        <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
                        <path d="M8 6.2V10.2M6 8.2H10" strokeLinecap="round" />
                    </svg>
                )
            },
            {
                label: 'Instruments',
                path: '/dashboard/instruments',
                icon: (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                        <path d="M4 3V13M4 5.5H8.5C9.5 5.5 9.5 3 8.5 3H4" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M4 9H10C11 9 11 11.5 10 11.5H4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )
            },
            {
                label: 'Import',
                path: '/dashboard/import',
                icon: (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                        <path d="M8 2V10.5M8 10.5L5 7.5M8 10.5L11 7.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M2.5 12.5V13C2.5 13.55 2.95 14 3.5 14H12.5C13.05 14 13.5 13.55 13.5 13V12.5" strokeLinecap="round" />
                    </svg>
                )
            },
            {
                label: 'Transfer Data',
                path: '/dashboard/transfer',
                icon: (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                        <path d="M4 6H12M12 6L9.5 3.5M12 6L9.5 8.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 10H4M4 10L6.5 7.5M4 10L6.5 12.5" strokeLinecap="round" strokeLinejoin="round" />
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

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/auth/login');
    };

    const handleClearData = async () => {
        if (!confirm('WARNING: This will permanently delete ALL your transactions and manual assets! Are you sure?')) {
            return;
        }
        try {
            const res = await fetch('/api/settings/clear-data', { method: 'DELETE' });
            if (res.ok) {
                alert('Data cleared successfully!');
                window.location.reload();
            } else {
                alert('Failed to clear data');
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className={styles.container}>
            <aside className={styles.sidebar}>
                <div className={styles.brand}>
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                        <rect x="1" y="1" width="20" height="20" rx="5" stroke="#60a5fa" strokeWidth="1.4" />
                        <path d="M5.5 14L9 9.5L12 12L16.5 6.5" stroke="#60a5fa" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>Portfolio</span>
                </div>

                <nav className={styles.nav}>
                    {NAV_GROUPS.map((group) => (
                        <div key={group.label} className={styles.group}>
                            <div className={styles.groupLabel}>{group.label}</div>
                            {group.items.map((item) => (
                                <button
                                    key={item.path}
                                    className={`${styles.item} ${pathname === item.path ? styles.active : ''}`}
                                    onClick={() => router.push(item.path)}
                                >
                                    {item.icon}
                                    {item.label}
                                    {'kbd' in item && (item as any).kbd && <span className={styles.kbd}>{(item as any).kbd}</span>}
                                </button>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className={styles.sidebarFoot}>
                    <div className={styles.account}>
                        <div className={styles.avatar}>SA</div>
                        <div className={styles.accountInfo}>
                            <span className={styles.accountName}>Sameer</span>
                            <span className={styles.accountEmail}>sameer@portfolio.co</span>
                        </div>
                        <svg className={styles.chev} width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
                            <path d="M4 5.5L7 8.5L10 5.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>

                    <div className={styles.dangerRow}>
                        <button className={styles.clearData} onClick={handleClearData}>
                            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3">
                                <path d="M2.5 3.5H10.5M5 3.5V2.3C5 2 5.3 1.7 5.6 1.7H7.4C7.7 1.7 8 2 8 2.3V3.5M9.5 3.5V10.5C9.5 11 9.1 11.5 8.5 11.5H4.5C3.9 11.5 3.5 11 3.5 10.5V3.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Clear all data
                        </button>
                    </div>

                    <button className={styles.logout} onClick={handleLogout}>
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
                            <path d="M6 2.5H3C2.4 2.5 2 2.9 2 3.5V11.5C2 12.1 2.4 12.5 3 12.5H6" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M9.5 5L12.5 7.5L9.5 10" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M12.5 7.5H6" strokeLinecap="round" />
                        </svg>
                        Logout
                    </button>
                </div>
            </aside>

            <main className={styles.main}>
                <header className={styles.topBar}>
                    <div className="tab-group" style={{ marginBottom: '16px' }}>
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
                </header>

                <div className={styles.content}>
                    {children}
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
