import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';


export async function proxy(req: NextRequest) {
    const token = req.cookies.get('portfolio-token')?.value;
    const { pathname } = req.nextUrl;
    const method = req.method;

    // CSRF protection for mutations
    if (pathname.startsWith('/api/') && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        // Only require for non-public paths
        const publicPaths = ['/api/auth/login', '/api/cron'];
        if (!publicPaths.some(path => pathname.startsWith(path))) {
            const hasCsrfHeader = req.headers.has('x-portfolio-action');
            if (!hasCsrfHeader) {
                return NextResponse.json({ error: 'Missing CSRF header' }, { status: 403 });
            }
        }
    }

    const publicPaths = ['/auth/login', '/api/auth/login', '/api/cron'];
    if (publicPaths.some(path => pathname.startsWith(path))) {
        return NextResponse.next();
    }

    if (!token) {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/auth/login', req.url));
    }

    try {
        const secretKey = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'dev-jwt-secret-key-change-in-production' : '');
        if (!secretKey) throw new Error('JWT_SECRET missing');
        const secret = new TextEncoder().encode(secretKey);
        await jwtVerify(token, secret);
    } catch (err) {
        // Invalid or expired token
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/auth/login', req.url));
    }

    if (pathname === '/') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
