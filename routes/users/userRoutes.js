// crud routes
import express from "express";
import { getUserProfile } from "../../controllers/auth/authControllers.js";
import authMiddleware from "../../middleware/authMiddleware.js";

const router = express.Router();

router.get("/me", authMiddleware, getUserProfile);

export default router;