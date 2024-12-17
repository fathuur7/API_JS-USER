import mongoose from "mongoose";
import moment from "moment-timezone";
import User from "./userModel.js";
import Product from "./productModel.js";

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: () => moment().tz('Asia/Jakarta').toDate(),
  },
});

export const Transaction = mongoose.model("Transaction", transactionSchema);

export const createDummyTransactions = async () => {
  try {
    const dummyTransactions = [
      {
        userId: new mongoose.Types.ObjectId(),
        productId: new mongoose.Types.ObjectId(),
        amount: 100000,
        date: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss'), // Format yang lebih terbaca
      },
      {
        userId: new mongoose.Types.ObjectId(),
        productId: new mongoose.Types.ObjectId(),
        amount: 250000,
        date: moment().tz('Asia/Jakarta').subtract(1, 'days').format('YYYY-MM-DD HH:mm:ss'), // Satu hari sebelumnya
      },
    ];

    console.log("Dummy transactions created:", dummyTransactions);
    return dummyTransactions;
  } catch (error) {
    console.error("Error creating dummy transactions:", error);
  }
};
