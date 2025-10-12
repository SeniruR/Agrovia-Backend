const { pool } = require('../config/database');

class BulkSellerChat {
  static async create({ seller_id, buyer_id, message, sent_by }) {
    const query = `INSERT INTO bulk_seller_chat (seller_id, buyer_id, message, sent_by) VALUES (?, ?, ?, ?)`;
    const values = [seller_id, buyer_id, message, sent_by];
    const [result] = await pool.query(query, values);
    return result.insertId;
  }

  static async getByConversation({ seller_id, buyer_id, limit = 100, offset = 0 }) {
    const query = `SELECT * FROM bulk_seller_chat WHERE (seller_id = ? AND buyer_id = ?) OR (seller_id = ? AND buyer_id = ?) ORDER BY created_at ASC LIMIT ? OFFSET ?`;
    const values = [seller_id, buyer_id, buyer_id, seller_id, Number(limit), Number(offset)];
    const [rows] = await pool.query(query, values);
    return rows;
  }

  static async getById(id) {
    const query = `SELECT * FROM bulk_seller_chat WHERE id = ?`;
    const [rows] = await pool.query(query, [id]);
    return rows[0] || null;
  }

  static async getBySeller(seller_id, limit = 100, offset = 0) {
    const query = `SELECT * FROM bulk_seller_chat WHERE seller_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const [rows] = await pool.query(query, [seller_id, Number(limit), Number(offset)]);
    return rows;
  }

  static async getByBuyer(buyer_id, limit = 100, offset = 0) {
    const query = `SELECT * FROM bulk_seller_chat WHERE buyer_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const [rows] = await pool.query(query, [buyer_id, Number(limit), Number(offset)]);
    return rows;
  }

  static async delete(id) {
    const query = `DELETE FROM bulk_seller_chat WHERE id = ?`;
    const [result] = await pool.query(query, [id]);
    return result.affectedRows > 0;
  }
}

module.exports = BulkSellerChat;
