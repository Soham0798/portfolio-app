'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ProfileProvider, useProfile } from '@/components/ProfileContext';
import styles from './layout.module.css';

const NAV_ITEMS = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Holdings', path: '/dashboard/holdings' },
    { label: 'Transactions', path: '/dashboard/transactions' },
    { label: 'Manual Assets', path: '/dashboard/manual-assets' },
    { label: 'History', path: '/dashboard/history' },
];

function DashboardShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { profile, setProfile } = useProfile();

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/auth/login');
    };

    return (
        <div className={styles.container}>
            <aside className={styles.sidebar}>
                <div className={styles.logo}>
                    <span className={styles.logoText}>Portfolio</span>
                </div>

                <nav className={styles.nav}>
                    {NAV_ITEMS.map((item) => (
                        <button
                            key={item.path}
                            className={`${styles.navItem} ${pathname === item.path ? styles.navItemActive : ''}`}
                            onClick={() => router.push(item.path)}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>

                <button className={styles.logoutBtn} onClick={handleLogout}>
                    Logout
                </button>
            </aside>

            <main className={styles.main}>
                <header className={styles.topBar}>
                    <div className="tab-group">
                        {(['sameer', 'snehal', 'combined'] as const).map((p) => (
                            <button
                                key={p}
                                className={`tab ${profile === p ? 'active' : ''}`}
                                onClick={() => setProfile(p)}
                            >
                                {p.charAt(0).toUpperCase() + p.slice(1)}
                            </button>
                        ))}
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
