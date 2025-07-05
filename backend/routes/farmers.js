
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { registerFarmer } = require('../controllers/farmerController');

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

module.exports = router;
