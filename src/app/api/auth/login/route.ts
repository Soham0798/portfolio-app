import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { setAuthCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const { username, password } = await req.json();

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username and password are required' },
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
        try {
            const [salt, storedHash] = user.password.split(':');
            if (salt && storedHash) {
                const hash = crypto.scryptSync(password, salt, 64).toString('hex');
                // Use timingSafeEqual to prevent timing attacks, must pad to same length just in case
                if (hash.length === storedHash.length) {
                    isValid = crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
                }
            }
        } catch (e) {
            isValid = false;
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
