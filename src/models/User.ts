import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
    username: string;
    password: string;
    isAdmin: boolean;
    failedLoginAttempts: number;
    lockoutUntil: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: true,
        },
        isAdmin: {
            type: Boolean,
            default: false,
        },
        failedLoginAttempts: {
            type: Number,
            default: 0,
        },
        lockoutUntil: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);
if (mongoose.models.User) {
    delete mongoose.models.User;
}
const User = mongoose.model<IUser>('User', UserSchema);
export default User;