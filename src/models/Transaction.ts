import mongoose, { Schema, Document, Types } from "mongoose";

export const TRANSACTION_TYPES = [
    'BUY', 'SELL', 'DIVIDEND', 'SPLIT', 'BONUS'
] as const;

export type TransactionType = typeof TRANSACTION_TYPES[number];

export const PROFILES = ['sameer', 'snehal'] as const;
export type Profile = typeof PROFILES[number];

export interface ITransaction extends Document {
    userId: Types.ObjectId;
    profile: Profile;
    instrumentId: Types.ObjectId;
    type: TransactionType;
    date: Date;
    quantity: number;
    price: number;
    fees: number;
    notes: string;
}

const TransactionSchema = new Schema<ITransaction>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        profile: {
            type: String,
            required: true,
            enum: PROFILES,
        },
        instrumentId: {
            type: Schema.Types.ObjectId,
            ref: 'Instrument',
            required: true,
        },
        type: {
            type: String,
            required: true,
            enum: TRANSACTION_TYPES,
        },
        date: {
            type: Date,
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 0,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        fees: {
            type: Number,
            default: 0,
            min: 0,
        },
        notes: {
            type: String,
            default: '',
            trim: true,
        },
    },
    { timestamps: true }
);


TransactionSchema.index({ userId: 1, profile: 1, date: -1 });

TransactionSchema.index({ userId: 1, profile: 1, instrumentId: 1 });

const Transaction = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);
export default Transaction;
