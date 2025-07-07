const { pool } = require('../config/database');

class ShopComplaint {
  // Create a new shop complaint
  static async create(complaint) {
    const {
     // Optional: if you want to track complaint ID
      title,
      description,
      submittedBy,
      priority,
      shopName,
      location,
      category,
      orderNumber,
      purchaseDate,
      
      attachments // comma-separated string or JSON array
    } = complaint;

    const query = `
      INSERT INTO shop_complaints
        (title, description, submitted_by, priority, shop_name, location, category, order_number, purchase_date, attachments)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    try {
      const [result] = await pool.execute(query, [
        title ?? null,
        description ?? null,
        submittedBy ?? null,
        priority ?? null,
        shopName ?? null,
        location ?? null,
        category ?? null,
        orderNumber ?? null,
        purchaseDate ? purchaseDate : null,
        attachments ? JSON.stringify(attachments) : null
      ]);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Get all complaints
  static async findAll() {
    const query = 'SELECT * FROM shop_complaints ORDER BY created_at DESC';
    try {
      const [rows] = await pool.execute(query);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Get complaint by ID
  static async findById(id) {
    const query = 'SELECT * FROM shop_complaints WHERE id = ?';
    try {
      const [rows] = await pool.execute(query, [id]);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Update complaint
  static async update(id, data) {
    const fields = [];
    const values = [];
    for (const key in data) {
      fields.push(`${key} = ?`);
      values.push(data[key]);
    }
    const query = `UPDATE shop_complaints SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);
    try {
      const [result] = await pool.execute(query, values);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Delete complaint
  static async delete(id) {
    const query = 'DELETE FROM shop_complaints WHERE id = ?';
    try {
      const [result] = await pool.execute(query, [id]);
      return result;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = ShopComplaint;
