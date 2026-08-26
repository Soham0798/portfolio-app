import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IGoal extends Document {
    userId: mongoose.Types.ObjectId;
    name: string;
    target: number;
    current: number;
    timelineYears: number;
    profile: string;
}

const GoalSchema = new Schema<IGoal>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true },
        target: { type: Number, required: true },
        current: { type: Number, required: true },
        timelineYears: { type: Number, required: true },
        profile: { type: String, default: 'default' },
    },
    { timestamps: true }
);

GoalSchema.index({ userId: 1 });

const Goal: Model<IGoal> = mongoose.models.Goal || mongoose.model<IGoal>('Goal', GoalSchema);
export default Goal;
