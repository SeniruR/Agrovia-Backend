// BulkSellerChat.js - Model for chat messages between bulk sellers and buyers
const { pool } = require('../config/database');

class BulkSellerChat {
  // Create a new chat message
  static async createMessage({ sender_id, receiver_id, message, chat_room_id }) {
    const query = `
      INSERT INTO bulk_seller_chat (sender_id, receiver_id, message, chat_room_id, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `;
    const [result] = await pool.query(query, [sender_id, receiver_id, message, chat_room_id]);
    return result.insertId || (result[0] && result[0].insertId);
  }

  // Get all messages for a chat room
  static async getMessagesByRoom(chat_room_id) {
    const query = `
      SELECT * FROM bulk_seller_chat WHERE chat_room_id = ? ORDER BY created_at ASC
    `;
    const [rows] = await pool.query(query, [chat_room_id]);
    return rows;
  }

  // List chat rooms for a user
  static async getChatRoomsForUser(user_id) {
    const query = `
      SELECT DISTINCT chat_room_id FROM bulk_seller_chat WHERE sender_id = ? OR receiver_id = ?
    `;
    const [rows] = await pool.query(query, [user_id, user_id]);
    return rows;
  }
}

module.exports = BulkSellerChat;
