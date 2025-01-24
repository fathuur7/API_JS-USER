import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Joi from "joi";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    telegram: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Middleware untuk hash password sebelum menyimpan
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Metode untuk membandingkan password
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Fungsi untuk validasi menggunakan Joi
export const validateUser = (data) => {
    const schema = Joi.object({
        name: Joi.string().min(3).max(40).required(),
        email: Joi.string().email().required(),
        telegram: Joi.string().min(3).required(),
        password: Joi.string().min(6).required(),
        role: Joi.string().valid("user", "admin").optional().default("user"), 
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


const User = mongoose.model("User", userSchema);

export default User;
