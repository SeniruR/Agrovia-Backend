// routes/shopReviewsRoutes.js
const express = require('express');
const ShopReviewsController = require('../controllers/shopReviewsController');
const multer = require('multer');

const storage = multer.memoryStorage();

const upload = multer({
	storage,
	limits: {
		fileSize: 5 * 1024 * 1024,
		files: 1
	},
	fileFilter: (req, file, cb) => {
		if (!file.mimetype.startsWith('image/')) {
			return cb(new Error('Only image files are allowed'), false);
		}
		cb(null, true);
	}
});

const router = express.Router();

// Create a new review
router.post('/', upload.array('attachments', 1), ShopReviewsController.createReview);

// Get all reviews for a shop - handle both query parameter and URL parameter
router.get('/', ShopReviewsController.getReviewsByShop); // For query parameter: ?shop_id=123
router.get('/:shop_id', ShopReviewsController.getReviewsByShop); // For URL parameter: /123

// Update a review by id
router.put('/:id', upload.array('attachments', 1), ShopReviewsController.updateReview);

// Delete a review by id
router.delete('/:id', ShopReviewsController.deleteReview);

module.exports = router;
