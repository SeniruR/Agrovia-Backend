const express = require('express');
const { validate, organizationSchema } = require('../middleware/validation');
const { authenticate, authorize } = require('../middleware/auth');
const {
  createOrganization,
  getAllOrganizations,
  getOrganizationByCommitteeNumber,
  updateOrganization,
  deleteOrganization
} = require('../controllers/organizationController');

const router = express.Router();

// Public routes
router.get('/', getAllOrganizations);
router.get('/:committee_number', getOrganizationByCommitteeNumber);

// Protected routes - Admin only
router.post('/',
  authenticate,
  authorize('admin'),
  validate(organizationSchema),
  createOrganization
);

router.put('/:id',
  authenticate,
  authorize('admin'),
  validate(organizationSchema),
  updateOrganization
);

router.delete('/:id',
  authenticate,
  authorize('admin'),
  deleteOrganization
);

module.exports = router;
