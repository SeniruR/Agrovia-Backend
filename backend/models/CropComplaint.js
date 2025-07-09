const { pool } = require('../config/database');

class CropComplaint {
  // Create a new crop complaint
  static async create(complaint) {
    const {
      title,
      description,
      submittedBy,
      priority,
      cropType,
      farmer,
      category,
      orderNumber,
      status = 'not consider',
      attachments = null // images as BLOB
    } = complaint;

    const query = `
      INSERT INTO crop_complaints
        (title, description, submitted_by, priority, crop_type, farmer, category, order_number, status, attachments)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    try {
      const [result] = await pool.execute(query, [
        title ?? null,
        description ?? null,
        submittedBy ?? null,
        priority ?? null,
        cropType ?? null,
        farmer ?? null,
        category ?? null,
        orderNumber ?? null,
        status ?? 'not consider',
        attachments
      ]);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Get all complaints
  static async findAll() {
    const query = 'SELECT * FROM crop_complaints ORDER BY id DESC';
    try {
      const [rows] = await pool.execute(query);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Get complaint by ID
  static async findById(id) {
    const query = 'SELECT * FROM crop_complaints WHERE id = ?';
    try {
      const [rows] = await pool.execute(query, [id]);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Update a complaint
  static async update(id, updates) {
    const fields = [];
    const values = [];
    for (const key in updates) {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    }
    const query = `UPDATE crop_complaints SET ${fields.join(', ')} WHERE id = ?`;
    try {
      const [result] = await pool.execute(query, [...values, id]);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Delete a complaint
  static async delete(id) {
    const query = 'DELETE FROM crop_complaints WHERE id = ?';
    try {
      const [result] = await pool.execute(query, [id]);
      return result;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = CropComplaint;
