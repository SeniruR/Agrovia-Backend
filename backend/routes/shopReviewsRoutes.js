// routes/shopReviewsRoutes.js
const express = require('express');
const ShopReviewsController = require('../controllers/shopReviewsController');

const router = express.Router();

// Create a new review
router.post('/', ShopReviewsController.createReview);

// Get all reviews for a shop
router.get('/:shop_id', ShopReviewsController.getReviewsByShop);

// Update a review by id
router.put('/:id', ShopReviewsController.updateReview);

// Delete a review by id
router.delete('/:id', ShopReviewsController.deleteReview);

module.exports = router;
