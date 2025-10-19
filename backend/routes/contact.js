const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const controller = require('../controllers/contactController');

// Public create (feedback/support) - no auth required
router.post('/', controller.createMessage);

// Admin list/get/delete
router.get('/', authenticate, authorize(['admin']), controller.listMessages);
router.get('/:id', authenticate, authorize(['admin']), controller.getMessage);
router.delete('/:id', authenticate, authorize(['admin']), controller.deleteMessage);

module.exports = router;
