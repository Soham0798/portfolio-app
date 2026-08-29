import mongoose, { Schema, Document } from "mongoose";

export const AssetTypes = [
    'STOCK', 'MUTUAL_FUND', 'NPS', 'SGB', 'GOLD', 'ETF', 'BOND'
] as const;

export type AssetType = typeof AssetTypes[number];

export interface IInstrument extends Document {
    userId: mongoose.Types.ObjectId;
    tickerSymbol: string;
    name: string;
    assetType: AssetType;
    exchange: string;
    currentPrice: number;
    previousClose: number;
    priceLastUpdated: Date | null;
    isActive: boolean;
}

const InstrumentSchema = new Schema<IInstrument>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        tickerSymbol: {
            type: String,
            required: true,
            trim: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        assetType: {
            type: String,
            required: true,
            enum: AssetTypes,
        },
        exchange: {
            type: String,
            default: '',
        },
        currentPrice: {
            type: Number,
            default: 0,
        },
        previousClose: {
            type: Number,
            default: 0,
        },
        priceLastUpdated: {
            type: Date,
            default: null,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

InstrumentSchema.index({ userId: 1, tickerSymbol: 1, assetType: 1 }, { unique: true });

InstrumentSchema.index({ assetType: 1 });

const Instrument = mongoose.models.Instrument || mongoose.model<IInstrument>('Instrument', InstrumentSchema);
export default Instrument;
