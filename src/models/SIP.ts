import mongoose, { Document, Schema } from 'mongoose';

export interface ISIP extends Document {
    userId: mongoose.Types.ObjectId;
    profile: string;
    instrumentId: mongoose.Types.ObjectId;
    amount: number;
    dateOfMonth: number;
    nextExecutionDate: Date;
    status: 'ACTIVE' | 'PAUSED' | 'CANCELLED';
    createdAt: Date;
    updatedAt: Date;
}

const sipSchema = new Schema<ISIP>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        profile: { type: String, required: true },
        instrumentId: { type: Schema.Types.ObjectId, ref: 'Instrument', required: true },
        amount: { type: Number, required: true },
        dateOfMonth: { type: Number, required: true, min: 1, max: 28 }, // Restrict to 1-28 to avoid end-of-month issues
        nextExecutionDate: { type: Date, required: true },
        status: { type: String, enum: ['ACTIVE', 'PAUSED', 'CANCELLED'], default: 'ACTIVE' },
    },
    { timestamps: true }
);

// Compound index for fast querying by user, profile, and instrument
sipSchema.index({ userId: 1, profile: 1, instrumentId: 1 });
// Index for cron job finding SIPs due for execution
sipSchema.index({ status: 1, nextExecutionDate: 1 });

export default mongoose.models.SIP || mongoose.model<ISIP>('SIP', sipSchema);
