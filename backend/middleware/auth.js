const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Verify JWT token
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const decoded = verifyToken(token);
      
      // Get user from database
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token - user not found'
        });
      }

      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      // Add user to request object with role mapping
      const userTypeMap = {
        '1': 'farmer',
        '2': 'buyer', 
        '3': 'shop_owner',
        '4': 'transporter',
        '5': 'admin',
        '6': 'committee_member'
      };
      
      // Map user_type to role for authorization
      user.role = userTypeMap[user.user_type?.toString()] || 'unknown';
      
      req.user = user;
      next();
    } catch (tokenError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Role-based authorization middleware
const authorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Ensure allowedRoles is an array
    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    if (!rolesArray.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Check if user is verified
const requireVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!req.user.is_verified) {
    return res.status(403).json({
      success: false,
      message: 'Account verification required'
    });
  }

  next();
};

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  authorize,
  requireVerification
};
