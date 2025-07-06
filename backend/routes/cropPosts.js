const express = require('express');
const CropPostController = require('../controllers/cropPostController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateCropPost, validateCropPostUpdate } = require('../middleware/cropPostValidation');
const cropImageUpload = require('../config/cropImageUpload');

const router = express.Router();

// Optional authentication middleware for testing
const optionalAuthenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticate(req, res, next);
  } else {
    // For testing without authentication
    req.user = { id: 1, role: 'farmer' };
    next();
  }
};

// Public routes (no authentication required)
router.get('/', CropPostController.getAllCropPosts);
router.get('/stats', CropPostController.getCropPostStats);
router.get('/:id', CropPostController.getCropPostById);

// Farmer routes (temporarily without authentication for testing)
router.post('/', 
  (req, res, next) => {
    // Mock user for testing
    req.user = { id: 1, role: 'farmer' };
    next();
  },
  cropImageUpload.array('images', 5),
  validateCropPost,
  CropPostController.createCropPost
);

router.get('/user/my-posts', 
  (req, res, next) => {
    req.user = { id: 1, role: 'farmer' };
    next();
  },
  CropPostController.getUserCropPosts
);

router.put('/:id',
  (req, res, next) => {
    req.user = { id: 1, role: 'farmer' };
    next();
  },
  cropImageUpload.array('images', 5),
  validateCropPostUpdate,
  CropPostController.updateCropPost
);

router.delete('/:id',
  (req, res, next) => {
    req.user = { id: 1, role: 'farmer' };
    next();
  },
  CropPostController.deleteCropPost
);

// Admin routes
router.patch('/:id/status',
  (req, res, next) => {
    req.user = { id: 1, role: 'admin' };
    next();
  },
  CropPostController.updateCropPostStatus
);

module.exports = router;
