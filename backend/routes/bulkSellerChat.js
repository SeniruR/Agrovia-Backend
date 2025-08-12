const express = require('express');
const router = express.Router();
const bulkSellerChatController = require('../controllers/bulkSellerChatController');

// Send a new message
router.post('/message', bulkSellerChatController.sendMessage);

// Get all messages for a chat room
router.get('/messages/:chat_room_id', bulkSellerChatController.getMessages);

// List chat rooms for a user
router.get('/rooms/:user_id', bulkSellerChatController.getChatRooms);

module.exports = router;
