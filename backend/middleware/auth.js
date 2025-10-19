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
    console.log('Auth header received:', authHeader ? authHeader.substring(0, 20) + '...' : 'No auth header');
    
    // Support both 'Authorization' and 'authorization' headers, and allow token in query for dev
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.query && req.query.token) {
      token = req.query.token;
    } else if (req.headers['x-access-token']) {
      token = req.headers['x-access-token'];
    }

    if (!token) {
      console.log('No token found in request');
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    console.log('Token found, attempting to verify...');
    try {
      const decoded = verifyToken(token);
      console.log('Token decoded successfully:', { userId: decoded.userId });
      
      // Get user from database
      const user = await User.findById(decoded.userId);
      if (!user) {
        console.log('User not found for ID:', decoded.userId);
        return res.status(401).json({
          success: false,
          message: 'Invalid token - user not found'
        });
      }
      if (!user.is_active) {
        console.log('User account is deactivated:', decoded.userId);
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        });
      }
      // Add user to request object with role mapping
  const userTypeMap = {
    '0': 'admin',
    '1': 'farmer',
    '1.1': 'farmer', // Farmer (Organizer)
    '2': 'buyer',
    '3': 'shop_owner',
    '4': 'transporter',
    '5': 'moderator',
    '5.1': 'main_moderator',
    '6': 'committee_member'
  };
      user.role = userTypeMap[user.user_type?.toString()] || 'unknown';
      req.user = user;
      console.log('Authentication successful for user:', user.id);
      next();
    } catch (tokenError) {
      console.log('Token verification failed:', tokenError.message);
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
