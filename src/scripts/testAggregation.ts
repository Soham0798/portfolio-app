import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction';
import Instrument from '../models/Instrument';

dotenv.config({ path: '.env.local' });

async function run() {
    await mongoose.connect(process.env.MongoDBUri!);

    const holdings = await Transaction.aggregate([
        {
            $group: {
                _id: '$instrumentId',
                totalBuyQty: { $sum: { $cond: [{ $eq: ['$type', 'BUY'] }, '$quantity', 0] } },
                totalSellQty: { $sum: { $cond: [{ $eq: ['$type', 'SELL'] }, '$quantity', 0] } }
            }
        },
        { $addFields: { currentQty: { $subtract: ['$totalBuyQty', '$totalSellQty'] } } },
        { $lookup: { from: 'instruments', localField: '_id', foreignField: '_id', as: 'instrument' } }
    ]);
    console.log(JSON.stringify(holdings, null, 2));
    process.exit();
}

run().catch(console.error);
