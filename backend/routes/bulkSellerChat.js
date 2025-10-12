const express = require('express');
const router = express.Router();
const controller = require('../controllers/bulkSellerChatController');
const { authenticate } = require('../middleware/auth');

// Create a message (authenticated users only)
router.post('/', authenticate, controller.createMessage);

// Get conversation by seller_id & buyer_id (query params)
router.get('/conversation', authenticate, controller.getConversation);

// Get messages by seller
router.get('/seller/:sellerId', authenticate, controller.listBySeller);

// Get messages by buyer
router.get('/buyer/:buyerId', authenticate, controller.listByBuyer);

// Delete message
router.delete('/:id', authenticate, controller.deleteMessage);

module.exports = router;
