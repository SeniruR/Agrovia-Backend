const { pool } = require('../config/database');

class UserController {
  // GET /users?userType=1,1.1&search=NAME - search users by type and name (for farmer search)
  static async searchUsers(req, res) {
    try {
      let { userType, search } = req.query;
      let types = [];
      if (userType) {
        types = userType.split(',').map(t => t.trim());
      } else {
        types = ['1', '1.1']; // default to farmer types
      }
      let sql = 'SELECT id, full_name, district, phone_number FROM users WHERE user_type IN (' + types.map(() => '?').join(',') + ')';
      let params = [...types];
      if (search && search.length > 0) {
        sql += ' AND full_name LIKE ?';
        params.push(`%${search}%`);
      }
      sql += ' ORDER BY full_name LIMIT 20';
      const [rows] = await pool.execute(sql, params);
      res.json(rows);
    } catch (err) {
      console.error('User search error:', err);
      res.status(500).json({ error: 'Failed to search users' });
    }
  }
  // PATCH /users/:id/farmer-organization - update organization_id in farmer_details
  static async updateFarmerOrganization(req, res) {
    try {
      const userId = req.params.id;
      const { organization_id } = req.body;
      if (!organization_id) {
        return res.status(400).json({ success: false, message: 'organization_id is required' });
      }
      const query = 'UPDATE farmer_details SET organization_id = ? WHERE user_id = ?';
      const [result] = await require('../config/database').pool.execute(query, [organization_id, userId]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Farmer details not found or organization_id not changed' });
      }
      return res.json({ success: true, message: 'Farmer organization_id updated successfully' });
    } catch (err) {
      console.error('Error updating farmer_details organization_id:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
  // PATCH /users/:id/organization - update user's organization_id
  static async updateUserOrganization(req, res) {
    try {
      const userId = req.params.id;
      const { organization_id } = req.body;
      if (!organization_id) {
        return res.status(400).json({ success: false, message: 'organization_id is required' });
      }
      const query = 'UPDATE users SET organization_id = ? WHERE id = ?';
      const [result] = await pool.execute(query, [organization_id, userId]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'User not found or organization_id not changed' });
      }
      return res.json({ success: true, message: 'User organization_id updated successfully' });
    } catch (err) {
      console.error('Error updating user organization_id:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
  // Get user profile image
  static async getProfileImage(req, res) {
    try {
      const userId = req.params.id;
      console.log(`📷 Profile image request for user ID: ${userId}`);
      
      const query = `SELECT profile_image, profile_image_mime FROM users WHERE id = ?`;
      const [rows] = await pool.execute(query, [userId]);
      
      if (rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      const user = rows[0];
      
      if (!user.profile_image) {
        return res.status(404).json({ 
          success: false, 
          message: 'Profile image not found' 
        });
      }
      
      // Set appropriate headers
      const mimeType = user.profile_image_mime || 'image/jpeg';
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      
      // Send the image blob
      res.send(user.profile_image);
      
    } catch (error) {
      console.error('❌ Get profile image error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve profile image',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get shop owner details by user_id
  static async getShopOwnerDetailsByUserId(req, res) {
    try {
      const userId = req.params.id;
      const query = `SELECT * FROM shop_details WHERE user_id = ?`;
      const [rows] = await pool.execute(query, [userId]);
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Shop owner details not found' });
      }
      res.json({ success: true, data: rows[0] });
    } catch (error) {
      console.error('❌ Get shop owner details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve shop owner details',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
  // Update user active status (activate/suspend)
  static async updateUserActiveStatus(req, res) {
    try {
      const userId = req.params.id;
      const { is_active } = req.body;
      if (typeof is_active === 'undefined') {
        return res.status(400).json({ success: false, message: 'is_active is required' });
      }
      const query = 'UPDATE users SET is_active = ? WHERE id = ?';
      const [result] = await pool.execute(query, [is_active, userId]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      res.json({ success: true, message: 'User status updated successfully' });
    } catch (error) {
      console.error('❌ Update user active status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user status',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
  // Get all users (admin)
  static async getAllUsers(req, res) {
    try {
      console.log('📋 Admin get all users request received');
      const query = `
        SELECT u.id, u.full_name, u.email, u.phone_number, u.district, u.user_type, ut.user_type_name AS role_name, u.is_active, u.created_at
        FROM users u
        LEFT JOIN user_types ut ON u.user_type = ut.id
        ORDER BY u.created_at DESC
      `;
      const [rows] = await pool.execute(query);
      res.json({
        success: true,
        message: 'All users retrieved successfully',
        data: rows
      });
    } catch (error) {
      console.error('❌ Get all users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve users',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
  // Get user profile
  static async getUserProfile(req, res) {
    try {
      console.log('📋 Get user profile request received');
      
      // For testing, use a default user ID or get from headers
      const userId = req.headers['x-user-id'] || req.user?.id || 1;
      
      const query = `
        SELECT id, full_name, email, phone_number, district, nic, address, 
               profile_image, user_type, created_at
        FROM users 
        WHERE id = ?
      `;

      const [rows] = await pool.execute(query, [userId]);
      
      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = rows[0];

      res.json({
        success: true,
        message: 'User profile retrieved successfully',
        data: user
      });
    } catch (error) {
      console.error('❌ Get user profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user profile',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get user's crop posting history for suggestions
  static async getUserCropHistory(req, res) {
    try {
      console.log('📋 Get user crop history request received');
      
      const userId = req.headers['x-user-id'] || req.user?.id || 1;
      
      const query = `
        SELECT DISTINCT crop_name, crop_category, variety, unit, district, location
        FROM crop_posts 
        WHERE farmer_id = ? 
        ORDER BY created_at DESC 
        LIMIT 10
      `;

      const [rows] = await pool.execute(query, [userId]);

      res.json({
        success: true,
        message: 'User crop history retrieved successfully',
        data: rows
      });
    } catch (error) {
      console.error('❌ Get user crop history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve crop history',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Update user profile
  static async updateUserProfile(req, res) {
    try {
      console.log('📝 Update user profile request received');
      
      const userId = req.headers['x-user-id'] || req.user?.id || 1;
      const { full_name, email, phone_number, district, address } = req.body;

      const query = `
        UPDATE users 
        SET full_name = ?, email = ?, phone_number = ?, district = ?, address = ?, 
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      const [result] = await pool.execute(query, [
        full_name, email, phone_number, district, address, userId
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'User profile updated successfully'
      });
    } catch (error) {
      console.error('❌ Update user profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user profile',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get farmer details by user_id
  static async getFarmerDetailsByUserId(req, res) {
    try {
      const userId = req.params.id;
      // Join farmer_details with organizations to get org_name
      const query = `
        SELECT f.*, o.org_name
        FROM farmer_details f
        LEFT JOIN organizations o ON f.organization_id = o.id
        WHERE f.user_id = ?
      `;
      const [rows] = await pool.execute(query, [userId]);
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Farmer details not found' });
      }
      res.json({ success: true, data: rows[0] });
    } catch (error) {
      console.error('❌ Get farmer details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve farmer details',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get buyer details by user_id
  static async getBuyerDetailsByUserId(req, res) {
    try {
      const userId = req.params.id;
      const query = `
        SELECT * FROM buyer_details WHERE user_id = ?
      `;
      const [rows] = await pool.execute(query, [userId]);
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Buyer details not found' });
      }
      res.json({ success: true, data: rows[0] });
    } catch (error) {
      console.error('❌ Get buyer details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve buyer details',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Update user active status (activate/deactivate)
  static async updateUserActiveStatus(req, res) {
    try {
      const userId = req.params.id;
      const { is_active } = req.body;

      // Validate input
      if (typeof is_active !== 'number' || (is_active !== 0 && is_active !== 1)) {
        return res.status(400).json({ 
          success: false, 
          message: 'is_active must be 0 (deactivate) or 1 (activate)' 
        });
      }

      // Check if user exists
      const [userCheck] = await pool.execute('SELECT id, full_name FROM users WHERE id = ?', [userId]);
      if (userCheck.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      // Update user active status
      const [result] = await pool.execute(
        'UPDATE users SET is_active = ? WHERE id = ?',
        [is_active, userId]
      );

      if (result.affectedRows === 0) {
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to update user status' 
        });
      }

      const action = is_active === 1 ? 'activated' : 'deactivated';
      res.json({ 
        success: true, 
        message: `User account ${action} successfully`,
        user: {
          id: userId,
          full_name: userCheck[0].full_name,
          is_active: is_active
        }
      });

    } catch (error) {
      console.error('❌ Update user active status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user status',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = UserController;
