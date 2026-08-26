import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function reset() {
    await mongoose.connect(process.env.MongoDBUri as string);
    const db = mongoose.connection.db;
    if (!db) return;
    try {
        await db.collection('userprofiles').deleteMany({});
        console.log('User profiles deleted successfully');
    } catch (e: any) {
        console.log('Error deleting profiles:', e.message);
    }
    process.exit(0);
}
reset();
