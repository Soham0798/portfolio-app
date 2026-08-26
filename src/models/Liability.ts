import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ILiability extends Document {
    userId: mongoose.Types.ObjectId;
    name: string;
    type: string;
    outstanding: number;
    emi: number;
    interestRate: number;
    profile: string;
}

const LiabilitySchema = new Schema<ILiability>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true },
        type: { type: String, required: true },
        outstanding: { type: Number, required: true },
        emi: { type: Number, required: true },
        interestRate: { type: Number, required: true },
        profile: { type: String, default: 'default' },
    },
    { timestamps: true }
);

LiabilitySchema.index({ userId: 1 });

const Liability: Model<ILiability> = mongoose.models.Liability || mongoose.model<ILiability>('Liability', LiabilitySchema);
export default Liability;
