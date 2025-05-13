import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    token: {
        type: String,
        required: true,
        unique: true
    },
    device: {
        type: String,
        default: "unknown"
    },
    ip: {
        type: String,
        default: null
    },
    isValid: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: '7d' // Automatically delete after 7 days
    }
});

// Index for quick lookups by token
refreshTokenSchema.index({ token: 1 });

// Index for finding user's tokens
refreshTokenSchema.index({ userId: 1, isValid: 1 });

const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);

export default RefreshToken;