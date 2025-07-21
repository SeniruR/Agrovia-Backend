const { pool } = require('../config/database');

class CropPost {
  // Create a new crop post
  static async create(cropData) {
    const {
      farmer_id,
      crop_name,
      crop_category,
      variety,
      quantity,
      unit,
      price_per_unit,
      minimum_quantity_bulk,
      harvest_date,
      expiry_date,
      location,
      district,
      description,
      organic_certified,
      pesticide_free,
      freshly_harvested,
      contact_number,
      email,
      status,
      images
    } = cropData;

    const query = `
      INSERT INTO crop_posts (
        farmer_id, crop_name, crop_category, variety, quantity, unit,
        price_per_unit, minimum_quantity_bulk, harvest_date, expiry_date, location, district,
        description, organic_certified, pesticide_free, freshly_harvested,
        contact_number, email, images, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const values = [
      farmer_id,
      crop_name,
      crop_category,
      variety || null,
      parseFloat(quantity),
      unit,
      parseFloat(price_per_unit),
      minimum_quantity_bulk === '' || minimum_quantity_bulk === undefined || minimum_quantity_bulk === null
        ? null
        : !isNaN(minimum_quantity_bulk)
          ? parseFloat(minimum_quantity_bulk)
          : null,
      harvest_date,
      expiry_date || null,
      location,
      district,
      description || null,
      organic_certified ? 1 : 0,
      pesticide_free ? 1 : 0,
      freshly_harvested ? 1 : 0,
      contact_number,
      email || null,
      JSON.stringify(images || []),
      status || 'active'
    ];

    try {
      const [result] = await pool.execute(query, values);
      return { id: result.insertId, ...cropData };
    } catch (error) {
      console.error('Error creating crop post:', error);
      throw error;
    }
  }

  // Get all crop posts with pagination (exclude deleted)
  static async getAll(page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT cp.*, u.full_name as farmer_name
      FROM crop_posts cp
      LEFT JOIN users u ON cp.farmer_id = u.id
      WHERE cp.status != 'deleted'
    `;
    const values = [];

    // Apply filters
    if (filters.crop_category) {
      query += ' AND cp.crop_category = ?';
      values.push(filters.crop_category);
    }
    if (filters.district) {
      query += ' AND cp.district = ?';
      values.push(filters.district);
    }
    if (filters.crop_name) {
      query += ' AND cp.crop_name LIKE ?';
      values.push(`%${filters.crop_name}%`);
    }
    if (filters.min_price) {
      query += ' AND cp.price_per_unit >= ?';
      values.push(parseFloat(filters.min_price));
    }
    if (filters.max_price) {
      query += ' AND cp.price_per_unit <= ?';
      values.push(parseFloat(filters.max_price));
    }

    query += ` ORDER BY cp.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    try {
      const [posts] = await pool.execute(query, values);
      const CropPostImage = require('./CropPostImage');
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      // For each post, fetch image URLs from CropPostImage
      const parsedPosts = await Promise.all(posts.map(async post => {
        const images = await CropPostImage.getByPostId(post.id);
        const imageUrls = images.map(img => `${baseUrl}/api/v1/crop-posts/${post.id}/images/${img.id}`);
        return {
          ...post,
          images: imageUrls,
          organic_certified: Boolean(post.organic_certified),
          pesticide_free: Boolean(post.pesticide_free),
          freshly_harvested: Boolean(post.freshly_harvested)
        };
      }));

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM crop_posts cp
        WHERE cp.status != 'deleted'
        ${filters.crop_category ? 'AND cp.crop_category = ?' : ''}
        ${filters.district ? 'AND cp.district = ?' : ''}
        ${filters.crop_name ? 'AND cp.crop_name LIKE ?' : ''}
        ${filters.min_price ? 'AND cp.price_per_unit >= ?' : ''}
        ${filters.max_price ? 'AND cp.price_per_unit <= ?' : ''}
      `;
      const countValues = [];
      if (filters.crop_category) countValues.push(filters.crop_category);
      if (filters.district) countValues.push(filters.district);
      if (filters.crop_name) countValues.push(`%${filters.crop_name}%`);
      if (filters.min_price) countValues.push(parseFloat(filters.min_price));
      if (filters.max_price) countValues.push(parseFloat(filters.max_price));

      const [countResult] = await pool.execute(countQuery, countValues);
      const total = countResult[0].total;

      return {
        posts: parsedPosts,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: limit
        }
      };
    } catch (error) {
      console.error('Error fetching crop posts:', error);
      throw error;
    }
  }

  // Get crop post by ID (exclude deleted)
  static async getById(id) {
    const query = `
      SELECT 
        cp.*, 
        u.full_name as farmer_name, 
        u.phone_number as farmer_phone,
        u.email as farmer_email,
        CASE 
          WHEN cp.minimum_quantity_bulk IS NOT NULL 
          THEN CONCAT('Min bulk: ', cp.minimum_quantity_bulk, ' ', cp.unit)
          ELSE 'No minimum bulk requirement'
        END as bulk_info
      FROM crop_posts cp
      LEFT JOIN users u ON cp.farmer_id = u.id
      WHERE cp.id = ? AND cp.status != 'deleted'
    `;

    try {
      const [posts] = await pool.execute(query, [id]);
      if (posts.length === 0) {
        return null;
      }

      const post = posts[0];
      
      // Fetch image BLOBs and return as URLs
      const CropPostImage = require('./CropPostImage');
      const images = await CropPostImage.getByPostId(post.id);
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      const imageUrls = images.map(img => `${baseUrl}/api/v1/crop-posts/${post.id}/images/${img.id}`);

      return {
        ...post,
        images: imageUrls,
        organic_certified: Boolean(post.organic_certified),
        pesticide_free: Boolean(post.pesticide_free),
        freshly_harvested: Boolean(post.freshly_harvested),
        has_minimum_bulk: post.minimum_quantity_bulk !== null,
        minimum_quantity_bulk: post.minimum_quantity_bulk ? parseFloat(post.minimum_quantity_bulk) : null,
        bulk_eligible: post.minimum_quantity_bulk !== null,
        total_value: parseFloat(post.price_per_unit) * parseFloat(post.quantity),
        bulk_minimum_value: post.minimum_quantity_bulk ? 
          parseFloat(post.price_per_unit) * parseFloat(post.minimum_quantity_bulk) : null
      };
    } catch (error) {
      console.error('Error fetching crop post by ID:', error);
      throw error;
    }
  }

  // Get crop posts by farmer ID
  static async getByFarmerId(farmerId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const query = `
      SELECT * FROM crop_posts
      WHERE farmer_id = ? AND status != 'deleted'
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    try {
      const [posts] = await pool.execute(query, [farmerId]);
      
      const parsedPosts = posts.map(post => ({
        ...post,
        images: JSON.parse(post.images || '[]'),
        organic_certified: Boolean(post.organic_certified),
        pesticide_free: Boolean(post.pesticide_free),
        freshly_harvested: Boolean(post.freshly_harvested)
      }));

      // Get total count
      const [countResult] = await pool.execute(
        'SELECT COUNT(*) as total FROM crop_posts WHERE farmer_id = ? AND status != "deleted"',
        [farmerId]
      );
      const total = countResult[0].total;

      return {
        posts: parsedPosts,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: limit
        }
      };
    } catch (error) {
      console.error('Error fetching farmer crop posts:', error);
      throw error;
    }
  }

  // Update crop post
  static async update(id, farmerId, updateData) {
    const {
      crop_name,
      crop_category,
      variety,
      quantity,
      unit,
      price_per_unit,
      minimum_quantity_bulk,
      harvest_date,
      expiry_date,
      location,
      district,
      description,
      organic_certified,
      pesticide_free,
      freshly_harvested,
      contact_number,
      email,
      images
    } = updateData;

    const query = `
      UPDATE crop_posts SET
        crop_name = ?, crop_category = ?, variety = ?, quantity = ?,
        unit = ?, price_per_unit = ?, minimum_quantity_bulk = ?, harvest_date = ?, expiry_date = ?,
        location = ?, district = ?, description = ?, organic_certified = ?,
        pesticide_free = ?, freshly_harvested = ?, contact_number = ?,
        email = ?, images = ?, updated_at = NOW()
      WHERE id = ? AND farmer_id = ?
    `;

    const values = [
      crop_name,
      crop_category,
      variety || null,
      parseFloat(quantity),
      unit,
      parseFloat(price_per_unit),
      minimum_quantity_bulk === '' || minimum_quantity_bulk === undefined || minimum_quantity_bulk === null
        ? null
        : !isNaN(minimum_quantity_bulk)
          ? parseFloat(minimum_quantity_bulk)
          : null,
      harvest_date,
      expiry_date || null,
      location,
      district,
      description || null,
      organic_certified ? 1 : 0,
      pesticide_free ? 1 : 0,
      freshly_harvested ? 1 : 0,
      contact_number,
      email || null,
      JSON.stringify(images || []),
      id,
      farmerId
    ];

    try {
      const [result] = await pool.execute(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating crop post:', error);
      throw error;
    }
  }

  // Delete crop post (soft delete)
  static async delete(id, farmerId) {
    const query = `
      UPDATE crop_posts SET status = 'deleted', updated_at = NOW()
      WHERE id = ? AND farmer_id = ?
    `;

    try {
      const [result] = await pool.execute(query, [id, farmerId]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting crop post:', error);
      throw error;
    }
  }

  // Update post status (admin only)
  static async updateStatus(id, status) {
    const query = `
      UPDATE crop_posts SET status = ?, updated_at = NOW()
      WHERE id = ?
    `;

    try {
      const [result] = await pool.execute(query, [status, id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating crop post status:', error);
      throw error;
    }
  }

  // Get crop statistics
  static async getStatistics() {
    const queries = {
      total: 'SELECT COUNT(*) as count FROM crop_posts WHERE status = ?',
      by_category: 'SELECT crop_category, COUNT(*) as count FROM crop_posts WHERE status = ? GROUP BY crop_category',
      by_district: 'SELECT district, COUNT(*) as count FROM crop_posts WHERE status = ? GROUP BY district ORDER BY count DESC LIMIT 10',
      recent: 'SELECT COUNT(*) as count FROM crop_posts WHERE status = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    };

    try {
      const [totalResult] = await pool.execute(queries.total, ['active']);
      const [categoryResult] = await pool.execute(queries.by_category, ['active']);
      const [districtResult] = await pool.execute(queries.by_district, ['active']);
      const [recentResult] = await pool.execute(queries.recent, ['active']);

      return {
        total_posts: totalResult[0].count,
        by_category: categoryResult,
        by_district: districtResult,
        recent_posts: recentResult[0].count
      };
    } catch (error) {
      console.error('Error fetching crop statistics:', error);
      throw error;
    }
  }

  // Get crop posts with enhanced details including minimum quantity bulk
  static async getAllWithBulkDetails(page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT 
        cp.*,
        u.full_name as farmer_name,
        u.phone_number as farmer_phone,
        u.email as farmer_email,
        CASE 
          WHEN cp.minimum_quantity_bulk IS NOT NULL 
          THEN CONCAT('Min bulk: ', cp.minimum_quantity_bulk, ' ', cp.unit)
          ELSE 'No minimum bulk requirement'
        END as bulk_info
      FROM crop_posts cp
      LEFT JOIN users u ON cp.farmer_id = u.id
      WHERE cp.status = 'active'
    `;
    const values = [];

    // Apply filters with enhanced district support
    if (filters.crop_category) {
      query += ' AND cp.crop_category = ?';
      values.push(filters.crop_category);
    }
    
    if (filters.district) {
      query += ' AND cp.district = ?';
      values.push(filters.district);
    }
    
    if (filters.crop_name) {
      query += ' AND cp.crop_name LIKE ?';
      values.push(`%${filters.crop_name}%`);
    }
    
    if (filters.min_price) {
      query += ' AND cp.price_per_unit >= ?';
      values.push(parseFloat(filters.min_price));
    }
    
    if (filters.max_price) {
      query += ' AND cp.price_per_unit <= ?';
      values.push(parseFloat(filters.max_price));
    }

    // Filter by bulk orders availability
    if (filters.has_bulk_pricing) {
      query += ' AND cp.minimum_quantity_bulk IS NOT NULL';
    }

    query += ` ORDER BY cp.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    try {
      const [posts] = await pool.execute(query, values);
      
      // Fetch image URLs from crop_post_images for each post
      const CropPostImage = require('./CropPostImage');
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      const parsedPosts = await Promise.all(posts.map(async post => {
        const images = await CropPostImage.getByPostId(post.id);
        const imageUrls = images.map(img => `${baseUrl}/api/v1/crop-posts/${post.id}/images/${img.id}`);
        return {
          ...post,
          images: imageUrls,
          organic_certified: Boolean(post.organic_certified),
          pesticide_free: Boolean(post.pesticide_free),
          freshly_harvested: Boolean(post.freshly_harvested),
          has_minimum_bulk: post.minimum_quantity_bulk !== null,
          minimum_quantity_bulk: post.minimum_quantity_bulk ? parseFloat(post.minimum_quantity_bulk) : null,
          bulk_eligible: post.minimum_quantity_bulk !== null,
          total_value: parseFloat(post.price_per_unit) * parseFloat(post.quantity),
          bulk_minimum_value: post.minimum_quantity_bulk ? 
            parseFloat(post.price_per_unit) * parseFloat(post.minimum_quantity_bulk) : null
        };
      }));

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM crop_posts cp
        WHERE cp.status = 'active'
        ${filters.crop_category ? 'AND cp.crop_category = ?' : ''}
        ${filters.district ? 'AND cp.district = ?' : ''}
        ${filters.crop_name ? 'AND cp.crop_name LIKE ?' : ''}
        ${filters.min_price ? 'AND cp.price_per_unit >= ?' : ''}
        ${filters.max_price ? 'AND cp.price_per_unit <= ?' : ''}
        ${filters.has_bulk_pricing ? 'AND cp.minimum_quantity_bulk IS NOT NULL' : ''}
      `;
      
      const countValues = [];
      if (filters.crop_category) countValues.push(filters.crop_category);
      if (filters.district) countValues.push(filters.district);
      if (filters.crop_name) countValues.push(`%${filters.crop_name}%`);
      if (filters.min_price) countValues.push(parseFloat(filters.min_price));
      if (filters.max_price) countValues.push(parseFloat(filters.max_price));

      const [countResult] = await pool.execute(countQuery, countValues);
      const total = countResult[0].total;

      return {
        posts: parsedPosts,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: limit
        }
      };
    } catch (error) {
      console.error('Error fetching enhanced crop posts:', error);
      throw error;
    }
  }

  // Get all available districts from crop posts
  static async getAvailableDistricts() {
    const query = `
      SELECT DISTINCT district, COUNT(*) as crop_count
      FROM crop_posts 
      WHERE status = 'active' AND district IS NOT NULL AND district != ''
      GROUP BY district
      ORDER BY district ASC
    `;

    try {
      const [districts] = await pool.execute(query);
      
      // Add full list of Sri Lankan districts for reference
      const allSriLankanDistricts = [
        'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
        'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
        'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
        'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
        'Moneragala', 'Ratnapura', 'Kegalle'
      ];

      return {
        available_districts: districts,
        all_sri_lankan_districts: allSriLankanDistricts,
        total_districts: districts.length
      };
    } catch (error) {
      console.error('Error fetching available districts:', error);
      throw error;
    }
  }

  // Get crop posts with bulk order focus
  static async getBulkOrderCrops(page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT 
        cp.*,
        u.full_name as farmer_name,
        u.phone_number as farmer_phone,
        ROUND((cp.quantity / cp.minimum_quantity_bulk), 2) as bulk_batches_available,
        (cp.price_per_unit * cp.minimum_quantity_bulk) as minimum_bulk_cost
      FROM crop_posts cp
      LEFT JOIN users u ON cp.farmer_id = u.id
      WHERE cp.status = 'active' 
        AND cp.minimum_quantity_bulk IS NOT NULL
        AND cp.minimum_quantity_bulk > 0
    `;
    const values = [];

    // Apply filters
    if (filters.district) {
      query += ' AND cp.district = ?';
      values.push(filters.district);
    }
    
    if (filters.crop_category) {
      query += ' AND cp.crop_category = ?';
      values.push(filters.crop_category);
    }

    if (filters.max_bulk_cost) {
      query += ' AND (cp.price_per_unit * cp.minimum_quantity_bulk) <= ?';
      values.push(parseFloat(filters.max_bulk_cost));
    }

    query += ` ORDER BY cp.minimum_quantity_bulk ASC, cp.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    try {
      const [posts] = await pool.execute(query, values);
      
      const parsedPosts = posts.map(post => {
        // Safely parse images JSON
        let parsedImages = [];
        try {
          if (post.images && typeof post.images === 'string' && post.images.trim() !== '') {
            parsedImages = JSON.parse(post.images);
          }
        } catch (jsonError) {
          console.warn('Failed to parse images JSON for bulk crop post', post.id, ':', jsonError.message);
          parsedImages = [];
        }
        
        return {
          ...post,
          images: parsedImages,
          organic_certified: Boolean(post.organic_certified),
          pesticide_free: Boolean(post.pesticide_free),
          freshly_harvested: Boolean(post.freshly_harvested),
          minimum_quantity_bulk: parseFloat(post.minimum_quantity_bulk),
          minimum_bulk_cost: parseFloat(post.minimum_bulk_cost),
          bulk_batches_available: parseFloat(post.bulk_batches_available)
        };
      });

      return {
        bulk_crops: parsedPosts,
        summary: {
          total_bulk_crops: parsedPosts.length,
          average_minimum_bulk: parsedPosts.reduce((sum, p) => sum + p.minimum_quantity_bulk, 0) / parsedPosts.length
        }
      };
    } catch (error) {
      console.error('Error fetching bulk order crops:', error);
      throw error;
    }
  }
  

  static async updateById(id, farmerId, fields) {
    // Always set status to 'active' after edit
  fields.status = 'active';
    // Build dynamic SET clause for MySQL
    const setClause = [];
    const values = [];
    for (const [key, value] of Object.entries(fields)) {
      setClause.push(`${key} = ?`);
      values.push(value);
    }
    if (setClause.length === 0) return false;

    // Add id and farmerId for WHERE clause
    values.push(id, farmerId);

    const updateQuery = `
      UPDATE crop_posts
      SET ${setClause.join(', ')}
      WHERE id = ? AND farmer_id = ?
    `;
    const [result] = await pool.execute(updateQuery, values);
    if (result.affectedRows === 0) return null;

    // Fetch the updated row
    const [rows] = await pool.execute(
      'SELECT * FROM crop_posts WHERE id = ? AND farmer_id = ?',
      [id, farmerId]
    );
    return rows[0] || null;
  }
}




module.exports = CropPost;
