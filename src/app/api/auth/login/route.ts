import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { setAuthCookie } from '@/lib/auth';


export async function POST(req: NextRequest) {
    try {


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

        if (user.lockoutUntil && user.lockoutUntil > new Date()) {
            return NextResponse.json(
                { error: 'Account locked due to too many failed attempts. Try again in 15 minutes.' },
                { status: 429 }
            );
        }

        let isValid = false;
        const [salt, storedHash] = user.password.split(':');
        if (salt && storedHash) {
            const hash = crypto.scryptSync(password, salt, 64).toString('hex');
            isValid = (hash === storedHash);
        }
        
        if (!isValid) {
            user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
            if (user.failedLoginAttempts >= 5) {
                user.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lockout
            }
            await user.save();

            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Reset lockout if successful
        let needsSave = false;
        if (user.failedLoginAttempts > 0 || user.lockoutUntil) {
            user.failedLoginAttempts = 0;
            user.lockoutUntil = null;
            needsSave = true;
        }

        // Auto-promote the admin or sameer account if they log in
        if ((user.username === 'admin' || user.username === 'sameer') && !user.isAdmin) {
            user.isAdmin = true;
            needsSave = true;
        }
        
        if (needsSave) {
            await user.save();
        }

        await setAuthCookie({
            userId: user._id.toString(),
            username: user.username,
            isAdmin: user.isAdmin || false,
        });

        return NextResponse.json({
            message: 'Login successful',
            
            user: { id: user._id, username: user.username, isAdmin: user.isAdmin || false },
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
