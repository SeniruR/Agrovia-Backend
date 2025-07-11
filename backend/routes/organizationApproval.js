const express = require('express');
const router = express.Router();
const organizationApprovalController = require('../controllers/organizationApprovalController');

// Get all organizations (any status)
router.get('/all', organizationApprovalController.getAllOrganizations);

// Get all approved organizations
router.get('/approved', organizationApprovalController.getApprovedOrganizations);

// Get all rejected organizations
router.get('/rejected', organizationApprovalController.getRejectedOrganizations);

// Get all pending organizations
router.get('/pending', organizationApprovalController.getPendingOrganizations);

// Download proof document
router.get('/:id/proof', organizationApprovalController.getProofDocument);
// Approve organization
router.post('/:id/approve', organizationApprovalController.approveOrganization);
// Reject organization
router.post('/:id/reject', organizationApprovalController.rejectOrganization);

module.exports = router;
