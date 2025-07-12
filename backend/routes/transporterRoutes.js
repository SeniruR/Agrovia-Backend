const express = require('express');
const router = express.Router();
const { upload } = require('../config/upload');
const { registerTransporter } = require('../controllers/transporterController');
const { authLimiter } = require('../middleware/rateLimiter');
// You can add validation middleware if you create a Joi schema for transporter

router.post('/register/transporter',
  authLimiter,
  upload.single('profile_image'),
  registerTransporter
);

module.exports = router;
