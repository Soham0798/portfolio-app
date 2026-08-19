import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Instrument from '../models/Instrument';

dotenv.config({ path: '.env.local' });

async function run() {
    await mongoose.connect(process.env.MongoDBUri as string);
    const res = await Instrument.deleteMany({ tickerSymbol: { $regex: '^(MF-|PURCHASE)' } });
    console.log('Deleted ghosts:', res);
    process.exit(0);
}

run().catch(console.error);
