const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { registerFarmer } = require('../controllers/farmerController');
const { getAllFarmers } = require('../controllers/farmerListController');
const { approveFarmer } = require('../controllers/approveFarmerController');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Use multer for profileImage upload
router.post('/', upload.single('profileImage'), registerFarmer);

// Get all farmers (for verification panel)
router.get('/', getAllFarmers);

// Approve a pending farmer (set is_active=1 and remove from disable_accounts)
router.post('/:id/approve', approveFarmer);

module.exports = router;

// Approve a pending farmer (set is_active=1 and remove from disable_accounts)
router.post('/:id/approve', approveFarmer);
