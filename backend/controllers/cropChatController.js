const CropChat = require('../models/CropChat');
const { getIO } = require('../utils/socket');
const { buildCropChatRoomKey } = require('../utils/cropChat');

const parseId = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const ensureParticipant = (userId, farmerId, buyerId) => {
  return userId === farmerId || userId === buyerId;
};

exports.getMessages = async (req, res) => {
  try {
    const cropId = parseId(req.params.cropId);
    const farmerId = parseId(req.query.farmerId);
    const buyerId = parseId(req.query.buyerId);

    if (!cropId || !farmerId || !buyerId) {
      return res.status(400).json({
        success: false,
        message: 'cropId, farmerId, and buyerId are required.'
      });
    }

    const userId = parseId(req.user?.id);

    if (!userId || !ensureParticipant(userId, farmerId, buyerId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to view this conversation.'
      });
    }

    const messages = await CropChat.getConversation({ cropId, farmerId, buyerId });

    return res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Error loading crop chat messages:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to load chat messages.'
    });
  }
};

exports.createMessage = async (req, res) => {
  try {
    const {
      cropId: rawCropId,
      farmerId: rawFarmerId,
      buyerId: rawBuyerId,
      senderId: rawSenderId,
      message,
      clientMessageId
    } = req.body || {};

    const cropId = parseId(rawCropId);
    const farmerId = parseId(rawFarmerId);
    const buyerId = parseId(rawBuyerId);
  const senderId = parseId(rawSenderId ?? (req.user && req.user.id));

    if (!cropId || !farmerId || !buyerId || !senderId) {
      return res.status(400).json({
        success: false,
        message: 'cropId, farmerId, buyerId, and senderId are required.'
      });
    }

    const trimmedMessage = message ? message.toString().trim() : '';

    if (!trimmedMessage) {
      return res.status(400).json({
        success: false,
        message: 'Message content cannot be empty.'
      });
    }

    const userId = parseId(req.user?.id);

    if (!userId || userId !== senderId) {
      return res.status(403).json({
        success: false,
        message: 'Sender information does not match the authenticated user.'
      });
    }

    if (!ensureParticipant(senderId, farmerId, buyerId)) {
      return res.status(403).json({
        success: false,
        message: 'Sender must be part of this conversation.'
      });
    }

    const savedMessage = await CropChat.createMessage({
      cropId,
      farmerId,
      buyerId,
      senderId,
      message: trimmedMessage,
      clientMessageId: clientMessageId ? clientMessageId.toString().slice(0, 100) : null
    });

    try {
      const io = getIO();
      const roomKey = buildCropChatRoomKey(cropId, farmerId, buyerId);
      io.to(roomKey).emit('cropChatMessage', savedMessage);
    } catch (socketError) {
      // Socket might not be initialised during tests; log and continue.
      console.warn('Socket emission skipped:', socketError.message);
    }

    return res.status(201).json({
      success: true,
      message: savedMessage
    });
  } catch (error) {
    console.error('Error saving crop chat message:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to send message right now.'
    });
  }
};

exports.getBuyers = async (req, res) => {
  try {
    const cropId = parseId(req.params.cropId);
    if (!cropId) {
      return res.status(400).json({
        success: false,
        message: 'cropId is required.'
      });
    }

    const userId = parseId(req.user?.id);
    if (!userId) {
      return res.status(403).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    // Get the crop to verify the farmer is the owner
    const db = require('../utils/db');
    const [crop] = await db.query(
      'SELECT farmer_Id FROM crop_posts WHERE id = ?',
      [cropId]
    );

    if (!crop || crop.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Crop not found.'
      });
    }

    const farmerId = parseId(crop[0].farmer_Id);
    
    // Check if the current user is the farmer who owns this crop
    if (userId !== farmerId) {
      return res.status(403).json({
        success: false,
        message: 'You can only view buyers for your own crops.'
      });
    }

    // Get unique buyers who have messaged about this crop
    const buyersList = await CropChat.getBuyersForCrop(cropId);

    return res.json({
      success: true,
      buyers: buyersList
    });
  } catch (error) {
    console.error('Error loading buyers list:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to load buyers list.'
    });
  }
};

// Delete a chat message
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = parseId(req.user?.id);

    if (!userId) {
      return res.status(403).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!messageId) {
      return res.status(400).json({
        success: false,
        message: 'Message ID is required.'
      });
    }

    const result = await CropChat.deleteMessage(messageId, userId);

    return res.json({
      success: true,
      message: 'Message deleted successfully.',
      data: result
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to delete message.'
    });
  }
};

exports.deleteMessage = deleteMessage;
