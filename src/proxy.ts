import { NextRequest, NextResponse } from 'next/server';


export function proxy(req: NextRequest) {
    const token = req.cookies.get('portfolio-token')?.value;
    const { pathname } = req.nextUrl;

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

    if (pathname === '/') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
