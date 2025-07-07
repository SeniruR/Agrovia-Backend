const express = require('express');
const UserController = require('../controllers/userController');

const router = express.Router();

// Get user profile
router.get('/profile', UserController.getUserProfile);

// Get user's crop posting history
router.get('/crop-history', UserController.getUserCropHistory);

module.exports = router;
