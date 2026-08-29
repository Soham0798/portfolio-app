import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IUserProfile extends Document {
    userId: mongoose.Types.ObjectId;
    dob: Date | null;
    monthlyIncome: number;
    monthlyExpenses: number;
    insuranceCover: number;
    profile: string;
}

const UserProfileSchema = new Schema<IUserProfile>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        dob: { type: Date, default: null },
        monthlyIncome: { type: Number, default: 0 },
        monthlyExpenses: { type: Number, default: 0 },
        insuranceCover: { type: Number, default: 0 },
        profile: { type: String, default: 'default' },
    },
    { timestamps: true }
);

UserProfileSchema.index({ userId: 1 });

const UserProfile: Model<IUserProfile> = mongoose.models.UserProfile || mongoose.model<IUserProfile>('UserProfile', UserProfileSchema);
export default UserProfile;
