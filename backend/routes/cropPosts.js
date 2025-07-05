const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const CropPostController = require('../controllers/cropPostController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateCreateCropPost, validateUpdateCropPost } = require('../middleware/validation');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/crop-images');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `crop-${uniqueSuffix}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 5 // Maximum 5 files
  }
});

// Public routes (no authentication required)
router.get('/', CropPostController.getAllCropPosts);
router.get('/search', CropPostController.searchCropPosts);
router.get('/statistics', CropPostController.getCropStatistics);
router.get('/:id', CropPostController.getCropPostById);

// Protected routes (authentication required)
router.use(authenticate); // All routes below require authentication

// Farmer routes
router.post('/', 
  upload.array('images', 5), 
  validateCreateCropPost, 
  CropPostController.createCropPost
);

router.get('/farmer/my-posts', CropPostController.getFarmerCropPosts);

router.put('/:id', 
  upload.array('images', 5), 
  validateUpdateCropPost, 
  CropPostController.updateCropPost
);

router.delete('/:id', CropPostController.deleteCropPost);

// Admin routes
router.put('/:id/status', 
  authorize('admin'), 
  CropPostController.updateCropPostStatus
);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB per file.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 5 files allowed.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name for file upload.'
      });
    }
  }
  
  if (error.message === 'Only image files are allowed!') {
    return res.status(400).json({
      success: false,
      message: 'Only image files are allowed!'
    });
  }
  
  next(error);
});

module.exports = router;
