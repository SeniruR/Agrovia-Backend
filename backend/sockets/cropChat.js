const { verifyToken } = require('../middleware/auth');
const User = require('../models/User');
const CropChat = require('../models/CropChat');
const { buildCropChatRoomKey } = require('../utils/cropChat');

const parseId = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const ensureParticipant = (userId, farmerId, buyerId) => {
  return userId === farmerId || userId === buyerId;
};

const roleMap = {
  '0': 'admin',
  '1': 'farmer',
  '1.1': 'farmer',
  '2': 'buyer',
  '3': 'shop_owner',
  '4': 'transporter',
  '5': 'moderator',
  '5.1': 'main_moderator',
  '6': 'committee_member'
};

module.exports = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication token is required.'));
      }

      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId);

      if (!user || !user.is_active) {
        return next(new Error('User is not authorized for socket access.'));
      }

      const userId = parseId(user.id);
      if (!userId) {
        return next(new Error('Invalid user information.'));
      }

      socket.data.user = {
        id: userId,
        role: roleMap[user.user_type?.toString()] || 'unknown'
      };

      next();
    } catch (error) {
      next(new Error('Authentication failed.'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('joinCropChat', async (payload = {}) => {
      try {
        const cropId = parseId(payload.cropId);
        const farmerId = parseId(payload.farmerId);
        const buyerId = parseId(payload.buyerId);

        if (!cropId || !farmerId || !buyerId) {
          return socket.emit('cropChatError', 'cropId, farmerId, and buyerId are required to join the chat.');
        }

        if (!ensureParticipant(socket.data.user.id, farmerId, buyerId)) {
          return socket.emit('cropChatError', 'You are not allowed to join this chat.');
        }

        const roomKey = buildCropChatRoomKey(cropId, farmerId, buyerId);
        socket.join(roomKey);

        const history = await CropChat.getConversation({ cropId, farmerId, buyerId });
        socket.emit('cropChatHistory', history);
      } catch (error) {
        console.error('joinCropChat error:', error);
        socket.emit('cropChatError', 'Unable to join chat right now.');
      }
    });

    socket.on('sendCropChatMessage', async (payload = {}) => {
      try {
        const cropId = parseId(payload.cropId);
        const farmerId = parseId(payload.farmerId);
        const buyerId = parseId(payload.buyerId);
        const clientMessageId = payload.clientMessageId ? payload.clientMessageId.toString().slice(0, 100) : null;
        const trimmedMessage = payload.message ? payload.message.toString().trim() : '';

        if (!cropId || !farmerId || !buyerId) {
          return socket.emit('cropChatError', 'Missing crop chat identifiers.');
        }

        if (!trimmedMessage) {
          return socket.emit('cropChatError', 'Message cannot be empty.');
        }

        const senderId = socket.data.user.id;

        if (!ensureParticipant(senderId, farmerId, buyerId)) {
          return socket.emit('cropChatError', 'You are not allowed to send messages to this chat.');
        }

        const roomKey = buildCropChatRoomKey(cropId, farmerId, buyerId);
        socket.join(roomKey);

        // Save the message but don't emit from here
        // The socket already receives the message from the controller
        const savedMessage = await CropChat.createMessage({
          cropId,
          farmerId,
          buyerId,
          senderId,
          message: trimmedMessage,
          clientMessageId
        });
      } catch (error) {
        console.error('sendCropChatMessage error:', error);
        socket.emit('cropChatError', 'Unable to send message right now.');
      }
    });

    socket.on('deleteCropChatMessage', async ({ messageId }) => {
      try {
        if (!messageId) {
          return socket.emit('cropChatError', 'Message ID is required for deletion.');
        }

        const userId = socket.data.user.id;

        // Delete the message
        const result = await CropChat.deleteMessage(messageId, userId);

        if (result.success) {
          // Emit to all connected clients in relevant rooms that the message was deleted
          socket.broadcast.emit('messageDeleted', { messageId: result.messageId });
          socket.emit('messageDeleted', { messageId: result.messageId });
        }
      } catch (error) {
        console.error('deleteCropChatMessage error:', error);
        socket.emit('cropChatError', error.message || 'Unable to delete message right now.');
      }
    });
  });
};
