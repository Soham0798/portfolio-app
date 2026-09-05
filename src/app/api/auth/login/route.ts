import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { setAuthCookie } from '@/lib/auth';

const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10;
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record) {
        rateLimitMap.set(ip, { count: 1, timestamp: now });
        return true;
    }

    if (now - record.timestamp > RATE_LIMIT_WINDOW) {
        rateLimitMap.set(ip, { count: 1, timestamp: now });
        return true;
    }

    if (record.count >= MAX_ATTEMPTS) {
        return false;
    }

    record.count++;
    return true;
}

export async function POST(req: NextRequest) {
    try {
        // Very basic IP extraction. For a production app on a PaaS (like Vercel),
        // you would use the 'x-forwarded-for' header or req.ip.
        const ip = req.headers.get('x-forwarded-for') || req.ip || 'unknown-ip';
        
        if (!checkRateLimit(ip)) {
            return NextResponse.json(
                { error: 'Too many login attempts. Please try again later.' },
                { status: 429 }
            );
        }

        const { username, password } = await req.json();

        if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
            return NextResponse.json(
                { error: 'Username and password are required and must be strings' },
                { status: 400 }
            );
        }

        await dbConnect();

        const user = await User.findOne({ username: username.toLowerCase() });
        if (!user) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        let isValid = false;
        const [salt, storedHash] = user.password.split(':');
        if (salt && storedHash) {
            const hash = crypto.scryptSync(password, salt, 64).toString('hex');
            isValid = (hash === storedHash);
        }
        
        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        await setAuthCookie({
            userId: user._id.toString(),
            username: user.username,
        });

        return NextResponse.json({
            message: 'Login successful',
            user: { id: user._id, username: user.username },
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
