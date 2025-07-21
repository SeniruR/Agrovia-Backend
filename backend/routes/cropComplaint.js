
const express = require('express');
const router = express.Router();
const multer = require('multer');
const cropComplaintController = require('../controllers/cropComplaintController');

// Use memory storage for BLOB upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Public: Submit a new crop complaint (with file upload)
router.post('/', upload.array('attachments', 5), cropComplaintController.createComplaint);

// Public: Get all complaints
router.get('/', cropComplaintController.getAllComplaints);

// Public: Get a single complaint by ID
router.get('/:id', cropComplaintController.getComplaintById);


// Public: Update a complaint
router.put('/:id', upload.array('attachments', 5), cropComplaintController.updateComplaint);

// Admin: Add or update reply for a complaint
router.put('/:id/reply', cropComplaintController.addReply);

// Admin: Deactivate farmer account from crop complaint
router.put('/:id/deactivate-farmer', cropComplaintController.deactivateFarmer);

// Public: Delete a complaint
router.delete('/:id', cropComplaintController.deleteComplaint);

module.exports = router;
