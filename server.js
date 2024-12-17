import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from './routes/auth/authRoutes.js';
import {Transaction ,createDummyTransactions} from './models/transactionModel.js';
import productRoutes from './routes/product/productRoutes.js';


dotenv.config();
const app = express();

// //Connect to MongoDB
connectDB();

// // Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

// console.log(transactionSchema);
// // Dummy Data
// createDummyTransactions();

// console.log(Transaction);

// Start the server
const port = process.env.PORT 
app.listen(port, () => {
    console.log(`Server is running on port http://localhost:${port}`);
});