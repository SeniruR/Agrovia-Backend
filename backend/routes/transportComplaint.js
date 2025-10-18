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
router.put('/:id', upload.array('attachments', 5), transportComplaintController.updateComplaint);

const { authenticate, authorize } = require('../middleware/auth');

// Admin: Add or update reply for a complaint
router.put('/:id/reply', 
  (req, res, next) => {
    console.log('Request headers:', req.headers); // Log headers for debugging
    next();
  },
  authenticate, 
  (req, res, next) => {
    console.log('User authenticated:', req.user?.id); // Log authenticated user
    next();
  },
  authorize('admin'), 
  transportComplaintController.addReply);

// Admin: Delete reply for a complaint
router.delete('/:id/reply/delete', authenticate, authorize('admin'), transportComplaintController.deleteReply);

// Admin: Deactivate transport company related to a complaint
router.put('/:id/deactivate-transport-company', authenticate, authorize('admin'), transportComplaintController.deactivateTransportCompany);

// Public: Delete a complaint
router.delete('/:id', transportComplaintController.deleteComplaint);

module.exports = router;
