import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';
import Instrument from '@/models/Instrument';

export async function GET() {
    await dbConnect();
    
    // Check if transactions exist
    const txCount = await Transaction.countDocuments();
    
    // Check if instruments exist
    const instCount = await Instrument.countDocuments();
    
    // Find a transaction and see if its instrumentId exists in Instruments
    const sampleTx = await Transaction.findOne();
    let matchingInst = null;
    if (sampleTx) {
        matchingInst = await Instrument.findById(sampleTx.instrumentId);
    }
    
    // Run the aggregation without unwind
    const agg = await Transaction.aggregate([
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

    return NextResponse.json({
        txCount,
        instCount,
        sampleTx,
        matchingInst,
        agg
    });
}
