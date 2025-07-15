const { pool } = require('../config/database');

class Contact {
  // Create a new contact message
  static async create(contactData) {
    const {
      name,
      email,
      phone,
      subject,
      message,
      user_type,
      user_id = null // optional - if user is logged in
    } = contactData;

    const query = `
      INSERT INTO contacts (
        name, email, phone, subject, message, user_type, user_id,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())
    `;

    const values = [name, email, phone, subject, message, user_type, user_id];

    try {
      const [result] = await pool.execute(query, values);
      return {
        success: true,
        contactId: result.insertId,
        message: 'Contact message submitted successfully'
      };
    } catch (error) {
      console.error('Error creating contact:', error);
      throw error;
    }
  }

  // Get all contacts with pagination and filtering
  static async getAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      status = null,
      user_type = null,
      search = null,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = options;

    const offset = (page - 1) * limit;
    
    let whereClause = '1=1';
    const whereValues = [];

    // Add filters
    if (status) {
      whereClause += ' AND status = ?';
      whereValues.push(status);
    }

    if (user_type) {
      whereClause += ' AND user_type = ?';
      whereValues.push(user_type);
    }

    if (search) {
      whereClause += ' AND (name LIKE ? OR email LIKE ? OR subject LIKE ? OR message LIKE ?)';
      const searchPattern = `%${search}%`;
      whereValues.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // Count total records
    const countQuery = `SELECT COUNT(*) as total FROM contacts WHERE ${whereClause}`;
    const [countResult] = await pool.execute(countQuery, whereValues);
    const total = countResult[0].total;

    // Get paginated results
    const query = `
      SELECT 
        id, name, email, phone, subject, message, user_type, user_id,
        status, created_at, updated_at
      FROM contacts 
      WHERE ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    const queryValues = [...whereValues, limit, offset];

    try {
      const [rows] = await pool.execute(query, queryValues);
      return {
        success: true,
        data: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching contacts:', error);
      throw error;
    }
  }

  // Get contact by ID
  static async getById(contactId) {
    const query = `
      SELECT 
        id, name, email, phone, subject, message, user_type, user_id,
        status, created_at, updated_at
      FROM contacts 
      WHERE id = ?
    `;

    try {
      const [rows] = await pool.execute(query, [contactId]);
      if (rows.length === 0) {
        return {
          success: false,
          message: 'Contact not found'
        };
      }

      return {
        success: true,
        data: rows[0]
      };
    } catch (error) {
      console.error('Error fetching contact:', error);
      throw error;
    }
  }

  // Update contact status
  static async updateStatus(contactId, status, respondedBy = null) {
    const query = `
      UPDATE contacts 
      SET status = ?, responded_by = ?, updated_at = NOW()
      WHERE id = ?
    `;

    try {
      const [result] = await pool.execute(query, [status, respondedBy, contactId]);
      
      if (result.affectedRows === 0) {
        return {
          success: false,
          message: 'Contact not found'
        };
      }

      return {
        success: true,
        message: 'Contact status updated successfully'
      };
    } catch (error) {
      console.error('Error updating contact status:', error);
      throw error;
    }
  }

  // Delete contact
  static async delete(contactId) {
    const query = 'DELETE FROM contacts WHERE id = ?';

    try {
      const [result] = await pool.execute(query, [contactId]);
      
      if (result.affectedRows === 0) {
        return {
          success: false,
          message: 'Contact not found'
        };
      }

      return {
        success: true,
        message: 'Contact deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  }

  // Get contact statistics
  static async getStats() {
    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN user_type = 'farmer' THEN 1 ELSE 0 END) as farmer_contacts,
        SUM(CASE WHEN user_type = 'buyer' THEN 1 ELSE 0 END) as buyer_contacts,
        SUM(CASE WHEN user_type = 'supplier' THEN 1 ELSE 0 END) as supplier_contacts,
        SUM(CASE WHEN user_type = 'logistics' THEN 1 ELSE 0 END) as logistics_contacts,
        SUM(CASE WHEN user_type = 'organization' THEN 1 ELSE 0 END) as organization_contacts,
        SUM(CASE WHEN user_type = 'other' THEN 1 ELSE 0 END) as other_contacts
      FROM contacts
    `;

    try {
      const [rows] = await pool.execute(query);
      return {
        success: true,
        stats: rows[0]
      };
    } catch (error) {
      console.error('Error fetching contact stats:', error);
      throw error;
    }
  }
}

module.exports = Contact;
