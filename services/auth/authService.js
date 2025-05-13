// services/authService.js
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import User, { validateGoogleUser } from '../../models/userModel.js'
import RefreshToken from '../../models/RefreshToken.js';
import TokenBlacklist from '../../models/TokenBlacklist.js';

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const authService = {
  /**
   * Generate JWT token
   */
  generateToken(user) {
    // Create a unique JWT ID
    const jti = crypto.randomBytes(16).toString('hex');
    
    return jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role,
        jti: jti // Include the JWT ID in the payload
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );
  },
  
  /**
   * Generate refresh token and save to database
   */
  async generateRefreshToken(userId, req) {
    // Create a secure random token
    const refreshToken = crypto.randomBytes(40).toString('hex');
    
    // Get device info and IP for security tracking
    const device = req.headers['user-agent'] || 'unknown';
    const ip = req.ip || req.connection.remoteAddress || null;
    
    // Save to database
    const newRefreshToken = new RefreshToken({
      userId,
      token: refreshToken,
      device,
      ip
    });
    
    await newRefreshToken.save();
    return refreshToken;
  },
  
  /**
   * Verify Google token and get user info
   */
  async verifyGoogleToken(token) {
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      
      const payload = ticket.getPayload();
      return {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      };
    } catch (error) {
      throw new Error('Invalid Google token');
    }
  },
  
  /**
   * Login or register user with Google
   */
  async googleLogin(googleToken, req) {
    // Verify Google token
    const googleUserInfo = await this.verifyGoogleToken(googleToken);
    
    // Find user by Google ID or email
    let user = await User.findOne({ 
      $or: [
        { googleId: googleUserInfo.googleId },
        { email: googleUserInfo.email }
      ]
    });
    
    if (!user) {
      // Create new user with Google info
      const userData = {
        name: googleUserInfo.name,
        email: googleUserInfo.email,
        googleId: googleUserInfo.googleId,
        googleProfilePic: googleUserInfo.picture,
        isActive: true,
        // loginType: 'google'
      };
      
      // Validate user data
      const { error } = validateGoogleUser(userData);
      if (error) throw new Error(error.details[0].message);
      
      user = new User(userData);
      await user.save();
    } else if (!user.googleId) {
      // If user exists but doesn't have googleId, link accounts
      user.googleId = googleUserInfo.googleId;
      user.googleProfilePic = googleUserInfo.picture;
      user.isActive = true;
      await user.save();
    } else {
      // Update profile pic if changed
      if (user.googleProfilePic !== googleUserInfo.picture) {
        user.googleProfilePic = googleUserInfo.picture;
        await user.save();
      }
    }
    
    // Update last seen
    user.lastSeen = new Date();
    await user.save();

    user.loginType = 'google';
    await user.save();
    
    // Generate JWT token
    const accessToken = this.generateToken(user);
    
    // Generate refresh token
    const refreshToken = await this.generateRefreshToken(user._id, req);
    
    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        googleProfilePic: user.googleProfilePic,
        isActive: user.isActive
      }
    };
  },
  
  /**
   * Refresh JWT token using refresh token
   */
  async refreshToken(token, req) {
    // Look up the refresh token
    const refreshTokenDoc = await RefreshToken.findOne({ token, isValid: true });
    if (!refreshTokenDoc) {
      throw new Error('Invalid refresh token');
    }
    
    // Get the user
    const user = await User.findById(refreshTokenDoc.userId);
    if (!user) {
      // Invalidate the token if user doesn't exist
      refreshTokenDoc.isValid = false;
      await refreshTokenDoc.save();
      throw new Error('User not found');
    }
    
    // Generate new access token
    const accessToken = this.generateToken(user);
    
    // Update last seen
    user.lastSeen = new Date();
    await user.save();
    
    return {
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    };
  },
  
  /**
   * Invalidate a JWT token by adding it to blacklist
   */
  async blacklistToken(token) {
    try {
      // Decode the token to get payload (without verification)
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.jti || !decoded.exp || !decoded.userId) {
        throw new Error('Invalid token format');
      }
      
      // Create expiration date from token
      const expireAt = new Date(decoded.exp * 1000);
      
      // Check if already blacklisted
      const existing = await TokenBlacklist.findOne({ jti: decoded.jti });
      if (existing) {
        return true; // Already blacklisted
      }
      
      // Add to blacklist
      const blacklistEntry = new TokenBlacklist({
        jti: decoded.jti,
        userId: decoded.userId,
        reason: 'logout',
        expireAt 
      });
      
      await blacklistEntry.save();
      return true;
    } catch (error) {
      throw new Error('Failed to blacklist token: ' + error.message);
    }
  },
  
  /**
   * Verify JWT token and check blacklist
   */
  async verifyToken(token) {
    try {
      // First verify the token signature
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if token is blacklisted
      if (decoded.jti) {
        const isBlacklisted = await TokenBlacklist.findOne({ jti: decoded.jti });
        if (isBlacklisted) {
          throw new Error('Token has been revoked');
        }
      }
      
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  },
  
  /**
   * Logout user - invalidate refresh token and blacklist JWT
   */
  async logout(accessToken, refreshToken) {
    try {
      // Blacklist the access token
      if (accessToken) {
        await this.blacklistToken(accessToken);
      }
      
      // Invalidate refresh token
      if (refreshToken) {
        const refreshTokenDoc = await RefreshToken.findOne({ token: refreshToken });
        if (refreshTokenDoc) {
          refreshTokenDoc.isValid = false;
          await refreshTokenDoc.save();
        }
      }
      
      return true;
    } catch (error) {
      throw new Error('Logout failed: ' + error.message);
    }
  }
};

export default authService;