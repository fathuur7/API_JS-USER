import User from "../../models/userModel.js";
import { validateUser , validateLogin } from "../../models/userModel.js";
import bcrypt from "bcryptjs";
// import Joi from "joi";
import jwt from "jsonwebtoken";

export const getUser = async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }    
};


export const getUserProfile = async (req, res) => {
    try {
        // Ambil token dari cookie
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        // Verifikasi token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password"); // Jangan kirim password ke frontend

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json(user);
    } catch (error) {
        res.status(401).json({ message: "Invalid token" });
    }
};


export const register = async (req, res) => {
    try {
        const { name, email, telegram, password } = req.body;

        // Validasi input menggunakan Joi
        const { error } = validateUser(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        // Periksa apakah pengguna sudah ada
        const userExist = await User.findOne({
            $or: [{ telegram }, { email }]
        });
        if (userExist) {
            return res.status(400).json({
                success: false,
                message: "User already exists"
            });
        }

        // Set role berdasarkan email dan telegram admin
        let role = "user";
        if (email === process.env.ADMIN_EMAIL && telegram === process.env.ADMIN_TELEGRAM) {
            role = "admin";
        }

        // Buat pengguna baru
        const user = await User.create({
            name,
            email,
            telegram,
            password,
            role
        });

        const userData = {
            name: user.name,
            telegram: user.telegram,
            role: user.role
        };

        return res.status(201).json({
            success: true,
            data: userData
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

export const updateUser = async (req, res) => {
    try {
        const id = req.params.id;
        const { name, email, telegram, password } = req.body;
        const user = await User.findByIdAndUpdate(
            id,
            { name, email, telegram, password },
            { new: true }
        );
        res.status(200).json(user);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};



export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validasi input
        const { error } = validateLogin(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message,
            });
        }

        // Cek apakah pengguna ada di database
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        // Cek password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        // Buat token JWT
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "1d",
        });

        // Simpan token di cookies
        res.cookie("token", token, {
            httpOnly: true,  // Mencegah akses dari JavaScript (lebih aman)
            secure: process.env.NODE_ENV === "production",  // Hanya gunakan HTTPS di production
            sameSite: "Strict",  // Mencegah pengiriman cookies ke domain lain
            maxAge: 24 * 60 * 60 * 1000, // Expire dalam 1 hari
        });

        return res.status(200).json({
            success: true,
            message: "Login successful",
            user: {
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error("Login error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

// Backend - controller/authController.js
export const logout = async (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        path: "/",
    });

    return res.status(200).json({
        success: true,
        message: "Logged out successfully",
    });
};

export const deleteUser = async (req, res) => {
    try {
        const userId = req.user.id; 
        const user = await User.findByIdAndDelete(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }  
};