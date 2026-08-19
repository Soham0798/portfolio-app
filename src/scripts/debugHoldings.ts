import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Instrument from '../models/Instrument';
import Transaction from '../models/Transaction';

dotenv.config({ path: '.env.local' });

async function run() {
    await mongoose.connect(process.env.MongoDBUri as string);
    const holdings = await Transaction.aggregate([
        { $group: { _id: '$instrumentId', totalBuyQty: { $sum: { $cond: [{ $eq: ['$type', 'BUY'] }, '$quantity', 0] } }, totalSellQty: { $sum: { $cond: [{ $eq: ['$type', 'SELL'] }, '$quantity', 0] } } } },
        { $addFields: { currentQty: { $subtract: ['$totalBuyQty', '$totalSellQty'] } } },
        { $match: { currentQty: { $gt: 0 } } },
        { $lookup: { from: 'instruments', localField: '_id', foreignField: '_id', as: 'instrument' } },
        { $unwind: '$instrument' },
        { $project: { name: '$instrument.name', currentQty: 1, currentPrice: '$instrument.currentPrice', currentValue: { $multiply: ['$currentQty', '$instrument.currentPrice'] } } }
    ]);
    console.log(holdings.map(h => ({ name: h.name, qty: h.currentQty, price: h.currentPrice, value: h.currentValue })));
    console.log('Total Market Value:', holdings.reduce((s, h) => s + h.currentValue, 0));
    process.exit(0);
}

run().catch(console.error);
