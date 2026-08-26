import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function fix() {
    await mongoose.connect(process.env.MongoDBUri as string);
    const db = mongoose.connection.db;
    if (!db) return;
    try {
        await db.collection('userprofiles').dropIndex('userId_1');
        console.log('Index dropped successfully');
    } catch (e: any) {
        console.log('Index drop error:', e.message);
    }
    process.exit(0);
}
fix();
