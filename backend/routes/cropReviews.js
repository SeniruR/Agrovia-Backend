const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Import controller
const cropReviewController = require('../controllers/cropReviewController');

// Import authentication middleware
const { authenticate } = require('../middleware/auth');

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/reviews');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Generate unique filename
    const uniqueFileName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueFileName);
  }
});

// Configure multer with file size limits and accepted file types
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function(req, file, cb) {
    // Accept only image files
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Routes
// GET /api/v1/crop-reviews?crop_id=123 - Get all reviews for a crop
router.get('/', cropReviewController.getReviewsByCropId);

// GET /api/v1/crop-reviews/:id - Get a specific review
router.get('/:id', cropReviewController.getReviewById);

// POST /api/v1/crop-reviews - Add a new review (requires authentication)
// Temporarily disable authentication for testing
// router.post('/', authenticate, upload.array('attachments', 5), cropReviewController.addReview);
router.post('/', upload.array('attachments', 5), cropReviewController.addReview);

// GET /api/v1/crop-reviews/:reviewId/attachments/:fileName - Get review attachment
router.get('/:reviewId/attachments/:fileName', cropReviewController.getReviewAttachment);

module.exports = router;
