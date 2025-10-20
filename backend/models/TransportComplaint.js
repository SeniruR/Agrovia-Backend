const { pool } = require('../config/database');

class TransportComplaint {
  // Create a new transport complaint
  static async create(complaint) {
    const {
      title,
      description,
      submittedBy,
  userId = null,
      priority,
      transportCompany,
      location,
      category,
      orderNumber,
      deliveryDate,
      attachments = null // new field for storing images as BLOB
    } = complaint;

    // Ensure attachments is always a JSON stringified array
    let attachmentsStr = '[]';
    if (Array.isArray(attachments)) attachmentsStr = JSON.stringify(attachments);
    else if (attachments) attachmentsStr = JSON.stringify([attachments]);

    const query = `
      INSERT INTO transport_complaints
        (title, description, submitted_by, user_id, priority, transport_company, location, category, order_number, delivery_date, attachments, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    try {
      const [result] = await pool.execute(query, [
        title ?? null,
        description ?? null,
        submittedBy ?? null,
        userId ?? null,
        priority ?? null,
        transportCompany ?? null,
        location ?? null,
        category ?? null,
        orderNumber ?? null,
        deliveryDate ? deliveryDate : null,
        attachmentsStr,
        new Date() // submitted_at as current timestamp
      ]);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Get all complaints
  static async findAll(userId = null) {
    // Return complaints with submitter full name joined from users
    let query = `
      SELECT tc.*, u.full_name AS submittedByName
      FROM transport_complaints tc
      LEFT JOIN users u ON tc.user_id = u.id
    `;
    const params = [];
    if (userId) {
      query += ' WHERE tc.submitted_by = ? OR tc.user_id = ?';
      params.push(userId, userId);
    }
    query += ' ORDER BY tc.submitted_at DESC';
    try {
      const [rows] = await pool.execute(query, params);
      // Parse attachments JSON for each row
  return rows.map(row => {
        let parsed = [];
        if (row.attachments) {
          try { parsed = JSON.parse(row.attachments); } catch { parsed = []; }
        }
        // If only one attachment, return as string
        return {
          ...row,
          attachments: Array.isArray(parsed) && parsed.length === 1 ? parsed[0] : parsed,
        };
      });
    } catch (error) {
      throw error;
    }
  }

  // Get complaint by ID
  static async findById(id) {
    const query = `
      SELECT tc.*, u.full_name AS submittedByName
      FROM transport_complaints tc
      LEFT JOIN users u ON tc.user_id = u.id
      WHERE tc.id = ?
    `;
    try {
      const [rows] = await pool.execute(query, [id]);
      if (!rows[0]) return null;
      let parsed = [];
      if (rows[0].attachments) {
        try { parsed = JSON.parse(rows[0].attachments); } catch { parsed = []; }
      }
      return {
        ...rows[0],
        attachments: Array.isArray(parsed) && parsed.length === 1 ? parsed[0] : parsed,
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
