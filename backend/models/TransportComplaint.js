const { pool } = require('../config/database');

class TransportComplaint {
  // Create a new transport complaint
  static async create(complaint) {
    const {
      title,
      description,
      submittedBy,
      priority,
      transportCompany,
      location,
      category,
      orderNumber,
      deliveryDate,
      trackingNumber,
      status = 'not consider',
      attachments = null // new field for storing images as BLOB
    } = complaint;

    const query = `
      INSERT INTO transport_complaints
        (title, description, submitted_by, priority, transport_company, location, category, order_number, delivery_date, tracking_number, status, attachments)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    try {
      const [result] = await pool.execute(query, [
        title ?? null,
        description ?? null,
        submittedBy ?? null,
        priority ?? null,
        transportCompany ?? null,
        location ?? null,
        category ?? null,
        orderNumber ?? null,
        deliveryDate ? deliveryDate : null,
        trackingNumber ?? null,
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
    const query = 'SELECT * FROM transport_complaints ORDER BY id DESC';
    try {
      const [rows] = await pool.execute(query);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Get complaint by ID
  static async findById(id) {
    const query = 'SELECT * FROM transport_complaints WHERE id = ?';
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
    const query = `UPDATE transport_complaints SET ${fields.join(', ')} WHERE id = ?`;
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
    const query = 'DELETE FROM transport_complaints WHERE id = ?';
    try {
      const [result] = await pool.execute(query, [id]);
      return result;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = TransportComplaint;
