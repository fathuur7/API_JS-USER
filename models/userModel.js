// models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Joi from "joi";

const userSchema = new mongoose.Schema({
    googleProfilePic: {
        type: String,
    },
    googleId: {
        type: String,
        sparse: true, 
        index: true,  // Index for faster queries
    },
    location: {
        type: String,
    },
    isActive: {
        type: Boolean,
        default: false
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: function() {
            // Password hanya wajib jika login tanpa Google
            return !this.googleId;
        }
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    validationCode: {
        type: String,
        default: null
    },
    loginType: {
        type: String,
        enum: ["local", "google"],
        default: "local"
    }
});

// Middleware untuk hash password sebelum menyimpan
userSchema.pre("save", async function (next) {
    // Skip hash jika password tidak dimodifikasi atau jika Google login
    if (!this.isModified("password") || this.googleId) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Metode untuk membandingkan password
userSchema.methods.comparePassword = async function (enteredPassword) {
    // Jika user login via Google dan tidak punya password
    if (this.googleId && !this.password) {
        return false;
    }
    return await bcrypt.compare(enteredPassword, this.password);
};

// Fungsi untuk validasi registrasi user local
export const validateUser = (data) => {
    const schema = Joi.object({
        name: Joi.string().min(3).max(40).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        location: Joi.string().optional(),
        role: Joi.string().valid("user", "admin").optional().default("user"),
        googleProfilePic: Joi.string().optional(),
        isActive: Joi.boolean().optional().default(false),
        validationCode: Joi.string().optional().allow(null),
    });
    return schema.validate(data);
};

// Fungsi untuk validasi registrasi user Google
export const validateGoogleUser = (data) => {
    const schema = Joi.object({
        name: Joi.string().min(3).max(40).required(),
        email: Joi.string().email().required(),
        googleId: Joi.string().required(),
        googleProfilePic: Joi.string().optional(),
        location: Joi.string().optional(),
        role: Joi.string().valid("user", "admin").optional().default("user"),
        isActive: Joi.boolean().optional().default(true),
    });
    return schema.validate(data);
};

// Fungsi untuk validasi input login menggunakan Joi
export const validateLogin = (data) => {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
    });
    return schema.validate(data);
};

userSchema.set("toJSON", { virtuals: true });
userSchema.virtual("id").get(function () {
    return this._id.toHexString();
});

const User = mongoose.model("User", userSchema);

export default User;