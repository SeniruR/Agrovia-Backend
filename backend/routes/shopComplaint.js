const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const shopComplaintController = require('../controllers/shopComplaintController');

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/shop-complaints'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  }
});
const upload = multer({ storage });

// Public: Submit a new shop complaint (with file upload)
router.post('/', upload.array('attachments', 5), shopComplaintController.createComplaint);

// Public: Get all complaints
router.get('/', shopComplaintController.getAllComplaints);

// Public: Get a single complaint by ID
router.get('/:id', shopComplaintController.getComplaintById);

// Public: Update a complaint
router.put('/:id', shopComplaintController.updateComplaint);

// Public: Delete a complaint
router.delete('/:id', shopComplaintController.deleteComplaint);

module.exports = router;
