const { pool } = require('../config/database');

class ShopComplaintAttachment {
  // Save a new attachment
  static async create({ complaint_id, filename, mimetype, filedata }) {
    const query = `
      INSERT INTO shop_complaint_attachments
        (complaint_id, filename, mimetype, filedata)
      VALUES (?, ?, ?, ?)
    `;
    try {
      const [result] = await pool.execute(query, [
        complaint_id,
        filename,
        mimetype,
        filedata
      ]);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Get all attachments for a complaint
  static async findByComplaintId(complaint_id) {
    const query = 'SELECT id, filename, mimetype FROM shop_complaint_attachments WHERE complaint_id = ?';
    try {
      const [rows] = await pool.execute(query, [complaint_id]);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Get a single attachment (for download)
  static async findById(id) {
    const query = 'SELECT * FROM shop_complaint_attachments WHERE id = ?';
    try {
      const [rows] = await pool.execute(query, [id]);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = ShopComplaintAttachment;
