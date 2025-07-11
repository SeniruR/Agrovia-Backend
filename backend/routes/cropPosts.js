
const express = require('express');
const CropPostController = require('../controllers/cropPostController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateCropPost, validateCropPostUpdate } = require('../middleware/cropPostValidation');
const cropImageUpload = require('../config/cropImageUpload');

const router = express.Router();

// Serve crop post images as URLs
router.get('/:postId/images/:imageId', CropPostController.getCropPostImage);

// Public routes (no authentication required)
router.get('/', CropPostController.getAllCropPosts);
router.get('/stats', CropPostController.getCropPostStats);

// Enhanced public routes for retrieving crop posts with bulk quantity details
// These must come BEFORE the /:id route to avoid conflicts
router.get('/enhanced', CropPostController.getAllCropPostsEnhanced);
router.get('/districts', CropPostController.getAvailableDistricts);
router.get('/bulk-orders', CropPostController.getBulkOrderCrops);
router.get('/enhanced/:id', CropPostController.getCropPostByIdEnhanced);

// Parameterized routes (must come after specific routes)
router.get('/:id', CropPostController.getCropPostById);

// Protected farmer routes (require authentication)
router.post('/', 
  authenticate, // Use real authentication middleware
  authorize(['farmer']), // Only farmers can create crop posts
  cropImageUpload.array('images', 5),
  validateCropPost,
  CropPostController.createCropPost
);

router.get('/user/my-posts', 
  authenticate,
  authorize(['farmer']),
  CropPostController.getUserCropPosts
);

router.put('/:id',
  authenticate,
  authorize(['farmer']),
  cropImageUpload.array('images', 5),
  validateCropPostUpdate,
  CropPostController.updateCropPost
);

router.delete('/:id',
  authenticate,
  authorize(['farmer']),
  CropPostController.deleteCropPost
);

// Admin routes
// Allow both admin and farmer to PATCH status, but permission logic is enforced in controller
router.patch('/:id/status',
  authenticate,
  authorize(['admin', 'farmer']),
  CropPostController.updateCropPostStatus
);

module.exports = router;
