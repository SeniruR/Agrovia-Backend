// Socket.IO real-time chat for BulkSellerChat
const { Server } = require('socket.io');
const BulkSellerChat = require('../models/BulkSellerChat');

function setupBulkSellerChatSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:5174'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    // Join a chat room
    socket.on('joinRoom', (chat_room_id) => {
      socket.join(chat_room_id);
    });

    // Handle sending a message
    socket.on('sendMessage', async (data) => {
      const { sender_id, receiver_id, message, chat_room_id } = data;
      if (!sender_id || !receiver_id || !message || !chat_room_id) {
        console.error('Socket sendMessage missing fields:', data);
        return;
      }
      try {
        const msgId = await BulkSellerChat.createMessage({ sender_id, receiver_id, message, chat_room_id });
        io.to(chat_room_id).emit('newMessage', {
          sender_id,
          receiver_id,
          message,
          chat_room_id,
          id: msgId,
          created_at: new Date().toISOString()
        });
      } catch (err) {
        console.error('Socket sendMessage error:', err);
      }
    });
  });

  return io;
}

module.exports = setupBulkSellerChatSocket;
