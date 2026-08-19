import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Instrument from '../models/Instrument';

dotenv.config({ path: '.env.local' });

async function run() {
    await mongoose.connect(process.env.MongoDBUri as string);
    const insts = await Instrument.find({ assetType: 'MUTUAL_FUND' });
    console.log(insts.map(i => ({ name: i.name, ticker: i.tickerSymbol })));
    process.exit(0);
}

run().catch(console.error);
