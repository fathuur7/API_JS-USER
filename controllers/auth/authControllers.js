import User from "../../models/userModel.js";
import validator from "validator";
import userSchema, { validateUser } from "../../models/userModel.js";
import bcrypt from "bcryptjs";

export const getUser = async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
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

        // Hash password sebelum menyimpan
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

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
            password: hashedPassword,
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
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }

        // Cek apakah user sudah ada
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Cek password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid password"
            });
        }

        // Buat token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "1d"
        });

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Login error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
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