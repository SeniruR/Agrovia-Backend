const express = require('express');
const router = express.Router();
const { authenticate, authorize, attachUserIfToken } = require('../middleware/auth');
const controller = require('../controllers/contactController');

// Public create (feedback/support) - no auth required
router.post('/', attachUserIfToken, controller.createMessage);

// Admin list/get/delete
router.get('/', authenticate, authorize(['admin']), controller.listMessages);
router.get('/:id', authenticate, authorize(['admin']), controller.getMessage);
router.post('/:id/respond', authenticate, authorize(['admin']), controller.respondToMessage);
router.patch('/:id/status', authenticate, authorize(['admin']), controller.updateMessageStatus);
router.delete('/:id', authenticate, authorize(['admin']), controller.deleteMessage);

module.exports = router;
