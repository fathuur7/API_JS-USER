// controllers/authController.js
import { authService } from '../../services/auth/authService.js';

export const authController = {
  /**
   * Google OAuth login/register
   */
  async googleLogin(req, res) {
    try {
      // Accept either token or id_token for compatibility
      const token = req.body.token || req.body.id_token;
      
      if (!token) {
        return res.status(400).json({ 
          success: false, 
          message: 'Google token is required' 
        });
      }
      
      const authData = await authService.googleLogin(token, req);
      
      // Set HTTP-only cookie for refresh token
      res.cookie('refreshToken', authData.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        sameSite: 'lax' // Changed from 'strict' to allow cross-site requests during development
      });
      
      return res.json({
        success: true,
        message: 'Login successful',
        data: {
          accessToken: authData.accessToken,
          refreshToken: authData.refreshToken,
          user: authData.user
        }
      });
    } catch (error) {
      console.error('Google login error:', error);
      return res.status(401).json({
        success: false,
        message: error.message || 'Authentication failed'
      });
    }
  },
  
  /**
   * Refresh access token using refresh token
   */
  async refreshToken(req, res) {
    try {
      // Get refresh token from cookie or request body
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
      
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
      }
      
      const result = await authService.refreshToken(refreshToken, req);
      
      return res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: result.accessToken,
          user: result.user
        }
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      return res.status(401).json({
        success: false,
        message: error.message || 'Token refresh failed'
      });
    }
  },
  
  /**
   * Logout user - invalidate tokens
   */
  async logout(req, res) {
    try {
      // Get tokens from headers, cookies, or request body
      const accessToken = req.headers.authorization?.split(' ')[1] || req.body.accessToken;
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
      
      await authService.logout(accessToken, refreshToken);
      
      // Clear refresh token cookie
      res.clearCookie('refreshToken');
      
      return res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Logout failed'
      });
    }
  },
  
  /**
   * Get current user profile
   */
  async getCurrentUser(req, res) {
    try {
      // User info is already attached to req by auth middleware
      const { user } = req;
      
      return res.json({
        success: true,
        message: 'User profile retrieved successfully',
        data: user
      });
    } catch (error) {
      console.error('Get current user error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get user profile'
      });
    }
  }
};

export default authController;