import User from "../../models/userModel.js";

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
        const { name, email, phone, password } = req.body;

        // Validasi input
        if (!name || !email || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        // Cek apakah user sudah ada
        const userExist = await User.findOne({
            $or: [{ phone }, { email }]
        });
        if (userExist) {
            return res.status(400).json({
                success: false,
                message: "User already exists"
            });
        }

        // Tetapkan role admin jika kriteria terpenuhi
        const userCount = await User.countDocuments();
        const emailAdmin = "kopisusu8ip@gmail.com"; // Email admin default
        const role = userCount < 1 || email === emailAdmin ? "admin" : "user";

        // Buat user baru dengan role yang ditentukan
        const user = await User.create({
            name,
            email,
            phone,
            password, // Kirim password mentah
            role
        });

        // Buat response user tanpa password
        const userData = {
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role
        };

        // Kirim response berhasil
        return res.status(201).json({
            success: true,
            data: userData
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message || "Server error occurred"
        });
    }
};

export const updateUser = async (req, res) => {
    try {
        const id = req.params.id;
        const { name, email, phone, password } = req.body;
        const user = await User.findByIdAndUpdate(
            id,
            { name, email, phone, password },
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