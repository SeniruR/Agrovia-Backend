const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const organizationController = require('../controllers/organizationController');

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/organizations'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  }
});
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
