
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function seed() {
    await mongoose.connect(process.env.MongoDBUri!);

    const hashedPassword = await bcrypt.hash('hi123', 12);


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
