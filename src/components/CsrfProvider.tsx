'use client';
import { useEffect } from 'react';

export function CsrfProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        const originalFetch = window.fetch;
        window.fetch = async function (resource: RequestInfo | URL, config?: RequestInit) {
            if (typeof resource === 'string' && resource.startsWith('/api/')) {
                config = config || {};
                config.headers = {
                    ...config.headers,
                    'x-portfolio-action': '1'
                };
            }
            return originalFetch.call(this, resource, config);
        };
    }, []);

    return <>{children}</>;
}
