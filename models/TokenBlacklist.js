import mongoose from "mongoose";

const tokenBlacklistSchema = new mongoose.Schema({
    jti: { // JWT ID
        type: String,
        required: true,
        unique: true
    },
    reason: {
        type: String,
        enum: ["logout", "password_change", "security_concern", "other"],
        default: "logout"
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    expireAt: {
        type: Date,
        required: true,
        expires: 0 // Document will be automatically removed when expireAt is reached
    }
});

// Index for quick lookups
tokenBlacklistSchema.index({ jti: 1 });

const TokenBlacklist = mongoose.model("TokenBlacklist", tokenBlacklistSchema);

export default TokenBlacklist;