import mongoose from 'mongoose';

const MongoDBUri = process.env.MongoDBUri!;

if (!MongoDBUri) {
    throw new Error('Please define MongoDBUri in .env.local');
}

let cached = (global as any).mongoose;

if (!cached) {
    cached = (global as any).mongoose = { conn: null, promise: null };
}
async function dbConnect(): Promise<typeof mongoose> {
    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        cached.promise = mongoose.connect(MongoDBUri);
    }
    cached.conn = await cached.promise;
    return cached.conn;
}

export default dbConnect;