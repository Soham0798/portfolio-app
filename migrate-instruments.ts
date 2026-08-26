import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function migrate() {
    await mongoose.connect(process.env.MongoDBUri as string);
    const db = mongoose.connection.db;
    if (!db) return;
    try {
        // Find a user ID to own these instruments
        const user = await db.collection('users').findOne({});
        if (!user) {
            console.log('No user found');
            process.exit(0);
        }

        const result = await db.collection('instruments').updateMany(
            { userId: { $exists: false } },
            { $set: { userId: user._id } }
        );
        console.log(`Migrated ${result.modifiedCount} instruments to user ${user._id}`);
    } catch (e: any) {
        console.log('Migration error:', e.message);
    }
    process.exit(0);
}
migrate();
