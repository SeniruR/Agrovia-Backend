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
      images
    } = cropData;

    const query = `
      INSERT INTO crop_posts (
        farmer_id, crop_name, crop_category, variety, quantity, unit,
        price_per_unit, minimum_quantity_bulk, harvest_date, expiry_date, location, district,
        description, organic_certified, pesticide_free, freshly_harvested,
        contact_number, email, images, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW())
    `;

    const values = [
      farmer_id,
      crop_name,
      crop_category,
      variety || null,
      parseFloat(quantity),
      unit,
      parseFloat(price_per_unit),
      minimum_quantity_bulk ? parseFloat(minimum_quantity_bulk) : null,
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
      JSON.stringify(images || [])
    ];

    try {
      const [result] = await pool.execute(query, values);
      return { id: result.insertId, ...cropData };
    } catch (error) {
      console.error('Error creating crop post:', error);
      throw error;
    }
  }

  // Get all crop posts with pagination
  static async getAll(page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT cp.*, u.full_name as farmer_name
      FROM crop_posts cp
      LEFT JOIN users u ON cp.farmer_id = u.id
      WHERE cp.status = 'active'
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
      
      // Parse images JSON for each post
      const parsedPosts = posts.map(post => ({
        ...post,
        images: JSON.parse(post.images || '[]'),
        organic_certified: Boolean(post.organic_certified),
        pesticide_free: Boolean(post.pesticide_free),
        freshly_harvested: Boolean(post.freshly_harvested)
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

  // Get crop post by ID
  static async getById(id) {
    const query = `
      SELECT cp.*, u.full_name as farmer_name, u.phone_number as farmer_phone
      FROM crop_posts cp
      LEFT JOIN users u ON cp.farmer_id = u.id
      WHERE cp.id = ? AND cp.status = 'active'
    `;

    try {
      const [posts] = await pool.execute(query, [id]);
      if (posts.length === 0) {
        return null;
      }

      const post = posts[0];
      return {
        ...post,
        images: JSON.parse(post.images || '[]'),
        organic_certified: Boolean(post.organic_certified),
        pesticide_free: Boolean(post.pesticide_free),
        freshly_harvested: Boolean(post.freshly_harvested)
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
        unit = ?, price_per_unit = ?, harvest_date = ?, expiry_date = ?,
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
}

module.exports = CropPost;
