// routes/authRoutes.js
import express from 'express';
import { authController } from '../../controllers/auth/authControllers.js'
import { authenticate } from '../../middleware/authMiddleware.js'

const router = express.Router();

/**
 * @route   POST /api/auth/google
 * @desc    Google OAuth login/register
 * @access  Public
 */
router.post('/google', authController.googleLogin);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', authController.refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and invalidate tokens
 * @access  Public
 */
router.post('/logout', authController.logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, authController.getCurrentUser);

export default router;