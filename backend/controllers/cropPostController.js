const { pool } = require('../config/database');
const CropPost = require('../models/CropPost');

class CropPostController {
  // Create new crop post
  static async createCropPost(req, res) {
    try {
      console.log('📝 Create crop post request received');
      
      // Get the farmer ID from the authenticated user
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required. User not found in request.'
        });
      }

      if (req.user.role !== 'farmer') {
        return res.status(403).json({
          success: false,
          message: 'Only farmers can create crop posts.'
        });
      }

      const farmerId = req.user.id;
      console.log('✅ Creating crop post for farmer ID:', farmerId);
      
      const {
        crop_category = 'vegetables',
        crop_name = '',
        variety = null,
        quantity = 0,
        unit = 'kg',
        price_per_unit = 0,
        minimum_quantity_bulk = null,
        harvest_date = null,
        expiry_date = null,
        location = '',
        district = '',
        description = null,
        contact_number = '',
        email = null,
        organic_certified = false,
        pesticide_free = false,
        freshly_harvested = false
      } = req.body;

      // Handle uploaded images
      let images = [];
      if (req.files && req.files.length > 0) {
        images = req.files.map(file => ({
          filename: file.filename,
          originalname: file.originalname,
          path: `/uploads/crop-images/${file.filename}`,
          size: file.size
        }));
      }

      // Ensure minimum_quantity_bulk is stored as null if blank/invalid
      let minBulk = minimum_quantity_bulk;
      if (minBulk === '' || minBulk === undefined || minBulk === null) {
        minBulk = null;
      } else if (!isNaN(minBulk)) {
        minBulk = Number(minBulk);
        if (isNaN(minBulk)) minBulk = null;
      } else {
        minBulk = null;
      }

      const query = `
        INSERT INTO crop_posts (
          farmer_id, crop_category, crop_name, variety, quantity, unit, 
          price_per_unit, minimum_quantity_bulk, harvest_date, expiry_date, location, district, 
          description, contact_number, email, organic_certified, 
          pesticide_free, freshly_harvested, images
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        farmerId, // Use the authenticated farmer's ID
        crop_category, 
        crop_name, 
        variety, 
        quantity, 
        unit,
        price_per_unit, 
        minBulk,
        harvest_date, 
        expiry_date, 
        location, 
        district,
        description, 
        contact_number, 
        email,
        organic_certified === 'true' || organic_certified === true,
        pesticide_free === 'true' || pesticide_free === true,
        freshly_harvested === 'true' || freshly_harvested === true,
        JSON.stringify(images)
      ];

      console.log('Executing query with values:', values);
      const [result] = await pool.execute(query, values);
      console.log('✅ Crop post created with ID:', result.insertId);
      console.log('✅ Created for farmer ID:', farmerId);

      res.status(201).json({
        success: true,
        message: 'Crop post created successfully',
        data: {
          id: result.insertId,
          farmer_id: farmerId, // Include the farmer ID in response
          ...req.body,
          images
        }
      });
    } catch (error) {
      console.error('❌ Create crop post error:', error);
      
      // Clean up uploaded files if database operation fails
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          fs.unlink(file.path, (err) => {
            if (err) console.error('Error deleting file:', err);
          });
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create crop post',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get all crop posts
  static async getAllCropPosts(req, res) {
    try {
      console.log('📋 Get all crop posts request received');
      
      const query = `
        SELECT cp.*, u.full_name as user_name
        FROM crop_posts cp
        LEFT JOIN users u ON cp.farmer_id = u.id
        ORDER BY cp.created_at DESC
        LIMIT 50
      `;

      const [rows] = await pool.execute(query);
      const cropPosts = rows.map(post => {
        let images = [];
        try {
          images = JSON.parse(post.images || '[]');
        } catch (e) {
          console.warn('Failed to parse images JSON for post', post.id, ':', e.message);
          images = [];
        }
        
        return {
          ...post,
          images
        };
      });

      res.json({
        success: true,
        message: 'Crop posts retrieved successfully',
        data: cropPosts,
        count: cropPosts.length
      });
    } catch (error) {
      console.error('❌ Get all crop posts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve crop posts',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get all crop posts with enhanced details including bulk quantities
  static async getAllCropPostsEnhanced(req, res) {
    try {
      console.log('📋 Get enhanced crop posts request received');
      
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const filters = {
        crop_category: req.query.category,
        district: req.query.district,
        crop_name: req.query.search,
        min_price: req.query.min_price,
        max_price: req.query.max_price,
        has_bulk_pricing: req.query.bulk_only === 'true'
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined || filters[key] === '') {
          delete filters[key];
        }
      });

      const result = await CropPost.getAllWithBulkDetails(page, limit, filters);

      res.json({
        success: true,
        message: 'Enhanced crop posts retrieved successfully',
        data: result.posts,
        pagination: result.pagination,
        filters_applied: filters
      });
    } catch (error) {
      console.error('❌ Get enhanced crop posts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve enhanced crop posts',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get available districts from crop posts
  static async getAvailableDistricts(req, res) {
    try {
      console.log('🗺️ Get available districts request received');
      
      const result = await CropPost.getAvailableDistricts();

      res.json({
        success: true,
        message: 'Available districts retrieved successfully',
        data: result
      });
    } catch (error) {
      console.error('❌ Get available districts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve available districts',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get crop posts suitable for bulk orders
  static async getBulkOrderCrops(req, res) {
    try {
      console.log('📦 Get bulk order crops request received');
      
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const filters = {
        district: req.query.district,
        crop_category: req.query.category,
        max_bulk_cost: req.query.max_bulk_cost
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined || filters[key] === '') {
          delete filters[key];
        }
      });

      const result = await CropPost.getBulkOrderCrops(page, limit, filters);

      res.json({
        success: true,
        message: 'Bulk order crops retrieved successfully',
        data: result.bulk_crops,
        summary: result.summary,
        filters_applied: filters
      });
    } catch (error) {
      console.error('❌ Get bulk order crops error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve bulk order crops',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get crop post by ID
  static async getCropPostById(req, res) {
    try {
      const { id } = req.params;
      
      const query = `
        SELECT cp.*, u.full_name as user_name
        FROM crop_posts cp
        LEFT JOIN users u ON cp.farmer_id = u.id
        WHERE cp.id = ?
      `;

      const [rows] = await pool.execute(query, [id]);
      
      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Crop post not found'
        });
      }

      const post = rows[0];
      try {
        post.images = JSON.parse(post.images || '[]');
      } catch (e) {
        console.warn('Failed to parse images JSON for post', post.id, ':', e.message);
        post.images = [];
      }

      res.json({
        success: true,
        message: 'Crop post retrieved successfully',
        data: post
      });
    } catch (error) {
      console.error('❌ Get crop post by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve crop post',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get crop post by ID with enhanced details
  static async getCropPostByIdEnhanced(req, res) {
    try {
      const { id } = req.params;
      console.log('📋 Get enhanced crop post by ID request received for ID:', id);
      
      const post = await CropPost.getById(id);
      
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Crop post not found'
        });
      }

      res.json({
        success: true,
        message: 'Enhanced crop post retrieved successfully',
        data: post
      });
    } catch (error) {
      console.error('❌ Get enhanced crop post by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve enhanced crop post',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get user's crop posts
  static async getUserCropPosts(req, res) {
    try {
      // Get the farmer ID from the authenticated user
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required. User not found in request.'
        });
      }

      const farmerId = req.user.id;
      console.log('� Getting crop posts for farmer ID:', farmerId);
      
      const query = `
        SELECT * FROM crop_posts 
        WHERE farmer_id = ? 
        ORDER BY created_at DESC
      `;

      const [rows] = await pool.execute(query, [farmerId]);
      const cropPosts = rows.map(post => {
        let images = [];
        try {
          images = JSON.parse(post.images || '[]');
        } catch (e) {
          console.warn('Failed to parse images JSON for post', post.id, ':', e.message);
          images = [];
        }
        
        return {
          ...post,
          images
        };
      });

      res.json({
        success: true,
        message: 'User crop posts retrieved successfully',
        data: cropPosts,
        count: cropPosts.length
      });
    } catch (error) {
      console.error('❌ Get user crop posts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user crop posts',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Update crop post
  static async updateCropPost(req, res) {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };

      // Handle new uploaded images
      if (req.files && req.files.length > 0) {
        updateData.images = req.files.map(file => ({
          filename: file.filename,
          originalname: file.originalname,
          path: `/uploads/crop-images/${file.filename}`,
          size: file.size
        }));
      }

      const fields = [];
      const values = [];

      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          if (key === 'images') {
            fields.push(`${key} = ?`);
            values.push(JSON.stringify(updateData[key]));
          } else {
            fields.push(`${key} = ?`);
            values.push(updateData[key]);
          }
        }
      });

      if (fields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      values.push(id);
      const query = `UPDATE crop_posts SET ${fields.join(', ')} WHERE id = ?`;
      const [result] = await pool.execute(query, values);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Crop post not found'
        });
      }

      res.json({
        success: true,
        message: 'Crop post updated successfully'
      });
    } catch (error) {
      console.error('❌ Update crop post error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update crop post',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Delete crop post
  static async deleteCropPost(req, res) {
    try {
      const { id } = req.params;
      
      const query = 'DELETE FROM crop_posts WHERE id = ?';
      const [result] = await pool.execute(query, [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Crop post not found'
        });
      }

      res.json({
        success: true,
        message: 'Crop post deleted successfully'
      });
    } catch (error) {
      console.error('❌ Delete crop post error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete crop post',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get crop post statistics
  static async getCropPostStats(req, res) {
    try {
      const queries = [
        'SELECT COUNT(*) as total_posts FROM crop_posts',
        'SELECT COUNT(*) as pending_posts FROM crop_posts WHERE status = "pending"',
        'SELECT COUNT(*) as approved_posts FROM crop_posts WHERE status = "approved"',
        'SELECT COUNT(*) as available_posts FROM crop_posts WHERE status = "available"',
        'SELECT COUNT(*) as organic_posts FROM crop_posts WHERE organic_certified = TRUE'
      ];

      const results = await Promise.all(
        queries.map(query => pool.execute(query))
      );

      const stats = {
        total_posts: results[0][0][0].total_posts,
        pending_posts: results[1][0][0].pending_posts,
        approved_posts: results[2][0][0].approved_posts,
        available_posts: results[3][0][0].available_posts,
        organic_posts: results[4][0][0].organic_posts
      };

      res.json({
        success: true,
        message: 'Crop post statistics retrieved successfully',
        data: stats
      });
    } catch (error) {
      console.error('❌ Get crop post stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve crop post statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Update crop post status (admin only)
  static async updateCropPostStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['pending', 'approved', 'rejected', 'sold', 'available'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status value'
        });
      }

      const query = 'UPDATE crop_posts SET status = ? WHERE id = ?';
      const [result] = await pool.execute(query, [status, id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Crop post not found'
        });
      }

      res.json({
        success: true,
        message: 'Crop post status updated successfully'
      });
    } catch (error) {
      console.error('❌ Update crop post status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update crop post status',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = CropPostController;
