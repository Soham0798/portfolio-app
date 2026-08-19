import mongoose, { Schema, Document, Types } from "mongoose";

interface IProfileSnapshot {
    totalValue: number;
    totalInvested: number;
    dayGain: number;
    dayGainPercent: number;
}

interface IAssetClassBreakdown {
    assetType: string;
    value: number;
    percentage: number;
}

export interface IDailySnapshot extends Document {
    userId: Types.ObjectId;
    dateString: string;
    date: Date;
    totalValue: number;
    totalInvested: number;
    dayGain: number;
    dayGainPercent: number;
    byProfile: {
        sameer: IProfileSnapshot;
        snehal: IProfileSnapshot;
        soham: IProfileSnapshot;
    };
    byAssetClass: IAssetClassBreakdown[];
}

const ProfileSnapshotSchema = new Schema<IProfileSnapshot>(
    {
        totalValue: { type: Number, default: 0 },
        totalInvested: { type: Number, default: 0 },
        dayGain: { type: Number, default: 0 },
        dayGainPercent: { type: Number, default: 0 },
    },
    { _id: false }
);

const AssetClassBreakdownSchema = new Schema<IAssetClassBreakdown>(
    {
        assetType: { type: String, required: true },
        value: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 },
    },
    { _id: false }
);

const DailySnapshotSchema = new Schema<IDailySnapshot>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        dateString: {
            type: String,
            required: true,
        },
        date: {
            type: Date,
            required: true,
        },
        totalValue: {
            type: Number,
            default: 0,
        },
        totalInvested: {
            type: Number,
            default: 0,
        },
        dayGain: {
            type: Number,
            default: 0,
        },
        dayGainPercent: {
            type: Number,
            default: 0,
        },
        byProfile: {
            sameer: { type: ProfileSnapshotSchema, default: () => ({}) },
            snehal: { type: ProfileSnapshotSchema, default: () => ({}) },
            soham: { type: ProfileSnapshotSchema, default: () => ({}) },
        },
        byAssetClass: {
            type: [AssetClassBreakdownSchema],
            default: [],
        },
    },
    { timestamps: true }
);


DailySnapshotSchema.index({ userId: 1, dateString: -1 }, { unique: true });

const DailySnapshot = mongoose.models.DailySnapshot || mongoose.model<IDailySnapshot>('DailySnapshot', DailySnapshotSchema);
export default DailySnapshot;
