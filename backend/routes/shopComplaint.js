const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const shopComplaintController = require('../controllers/shopComplaintController');

// File upload config

// Use memory storage for BLOB upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Public: Submit a new shop complaint (with file upload)
router.post('/', upload.array('attachments', 5), shopComplaintController.createComplaint);

// Public: Get all complaints
router.get('/', shopComplaintController.getAllComplaints);


// Public: Get a single complaint by ID (with attachment metadata)
router.get('/:id', shopComplaintController.getComplaintById);

// Public: Download a single attachment by attachment ID
// router.get('/attachment/:attachmentId', shopComplaintController.downloadAttachment);

// Public: Update a complaint
router.put('/:id', upload.array('attachments', 5), shopComplaintController.updateComplaint);

const { authenticate, authorize } = require('../middleware/auth');

// Admin: Deactivate shop owner related to a complaint
router.put('/:id/deactivate-shop-owner', authenticate, authorize('admin'), shopComplaintController.deactivateShopOwner);

// Public: Delete a complaint
router.delete('/:id', shopComplaintController.deleteComplaint);

module.exports = router;
