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

    // Ensure attachments is always a JSON stringified array
    let attachmentsStr = '[]';
    if (Array.isArray(attachments)) attachmentsStr = JSON.stringify(attachments);
    else if (attachments) attachmentsStr = JSON.stringify([attachments]);

    const query = `
      INSERT INTO transport_complaints
        (title, description, submitted_by, priority, transport_company, location, category, order_number, delivery_date, tracking_number, status, attachments, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        attachmentsStr,
        new Date() // submitted_at as current timestamp
      ]);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Get all complaints
  static async findAll() {
    const query = 'SELECT * FROM transport_complaints ORDER BY submitted_at DESC';
    try {
      const [rows] = await pool.execute(query);
      // Parse attachments JSON for each row
      return rows.map(row => ({
        ...row,
        attachments: row.attachments ? JSON.parse(row.attachments) : [],
      }));
    } catch (error) {
      throw error;
    }
  }

  // Get complaint by ID
  static async findById(id) {
    const query = 'SELECT * FROM transport_complaints WHERE id = ?';
    try {
      const [rows] = await pool.execute(query, [id]);
      if (!rows[0]) return null;
      return {
        ...rows[0],
        attachments: rows[0].attachments ? JSON.parse(rows[0].attachments) : [],
      };
    } catch (error) {
      throw error;
    }
  }

  // Update complaint
  static async update(id, data) {
    const fields = [];
    const values = [];
    for (const key in data) {
      if (key === 'attachments') {
        // Always store as JSON string
        if (Array.isArray(data[key])) values.push(JSON.stringify(data[key]));
        else if (data[key]) values.push(JSON.stringify([data[key]]));
        else values.push('[]');
        fields.push('attachments = ?');
      } else {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
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
