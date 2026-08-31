import mongoose, { Schema, Document, Types } from "mongoose";
import { PROFILES } from "./Transaction";  // reuse the same profiles

export const MANUAL_ASSET_TYPES = [
    'FD', 'EPF', 'ULIP', 'PPF', 'NPS', 'SGB', 'OTHER'
] as const;

export type ManualAssetType = typeof MANUAL_ASSET_TYPES[number];

export const ASSET_STATUSES = ['ACTIVE', 'MATURED', 'CLOSED'] as const;
export type AssetStatus = typeof ASSET_STATUSES[number];

export interface IValueHistoryEntry {
    date: Date;
    value: number;
    cashFlow: number;
    notes: string;
}

export interface IManualAsset extends Document {
    userId: Types.ObjectId;
    profile: typeof PROFILES[number];
    assetType: ManualAssetType;
    name: string;
    currentValue: number;
    totalInvested: number;
    interestRate: number;
    lifeCover: number;
    maturityDate: Date | null;
    status: AssetStatus;
    valueHistory: IValueHistoryEntry[];
}

const ValueHistorySchema = new Schema<IValueHistoryEntry>(
    {
        date: { type: Date, required: true },
        value: { type: Number, required: true },
        cashFlow: { type: Number, default: 0 },
        notes: { type: String, default: '' },
    },
    { _id: false }
);

const ManualAssetSchema = new Schema<IManualAsset>(
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
        assetType: {
            type: String,
            required: true,
            enum: MANUAL_ASSET_TYPES,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        currentValue: {
            type: Number,
            required: true,
            default: 0,
        },
        totalInvested: {
            type: Number,
            default: 0,
        },
        interestRate: {
            type: Number,
            default: 0,
        },
        lifeCover: {
            type: Number,
            default: 0,
        },
        maturityDate: {
            type: Date,
            default: null,
        },
        status: {
            type: String,
            enum: ASSET_STATUSES,
            default: 'ACTIVE',
        },
        valueHistory: {
            type: [ValueHistorySchema],
            default: [],
        },
    },
    { timestamps: true }
);

ManualAssetSchema.index({ userId: 1, profile: 1, assetType: 1 });

const ManualAsset = mongoose.models.ManualAsset || mongoose.model<IManualAsset>('ManualAsset', ManualAssetSchema);
export default ManualAsset;
