const express = require('express');
const upload = require('../config/upload');
const { authLimiter } = require('../middleware/rateLimiter');
const { validate, registerFarmerSchema, registerCommitteeMemberSchema, registerBuyerSchema, loginSchema } = require('../middleware/validation');
const { authenticate, authorize } = require('../middleware/auth');
const {
  registerFarmer,
  registerCommitteeMember,
  registerBuyer,
  login,
  getProfile,
  getAllUsers,
  registerShopOwner
} = require('../controllers/authController');
const { registerTransporter } = require('../controllers/transporterController');

const router = express.Router();

// Shop Owner registration: must handle file upload before validation
router.post('/register/shop-owner',
  authLimiter,
  upload.fields([
    { name: 'profile_image', maxCount: 1 },
    { name: 'shop_license', maxCount: 1 },
    { name: 'shop_image', maxCount: 1 }
  ]),
  validate(require('../middleware/validation').registerShopOwnerSchema),
  registerShopOwner
);

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


// Buyer registration: must handle file upload before validation
router.post('/register/buyer',
  authLimiter,
  upload.single('profile_image'),
  validate(registerBuyerSchema),
  registerBuyer
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

// Transporter registration: must handle file upload before validation
router.post('/register/transporter',
  authLimiter,
  upload.single('profile_image'),
  registerTransporter
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
