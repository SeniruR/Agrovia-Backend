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
// Middleware to coerce land_size to number (for Joi validation)
function coerceFarmerFields(req, res, next) {
  if (req.body && typeof req.body.land_size === 'string') {
    const parsed = parseFloat(req.body.land_size);
    if (!isNaN(parsed)) req.body.land_size = parsed;
  }
  next();
}

// Farmer registration: must handle file upload before validation
router.post('/register/farmer', 
  authLimiter,
  upload.single('profile_image'),
  coerceFarmerFields, // <-- coerce land_size to number
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
