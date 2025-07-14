const express = require('express');
const UserController = require('../controllers/userController');

const router = express.Router();

// Get user profile image
router.get('/:id/profile-image', UserController.getProfileImage);

// Get shop owner details by user_id
router.get('/:id/shop-owner-details', UserController.getShopOwnerDetailsByUserId);
// Get buyer details by user_id
router.get('/:id/buyer-details', UserController.getBuyerDetailsByUserId);

// Get farmer details by user_id
router.get('/:id/farmer-details', UserController.getFarmerDetailsByUserId);

// Update user active status (activate/suspend)
router.put('/:id/active', UserController.updateUserActiveStatus);

// Get all users (admin)
router.get('/all', UserController.getAllUsers);

// Get user profile
router.get('/profile', UserController.getUserProfile);

// Get user's crop posting history
router.get('/crop-history', UserController.getUserCropHistory);

module.exports = router;
