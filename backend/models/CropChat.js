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
        id,
        crop_id,
        farmer_id,
        buyer_id,
        sender_id,
        message,
        client_message_id,
        created_at
      FROM crop_chats
      WHERE crop_id = ?
        AND farmer_id = ?
        AND buyer_id = ?
      ORDER BY created_at ASC, id ASC
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
        id, crop_id, farmer_id, buyer_id, sender_id, 
        message, client_message_id, created_at 
      FROM crop_chats 
      WHERE id = ?
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
}

module.exports = CropChat;
