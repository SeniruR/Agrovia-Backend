// routes/shopReviewsRoutes.js
const express = require('express');
const ShopReviewsController = require('../controllers/shopReviewsController');

const router = express.Router();

// Create a new review
router.post('/', ShopReviewsController.createReview);

// Get all reviews for a shop - handle both query parameter and URL parameter
router.get('/', ShopReviewsController.getReviewsByShop); // For query parameter: ?shop_id=123
router.get('/:shop_id', ShopReviewsController.getReviewsByShop); // For URL parameter: /123

// Update a review by id
router.put('/:id', ShopReviewsController.updateReview);

// Delete a review by id
router.delete('/:id', ShopReviewsController.deleteReview);

module.exports = router;
