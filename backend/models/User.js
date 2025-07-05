const { pool } = require('../config/database');

class User {
  // Create a new user
  static async create(userData) {
      const {
        full_name,
        email,
        password_hash,
        phone_number,
        district,
        nic,
        address,
        profile_image,
        user_type,
        land_size,
        birth_date,
        description,
        division_gramasewa_number,
        organization_committee_number,
        farming_experience,
        cultivated_crops,
        irrigation_system,
        soil_type,
        farming_certifications
      } = userData;
  
      const userQuery = `
        INSERT INTO users (
          full_name, email, password_hash, phone_number, district, nic,
          address, profile_image, user_type, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const userValues = [
        full_name, email, password_hash, phone_number, district, nic,
        address || null, profile_image || null, user_type, 1 // always active on create
      ];
  
      try {
        const [userResult] = await pool.execute(userQuery, userValues);
        const userId = userResult.insertId;
        console.log('User insert result:', userResult);

        if (user_type === 1) {
          const farmerQuery = `
            INSERT INTO farmer_details (
              user_id, land_size, description,
              division_gramasewa_number, organization_committee_number,
              farming_experience, cultivated_crops, irrigation_system,
              soil_type, farming_certifications
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          const farmerValues = [
            userId, land_size || null, description || null,
            division_gramasewa_number || null, organization_committee_number || null,
            farming_experience || null, cultivated_crops || null, irrigation_system || null,
            soil_type || null, farming_certifications || null
          ];
          const [farmerResult] = await pool.execute(farmerQuery, farmerValues);
          console.log('Farmer details insert result:', farmerResult);
        }

        return { user_id: userId };
      } catch (error) {
        console.error('User.create error:', error);
        throw error;
      }
    }

  // Find user by email
  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = ?';
    
    try {
      const [rows] = await pool.execute(query, [email]);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Find user by ID
  static async findById(id) {
    const query = 'SELECT * FROM users WHERE id = ?';
    
    try {
      const [rows] = await pool.execute(query, [id]);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Find user by NIC number
  static async findByNIC(nic) {
    const query = 'SELECT * FROM users WHERE nic = ?';
    try {
      const [rows] = await pool.execute(query, [nic]);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Update user verification status
  static async updateVerificationStatus(id, is_verified) {
    const query = 'UPDATE users SET is_verified = ? WHERE id = ?';
    
    try {
      const [result] = await pool.execute(query, [is_verified, id]);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Get all users with pagination
  static async findAll(limit = 50, offset = 0, role = null) {
    let query = 'SELECT id, name, email, contact_number, district, role, is_verified, is_active, created_at FROM users';
    let values = [];

    if (role) {
      query += ' WHERE role = ?';
      values.push(role);
    }

    query += ' ORDER BY created_at DESC';

    try {
      const [rows] = await pool.execute(query, values);
      return rows;
      return rows;
      return rows;
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Update user active status
  static async updateActiveStatus(id, is_active) {
    const query = 'UPDATE users SET is_active = ? WHERE id = ?';
    
    try {
      const [result] = await pool.execute(query, [is_active, id]);
      return result;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;
