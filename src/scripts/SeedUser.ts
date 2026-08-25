
import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function seed() {
    await mongoose.connect(process.env.MongoDBUri!);

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync('hi123', salt, 64).toString('hex');
    const hashedPassword = `${salt}:${hash}`;


    await mongoose.connection.collection('users').updateOne(
        { username: 'sameer' },
        {
            $set: {
                username: 'sameer',
                password: hashedPassword,
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        },
        { upsert: true }
    );

    console.log('User created successfully!');
    await mongoose.disconnect();
}

seed().catch(console.error);
