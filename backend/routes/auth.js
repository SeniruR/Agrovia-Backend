const express = require('express');
const upload = require('../config/upload');
const { authLimiter } = require('../middleware/rateLimiter');
const { validate, registerFarmerSchema, registerCommitteeMemberSchema, loginSchema } = require('../middleware/validation');
const { authenticate, authorize } = require('../middleware/auth');
const {
  registerFarmer,
  registerCommitteeMember,
  login,
  getProfile,
  getAllUsers
} = require('../controllers/authController');

const router = express.Router();

// Public routes
router.post('/register/farmer', 
  authLimiter,
  validate(registerFarmerSchema),
  registerFarmer
);

router.post('/register/committee-member',
  authLimiter,
  upload.single('certificate'),
  validate(registerCommitteeMemberSchema),
  registerCommitteeMember
);

router.post('/login',
  authLimiter,
  validate(loginSchema),
  login
);

// Protected routes
router.get('/profile',
  authenticate,
  getProfile
);

// Admin only routes
router.get('/users',
  authenticate,
  authorize('admin'),
  getAllUsers
);

module.exports = router;
