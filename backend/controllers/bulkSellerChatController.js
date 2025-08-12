const BulkSellerChat = require('../models/BulkSellerChat');

// Send a new chat message
exports.sendMessage = async (req, res) => {
  try {
    const { sender_id, receiver_id, message, chat_room_id } = req.body;
    if (!sender_id || !receiver_id || !message || !chat_room_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const messageId = await BulkSellerChat.createMessage({ sender_id, receiver_id, message, chat_room_id });
    res.status(201).json({ message: 'Message sent', id: messageId });
  } catch (err) {
    console.error('Error in sendMessage:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get all messages for a chat room
exports.getMessages = async (req, res) => {
  try {
    const { chat_room_id } = req.params;
    const messages = await BulkSellerChat.getMessagesByRoom(chat_room_id);
    res.json(messages);
  } catch (err) {
    console.error('Error in getMessages:', err);
    res.status(500).json({ error: err.message });
  }
};

// List chat rooms for a user
exports.getChatRooms = async (req, res) => {
  try {
    const { user_id } = req.params;
    const rooms = await BulkSellerChat.getChatRoomsForUser(user_id);
    res.json(rooms);
  } catch (err) {
    console.error('Error in getChatRooms:', err);
    res.status(500).json({ error: err.message });
  }
};
