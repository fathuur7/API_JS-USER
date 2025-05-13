// middleware/authMiddleware.js
import { authService } from '../services/auth/authService.js';

/**
 * Middleware to authenticate and authorize requests using JWT
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = await authService.verifyToken(token);
    
    // Attach user to request object (fetch minimal data)
    req.user = {
      _id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };
    
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

export default { authenticate, authorize };