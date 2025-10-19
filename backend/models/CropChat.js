const { pool } = require('../config/database');

class CropChat {
  // 🔹 Fetch all messages for a specific crop conversation
  static async getConversation({ cropId, farmerId, buyerId, limit = 200 }) {
    // Ensure limit is an integer within safe bounds (1–500)
    const numericLimitRaw = Number.parseInt(limit, 10);
    const safeLimit = Number.isNaN(numericLimitRaw)
      ? 200
      : Math.min(Math.max(numericLimitRaw, 1), 500);

    // Convert IDs to integers
    const numericCropId = Number.parseInt(cropId, 10);
    const numericFarmerId = Number.parseInt(farmerId, 10);
    const numericBuyerId = Number.parseInt(buyerId, 10);

    // Validate identifiers
    if (
      Number.isNaN(numericCropId) ||
      Number.isNaN(numericFarmerId) ||
      Number.isNaN(numericBuyerId)
    ) {
      throw new Error('Invalid identifiers supplied for crop chat conversation lookup.');
    }

    // ✅ LIMIT must be directly inlined (MySQL doesn't support LIMIT ? in prepared statements)
    const query = `
      SELECT
        cc.id,
        cc.crop_id,
        cc.farmer_id,
        cc.buyer_id,
        cc.sender_id,
        cc.message,
        cc.client_message_id,
        cc.created_at,
        u.full_name as sender_name
      FROM crop_chats cc
      LEFT JOIN users u ON cc.sender_id = u.id
      WHERE cc.crop_id = ?
        AND cc.farmer_id = ?
        AND cc.buyer_id = ?
      ORDER BY cc.created_at ASC, cc.id ASC
      LIMIT ${safeLimit}
    `;

    // Execute with validated parameters
    const [rows] = await pool.execute(query, [
      numericCropId,
      numericFarmerId,
      numericBuyerId,
    ]);

    return rows;
  }

  // 🔹 Create a new chat message
  static async createMessage({
    cropId,
    farmerId,
    buyerId,
    senderId,
    message,
    clientMessageId = null,
  }) {
    // Insert message query
    const insertQuery = `
      INSERT INTO crop_chats (
        crop_id,
        farmer_id,
        buyer_id,
        sender_id,
        message,
        client_message_id
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const values = [
      Number.parseInt(cropId, 10),
      Number.parseInt(farmerId, 10),
      Number.parseInt(buyerId, 10),
      Number.parseInt(senderId, 10),
      message,
      clientMessageId || null,
    ];

    // Insert and retrieve the new message
    const [result] = await pool.execute(insertQuery, values);

    const [rows] = await pool.execute(
      `
      SELECT 
        cc.id, cc.crop_id, cc.farmer_id, cc.buyer_id, cc.sender_id, 
        cc.message, cc.client_message_id, cc.created_at,
        u.full_name as sender_name
      FROM crop_chats cc
      LEFT JOIN users u ON cc.sender_id = u.id
      WHERE cc.id = ?
      `,
      [result.insertId]
    );

    return rows[0];
  }

  // Get all buyers who have messaged about a specific crop
  static async getBuyersForCrop(cropId) {
    // Convert cropId to integer
    const numericCropId = Number.parseInt(cropId, 10);

    // Validate cropId
    if (Number.isNaN(numericCropId)) {
      throw new Error('Invalid crop ID supplied for buyers list lookup.');
    }

    // Get distinct buyers with their user details and the most recent message
    const query = `
      SELECT DISTINCT
        u.id,
        u.full_name,
        u.email,
        (
          SELECT cc.message
          FROM crop_chats cc
          WHERE cc.crop_id = ?
          AND cc.buyer_id = u.id
          ORDER BY cc.created_at DESC, cc.id DESC
          LIMIT 1
        ) AS lastMessage,
        (
          SELECT MAX(cc.created_at)
          FROM crop_chats cc
          WHERE cc.crop_id = ?
          AND cc.buyer_id = u.id
        ) AS lastMessageTime
      FROM crop_chats c
      JOIN users u ON c.buyer_id = u.id
      WHERE c.crop_id = ?
      ORDER BY lastMessageTime DESC
    `;

    const [buyers] = await pool.execute(query, [
      numericCropId,
      numericCropId,
      numericCropId
    ]);

    return buyers.map(buyer => ({
      id: buyer.id,
      name: buyer.full_name,
      email: buyer.email,
      lastMessage: buyer.lastMessage || 'No messages yet',
      lastMessageTime: buyer.lastMessageTime,
      formattedTime: buyer.lastMessageTime ? new Date(buyer.lastMessageTime).toLocaleString() : null
    }));
  }

  // Get all chat conversations for a farmer across all their crops
  static async getFarmerChatList(farmerId) {
    // Convert farmerId to integer
    const numericFarmerId = Number.parseInt(farmerId, 10);

    // Validate farmerId
    if (Number.isNaN(numericFarmerId)) {
      throw new Error('Invalid farmer ID supplied for chat list lookup.');
    }

    const query = `
      SELECT DISTINCT
        cp.id as cropId,
        cp.crop_name,
        u.id as buyerId,
        u.full_name as buyerName,
        u.email as buyerEmail,
        (
          SELECT cc.message
          FROM crop_chats cc
          WHERE cc.crop_id = cp.id
          AND cc.buyer_id = u.id
          ORDER BY cc.created_at DESC, cc.id DESC
          LIMIT 1
        ) AS lastMessage,
        (
          SELECT MAX(cc.created_at)
          FROM crop_chats cc
          WHERE cc.crop_id = cp.id
          AND cc.buyer_id = u.id
        ) AS lastMessageTime
      FROM crop_chats c
      JOIN crop_posts cp ON c.crop_id = cp.id
      JOIN users u ON c.buyer_id = u.id
      WHERE cp.farmer_Id = ?
      ORDER BY lastMessageTime DESC
    `;

    const [chats] = await pool.execute(query, [numericFarmerId]);

    return chats.map(chat => ({
      cropId: chat.cropId,
      cropName: chat.cropName,
      buyerId: chat.buyerId,
      buyerName: chat.buyerName,
      buyerEmail: chat.buyerEmail,
      lastMessage: chat.lastMessage || 'No messages yet',
      lastMessageTime: chat.lastMessageTime,
      formattedTime: chat.lastMessageTime ? new Date(chat.lastMessageTime).toLocaleString() : null
    }));
  }

  // Delete a chat message
  static async deleteMessage(messageId, userId) {
    // Handle both numeric IDs and client-generated IDs
    let queryField = 'id';
    let queryValue = messageId;
    
    // If messageId starts with 'client-', use client_message_id field
    if (typeof messageId === 'string' && messageId.startsWith('client-')) {
      queryField = 'client_message_id';
      queryValue = messageId;
    } else {
      // Try to convert to integer for regular numeric IDs
      const numericMessageId = Number.parseInt(messageId, 10);
      if (Number.isNaN(numericMessageId)) {
        // If it's not a numeric ID and doesn't start with 'client-', it might be a fallback ID
        // In this case, we can't delete it as it's not a real database record
        throw new Error(`Cannot delete message with invalid ID format: ${messageId}`);
      }
      queryValue = numericMessageId;
    }
    
    const numericUserId = Number.parseInt(userId, 10);

    // Validate user ID
    if (Number.isNaN(numericUserId)) {
      throw new Error(`Invalid user ID supplied for message deletion: ${userId}`);
    }

    // Delete the message directly - if it doesn't exist or doesn't belong to user, affectedRows will be 0
    const deleteQuery = `
      DELETE FROM crop_chats 
      WHERE ${queryField} = ? AND sender_id = ?
    `;

    const [result] = await pool.execute(deleteQuery, [queryValue, numericUserId]);

    if (result.affectedRows === 0) {
      throw new Error('Message not found, already deleted, or you do not have permission to delete this message.');
    }

    return { success: true, messageId: queryValue };
  }
}

module.exports = CropChat;
