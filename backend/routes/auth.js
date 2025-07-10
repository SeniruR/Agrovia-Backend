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
  registerShopOwner,
  getProfileWithFarmerDetails
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

// New: Full profile with farmer details
router.get('/profile-full',
  authenticate,
  getProfileWithFarmerDetails
);

// Update full profile (user + farmer details)
router.put('/profile-full',
  authenticate,
  upload.single('profileImage'),
  require('../controllers/authController').updateProfileWithFarmerDetails
);

// Admin only routes
router.get('/users',
  authenticate,
  authorize('admin'),
  getAllUsers
);

// GET /api/v1/auth/disable-reason/:userId
router.get('/disable-reason/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        // Get the latest disable record for this user
        const [disableRows] = await pool.execute(
            `SELECT d.case_id, c.case_name, d.created_at
             FROM disable_accounts d
             JOIN disable_account_cases c ON d.case_id = c.id
             WHERE d.user_id = ?
             ORDER BY d.created_at DESC
             LIMIT 1`,
            [userId]
        );
        if (disableRows.length > 0) {
            res.json({
                case_id: disableRows[0].case_id,
                case_name: disableRows[0].case_name,
                created_at: disableRows[0].created_at
            });
        } else {
            res.status(404).json({ message: 'No disable reason found for this user.' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Error fetching disable reason.' });
    }
});

module.exports = router;
