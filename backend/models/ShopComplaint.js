const { pool } = require('../config/database');

class ShopComplaint {
  // Create a new shop complaint
  static async create(complaint) {
    const {
      title,
      description,
      submittedBy,
      priority,
      shopName,
      location,
      category,
      orderNumber,
      purchaseDate,
      attachments
    } = complaint;

    // Ensure attachments is always a JSON stringified array
    let attachmentsStr = '[]';
    if (Array.isArray(attachments)) attachmentsStr = JSON.stringify(attachments);
    else if (attachments) attachmentsStr = JSON.stringify([attachments]);

    const query = `
      INSERT INTO shop_complaints
        (title, description, submitted_by, priority, shop_name, location, category, order_number, purchase_date, attachments, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    const query = 'SELECT * FROM shop_complaints ORDER BY submitted_at DESC';
    try {
      const [rows] = await pool.execute(query);
      // Parse attachments JSON for each row
      return rows.map(row => {
        let parsed = [];
        if (row.attachments) {
          try { parsed = JSON.parse(row.attachments); } catch { parsed = []; }
        }
        // If only one attachment, return as string under 'image'
        if (Array.isArray(parsed) && parsed.length === 1) {
          return {
            ...row,
            image: parsed[0],
          };
        } else if (Array.isArray(parsed) && parsed.length > 1) {
          return {
            ...row,
            images: parsed,
          };
        } else {
          return {
            ...row,
            image: null,
          };
        }
      });
    } catch (error) {
      throw error;
    }
  }

  // Get complaint by ID
  static async findById(id) {
    const query = 'SELECT * FROM shop_complaints WHERE id = ?';
    try {
      const [rows] = await pool.execute(query, [id]);
      if (!rows[0]) return null;
      let parsed = [];
      if (rows[0].attachments) {
        try { parsed = JSON.parse(rows[0].attachments); } catch { parsed = []; }
      }
      // If only one attachment, return as string under 'image'
      if (Array.isArray(parsed) && parsed.length === 1) {
        return {
          ...rows[0],
          image: parsed[0],
        };
      } else if (Array.isArray(parsed) && parsed.length > 1) {
        return {
          ...rows[0],
          images: parsed,
        };
      } else {
        return {
          ...rows[0],
          image: null,
        };
      }
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
