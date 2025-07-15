const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, contactSchema } = require('../middleware/validation');
const {
  submitContact,
  getAllContacts,
  getContactById,
  updateContactStatus,
  deleteContact,
  getContactStats
} = require('../controllers/contactController');

const router = express.Router();

// Public routes
// Submit a new contact message
router.post('/submit', validate(contactSchema), submitContact);

// Protected routes (admin/moderator only)
// Get all contacts with pagination and filtering
router.get('/', authenticate, authorize(['admin', 'moderator']), getAllContacts);

// Get contact statistics
router.get('/stats', authenticate, authorize(['admin', 'moderator']), getContactStats);

// Get contact by ID
router.get('/:id', authenticate, authorize(['admin', 'moderator']), getContactById);

// Update contact status
router.patch('/:id/status', authenticate, authorize(['admin', 'moderator']), updateContactStatus);

// Delete contact
router.delete('/:id', authenticate, authorize(['admin']), deleteContact);

module.exports = router;
