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
      attachments = null // images as BLOB
    } = complaint;

    // Ensure attachments is always a JSON stringified array
    let attachmentsStr = '[]';
    if (Array.isArray(attachments)) attachmentsStr = JSON.stringify(attachments);
    else if (attachments) attachmentsStr = JSON.stringify([attachments]);

    const query = `
      INSERT INTO crop_complaints
        (title, description, submitted_by, priority, crop_type, farmer, category, order_number, attachments, submitted_at)
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
    const query = 'SELECT * FROM crop_complaints ORDER BY submitted_at DESC';
    try {
      const [rows] = await pool.execute(query);
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
    const query = 'SELECT * FROM crop_complaints WHERE id = ?';
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
    const query = `UPDATE crop_complaints SET ${fields.join(', ')} WHERE id = ?`;
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
