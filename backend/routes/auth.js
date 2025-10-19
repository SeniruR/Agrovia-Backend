const express = require('express');
const { upload, uploadMemory, uploadProfileImage } = require('../config/upload');
const {
  validate,
  registerFarmerSchema,
  registerCommitteeMemberSchema,
  registerBuyerSchema,
  loginSchema,
  forgotPasswordRequestSchema,
  forgotPasswordVerifySchema,
  forgotPasswordResetSchema
} = require('../middleware/validation');
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
const { registerModerator } = require('../controllers/moderatorController');
const {
  requestPasswordReset,
  verifyResetCode,
  resetPassword
} = require('../controllers/passwordResetController');

const router = express.Router();

// Shop Owner registration: must handle file upload before validation
router.post('/register/shop-owner',
  uploadMemory.fields([
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
  uploadMemory.single('profile_image'),
  coerceFarmerFields, // <-- coerce land_size to number
  validate(registerFarmerSchema),
  registerFarmer
);


// Buyer registration: must handle file upload before validation
// Use uploadProfileImage for buyer profile images (images only)
router.post('/register/buyer',
  uploadProfileImage.single('profile_image'),
  validate(registerBuyerSchema),
  registerBuyer
);

router.post('/register/committee-member',
  upload.single('certificate'),
  validate(registerCommitteeMemberSchema),
  registerCommitteeMember
);

router.post('/login',
  validate(loginSchema),
  login
);

router.post('/forgot-password/request',
  validate(forgotPasswordRequestSchema),
  requestPasswordReset
);

router.post('/forgot-password/verify',
  validate(forgotPasswordVerifySchema),
  verifyResetCode
);

router.post('/forgot-password/reset',
  validate(forgotPasswordResetSchema),
  resetPassword
);

// Transporter registration: must handle file upload before validation (images only, memory)
router.post('/register/transporter',
  uploadProfileImage.single('profile_image'),
  registerTransporter
);

// Moderator registration: must handle file upload before validation
router.post('/register/moderator',
  uploadProfileImage.single('profile_image'), // Use memory storage, image-only
  registerModerator
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
  uploadMemory.single('profileImage'),
  require('../controllers/authController').updateProfileWithFarmerDetails
);

// General profile update endpoint (alias for profile-full)
router.put('/update-profile',
  authenticate,
  uploadMemory.single('profileImage'),
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
