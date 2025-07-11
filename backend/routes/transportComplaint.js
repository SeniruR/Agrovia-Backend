const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const transportComplaintController = require('../controllers/transportComplaintController');

// Use memory storage for BLOB upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Public: Submit a new transport complaint (with file upload)
router.post('/', upload.array('attachments', 5), transportComplaintController.createComplaint);

// Public: Get all complaints
router.get('/', transportComplaintController.getAllComplaints);

// Public: Get a single complaint by ID (with attachment metadata)
router.get('/:id', transportComplaintController.getComplaintById);

// Public: Update a complaint
router.put('/:id', transportComplaintController.updateComplaint);

// Public: Delete a complaint
router.delete('/:id', transportComplaintController.deleteComplaint);

module.exports = router;
