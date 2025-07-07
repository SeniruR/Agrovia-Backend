const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const organizationController = require('../controllers/organizationController');

// File upload config for DB BLOB storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Public: Register organization (used by farmer signup)
router.post(
  '/',
  upload.single('letterofProof'),
  organizationController.registerOrganization
);

// Public: Search organizations by name
router.get('/search', organizationController.searchOrganizations);

module.exports = router;
