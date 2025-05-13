import { authService } from '../services/auth/authService.js';
import User from '../models/userModel.js';
import RefreshToken from '../models/RefreshToken.js'

/**
 * Enhanced security middleware for authentication
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = await authService.verifyToken(token);
    
    // Get full user data from database for most accurate information
    const user = await User.findById(decoded.userId).select('-password -validationCode');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Attach complete user object to request based on actual User model structure
    req.user = {
      id: user._id.toString(), // Include both _id and id for flexibility
      email: user.email,
      name: user.name,
      role: user.role,
      googleId: user.googleId,
      googleProfilePic: user.googleProfilePic,
      isActive: user.isActive,
      location: user.location,
      lastSeen: user.lastSeen
    };
    
    // Update lastSeen timestamp with optimized database writes
    const now = new Date();
    if (!user.lastSeen || (now - new Date(user.lastSeen)) > 5 * 60 * 1000) { // Update if > 5 minutes
      await User.findByIdAndUpdate(user._id, { lastSeen: now });
    }
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message || 'Authentication failed'
    });
  }
};

/**
 * Middleware to check if user has required role
 */
export const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    // If roles is not an array, convert to array
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (allowedRoles.includes(req.user.role)) {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied: insufficient permissions'
      });
    }
  };
};

/**
 * Middleware to track suspicious activities with refresh tokens
 */
export const trackTokenActivity = async (req, res, next) => {
  // Only apply to refresh token routes
  if (req.path.includes('/refresh-token') || req.originalUrl.includes('/refresh-token')) {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    
    if (refreshToken) {
      try {
        // Find the token in the database
        const tokenDoc = await RefreshToken.findOne({ token: refreshToken, isValid: true });
        
        if (tokenDoc) {
          const currentIp = req.ip || req.connection.remoteAddress;
          const currentDevice = req.headers['user-agent'];
          
          // Check if IP or device has changed
          if (tokenDoc.ip && tokenDoc.ip !== currentIp) {
            console.warn(`⚠️ Refresh token used from different IP. User: ${tokenDoc.userId}, Original: ${tokenDoc.ip}, Current: ${currentIp}`);
            
            // Option 1: Log suspicious activity (implement your logging mechanism)
            // await securityAuditService.logSuspiciousActivity({
            //   userId: tokenDoc.userId,
            //   activityType: 'suspicious_token_use',
            //   details: `IP change: ${tokenDoc.ip} -> ${currentIp}`,
            //   severity: 'medium'
            // });
            
            // Option 2: For significant IP location changes, invalidate token
            // const ipLocationChange = await ipLocationService.isSignificantChange(tokenDoc.ip, currentIp);
            // if (ipLocationChange.isDifferentCountry) {
            //   await RefreshToken.updateOne({ _id: tokenDoc._id }, { isValid: false });
            //   return res.status(401).json({
            //     success: false,
            //     message: 'Security alert: Please log in again'
            //   });
            // }
            
            // For now just log to console in development
            if (process.env.NODE_ENV !== 'production') {
              console.log('IP change detected for refresh token');
            }
          }
          
          // Device change detection (simplified)
          if (tokenDoc.device && tokenDoc.device !== currentDevice) {
            console.warn(`⚠️ Refresh token used from different device. User: ${tokenDoc.userId}`);
            // Similar actions as above could be taken
          }
        }
      } catch (error) {
        // Don't block the request if tracking fails
        console.error('Error tracking token activity:', error);
      }
    }
  }
  
  next();
};

/**
 * Rate limiting middleware (simple implementation)
 * For production use, consider using express-rate-limit or similar library
 */
const ipRequestCounts = {};
const MAX_REQUESTS_PER_MINUTE = 60;
const WINDOW_MS = 60 * 1000; // 1 minute

export const rateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  
  if (!ipRequestCounts[ip]) {
    ipRequestCounts[ip] = {
      count: 1,
      resetTime: Date.now() + WINDOW_MS
    };
  } else {
    // Reset if window expired
    if (Date.now() > ipRequestCounts[ip].resetTime) {
      ipRequestCounts[ip] = {
        count: 1,
        resetTime: Date.now() + WINDOW_MS
      };
    } else {
      // Increment count
      ipRequestCounts[ip].count++;
      
      // Check if over limit
      if (ipRequestCounts[ip].count > MAX_REQUESTS_PER_MINUTE) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests, please try again later'
        });
      }
    }
  }
  
  next();
};

/**
 * Clean up expired rate limit data periodically
 */
setInterval(() => {
  const now = Date.now();
  
  // Clean up expired entries
  Object.keys(ipRequestCounts).forEach(ip => {
    if (now > ipRequestCounts[ip].resetTime) {
      delete ipRequestCounts[ip];
    }
  });
}, 5 * 60 * 1000); // Run every 5 minutes

export default { authenticate, authorize, trackTokenActivity, rateLimiter };