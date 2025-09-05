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

// Get all suspended organizations
router.get('/suspended', organizationApprovalController.getSuspendedOrganizations);

// Download proof document
router.get('/:id/proof', organizationApprovalController.getProofDocument);
// Approve organization
router.post('/:id/approve', organizationApprovalController.approveOrganization);
// Reject organization
router.post('/:id/reject', organizationApprovalController.rejectOrganization);
// Suspend organization
router.post('/:id/suspend', organizationApprovalController.suspendOrganization);
// Activate organization
router.post('/:id/activate', organizationApprovalController.activateOrganization);
// Remove organization
router.post('/:id/remove', organizationApprovalController.removeOrganization);

// Fetch organizations (summary or detailed)
router.get('/', organizationApprovalController.getOrganizations);

// Fetch detailed data for a specific organization
router.get('/details/:id', organizationApprovalController.getOrganizationDetails);

module.exports = router;
