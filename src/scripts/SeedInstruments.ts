import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Instrument from '../models/Instrument';

dotenv.config({ path: '.env.local' });

async function seed() {
    await mongoose.connect(process.env.MongoDBUri!);
    
    await Instrument.create([
        { name: 'Reliance Industries', tickerSymbol: 'RELIANCE.NS', assetType: 'STOCK', exchange: 'NSE' },
        { name: 'Tata Consultancy Services', tickerSymbol: 'TCS.NS', assetType: 'STOCK', exchange: 'NSE' },
        { name: 'HDFC Bank', tickerSymbol: 'HDFCBANK.NS', assetType: 'STOCK', exchange: 'NSE' },
        { name: 'PPFAS Flexi Cap', tickerSymbol: '120503', assetType: 'MUTUAL_FUND', exchange: 'AMFI' }
    ]).catch(() => console.log('Already seeded'));
    
    console.log('Done');
    await mongoose.disconnect();
}

seed();
