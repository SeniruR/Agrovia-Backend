const express = require('express');
const router = express.Router();
const multer = require('multer');

// Import controller
const cropReviewController = require('../controllers/cropReviewController');

// Import authentication middleware
const { authenticate } = require('../middleware/auth');

// Setup multer for file uploads
const storage = multer.memoryStorage();

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

// POST /api/v1/crop-reviews - Add a new review
router.post(
  '/',
  upload.array('attachments', 5),
  cropReviewController.addReview
);

// GET /api/v1/crop-reviews/:reviewId/attachment - Get a review's attachment
router.get('/:reviewId/attachment', (req, res, next) => {
  console.log(`[ROUTE DEBUG] Attachment route hit for review ID: ${req.params.reviewId}`);
  return cropReviewController.getReviewAttachment(req, res, next);
});

// PUT /api/v1/crop-reviews/:reviewId - Update a review
router.put(
  '/:reviewId',
  upload.array('attachments', 5),
  cropReviewController.updateReview
);

// DELETE /api/v1/crop-reviews/:reviewId - Delete a review
router.delete(
  '/:reviewId',
  cropReviewController.deleteReview
);

module.exports = router;
