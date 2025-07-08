const express = require('express');
const CropPostController = require('../controllers/cropPostController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateCropPost, validateCropPostUpdate } = require('../middleware/cropPostValidation');
const cropImageUpload = require('../config/cropImageUpload');

const router = express.Router();

// Public routes (no authentication required)
router.get('/', CropPostController.getAllCropPosts);
router.get('/stats', CropPostController.getCropPostStats);
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
router.patch('/:id/status',
  authenticate,
  authorize(['admin']),
  CropPostController.updateCropPostStatus
);

module.exports = router;
