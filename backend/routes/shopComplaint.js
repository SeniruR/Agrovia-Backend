const express = require('express');
const router = express.Router();
const shopComplaintController = require('../controllers/shopComplaintController');

// Public: Submit a new shop complaint
router.post('/', shopComplaintController.createComplaint);

// Public: Get all complaints
router.get('/', shopComplaintController.getAllComplaints);

// Public: Get a single complaint by ID
router.get('/:id', shopComplaintController.getComplaintById);

// Public: Update a complaint
router.put('/:id', shopComplaintController.updateComplaint);

// Public: Delete a complaint
router.delete('/:id', shopComplaintController.deleteComplaint);

module.exports = router;
