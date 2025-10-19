const ShopProductModel = require('../models/shopProductModel');
const { pool } = require('../config/database');
const ShopOwner = require('../models/ShopOwner');

exports.createShopProduct = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. User not found in request.'
      });
    }

    if (req.user.role !== 'shop_owner') {
      return res.status(403).json({
        success: false,
        message: 'Only shop owners can create shop products.'
      });
    }

  const userId = req.user.id;

    // Resolve shop_id from shop_details
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [shopRows] = await connection.execute('SELECT id FROM shop_details WHERE user_id = ?', [userId]);
      const shopRow = shopRows && shopRows.length ? shopRows[0] : null;
      if (!shopRow) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ success: false, message: 'Shop details not found for user.' });
      }
      const shopId = shopRow.id;

      // Fetch owner district to store with the product for transporter matching
      const [ownerRows] = await connection.execute('SELECT district FROM users WHERE id = ? LIMIT 1', [userId]);
      const ownerDistrictRaw = ownerRows && ownerRows.length ? ownerRows[0].district : null;
      const ownerDistrict = ownerDistrictRaw ? ownerDistrictRaw.toString().trim() : null;

      // Resolve or create category. If no explicit category provided, fall back to product_type
      let categoryNameRaw = req.body.category === 'Other' ? req.body.category_other : req.body.category;
      if (!categoryNameRaw || !categoryNameRaw.toString().trim()) {
        // fallback to product_type (e.g. 'fertilizer', 'seeds', 'chemical')
        categoryNameRaw = req.body.product_type || null;
      }
      const categoryName = categoryNameRaw ? categoryNameRaw.toString().trim() : null;
      let categoryId = null;
      if (categoryName) {
        // Use case-insensitive lookup to match values like 'fertilizer' -> 'Fertilizer'
        const [catRows] = await connection.execute('SELECT id FROM product_categories WHERE LOWER(name) = LOWER(?)', [categoryName]);
        if (catRows.length) categoryId = catRows[0].id;
        else {
          const [catRes] = await connection.execute('INSERT INTO product_categories (name) VALUES (?)', [categoryName]);
          categoryId = catRes.insertId;
        }
      }

      // Ensure product_images table exists (for multi-image support)
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS product_images (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          product_id BIGINT NOT NULL,
          image LONGBLOB,
          image_mime VARCHAR(45),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )
      `);

      // Insert product (store primary image as first file if provided)
      const firstFile = req.files && req.files.length ? req.files[0] : null;
      const imageBuffer = firstFile ? firstFile.buffer : null;
      const imageMime = firstFile ? firstFile.mimetype : null;

      const [prodRes] = await connection.execute(
        `INSERT INTO products (shop_id, product_name, brand_name, description, category_id, image, image_mime, district)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          shopId,
          req.body.product_name,
          req.body.brand || null,
          req.body.product_description || null,
          categoryId || null,
          imageBuffer,
          imageMime,
          ownerDistrict
        ]
      );

      const productId = prodRes.insertId;

      // Insert all images into product_images table
      if (req.files && req.files.length) {
        for (const file of req.files) {
          await connection.execute(
            'INSERT INTO product_images (product_id, image, image_mime) VALUES (?, ?, ?)',
            [productId, file.buffer, file.mimetype]
          );
        }
      }

      // Insert into product_inventory
      const unit = req.body.unit || null;
      const price = parseFloat(req.body.price) || 0;
      const quantity = parseFloat(req.body.available_quantity || 0) || 0;
      const isAvailable = quantity > 0 ? 1 : 0;

      const [invRes] = await connection.execute(
        `INSERT INTO product_inventory (product_id, unit_type, unit_price, quantity, is_available)
         VALUES (?, ?, ?, ?, ?)`,
        [productId, unit, price, quantity, isAvailable]
      );

      await connection.commit();
      connection.release();

      return res.status(201).json({
        success: true,
        message: 'Product created successfully',
        productId,
        inventoryId: invRes.insertId
      });
    } catch (err) {
      await connection.rollback();
      connection.release();
      console.error('Error in product creation transaction:', err);
      return res.status(500).json({ success: false, message: 'Failed to create product', error: err.message });
    }
  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      stack: error.stack,
      body: req.body,
      files: req.files
    });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }
};
exports.getAllShopProducts = async (req, res) => {
  try {
    const products = await ShopProductModel.getAll();
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    console.error('Error fetching shop products:', error);
    res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};
exports.getMyShopProducts = async (req, res) => {
  try {
    const products = await ShopProductModel.getAllByUserId(req.user.id);
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    console.error('Error fetching shop products:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
exports.getAllViewMyShopProducts = async (req, res) => {
  try {
    // Return shop details for the view form (single object)
    const shopDetails = await ShopProductModel.getShopDetailsByUserId(req.user.id);
    if (!shopDetails) {
      return res.status(200).json({ success: false, message: 'No shop details found' });
    }
    res.status(200).json({ success: true, data: shopDetails });
  } catch (error) {
    console.error('Error fetching shop view data:', error);
    res.status(500).json({ success: false, message: 'Server error', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};
// Helper function

/*const getShopProductById = (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM shop_products WHERE id = ?';
  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching product', error: err });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(results[0]);
  });
};
*/

exports.getShopProductById = async (req, res) => {
  try {
    const product = await ShopProductModel.findById(req.params.shopitemid);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Normalize boolean flags if present
    if (product.organic_certified !== undefined) product.organic_certified = Boolean(product.organic_certified);
    if (product.terms_accepted !== undefined) product.terms_accepted = Boolean(product.terms_accepted);

    res.status(200).json({ success: true, product });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch product', error: error.message });
  }
};
exports.deleteShopProduct = async (req, res) => {
  try {
    const result = await ShopProductModel.deleteById(req.params.shopitemid);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      affectedRows: result.affectedRows
    });

  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product'
    });
  }

};

exports.updateProduct = async (req, res) => {
  try {
    const { shopitemid } = req.params;

  // Debug logs removed in production

    // Initialize update data with sanitized fields
    const updateData = {
      ...req.body,
      organic_certified: req.body.organic_certified === 'true',
      price: parseFloat(req.body.price),
      available_quantity: parseInt(req.body.available_quantity)
    };

    // Handle image updates
    if (req.files && req.files.length > 0) {
      // Convert uploaded files to base64 format
      const uploadedImages = req.files.map(file => ({
        buffer: file.buffer.toString('base64'),
        mimetype: file.mimetype,
        originalname: file.originalname,
        size: file.size
      }));

      // Get remaining images that weren't deleted
      let remainingImages = [];
      if (req.body.remainingImages) {
        try {
          remainingImages = JSON.parse(req.body.remainingImages);
          if (!Array.isArray(remainingImages)) {
            throw new Error('remainingImages must be an array');
          }
        } catch (err) {
          console.error('Error parsing remainingImages:', err);
          return res.status(400).json({ 
            success: false,
            message: 'Invalid remainingImages format'
          });
        }
      }

      // Combine new and remaining images, then stringify for DB
      updateData.images = JSON.stringify([...uploadedImages, ...remainingImages]);
    }

    // Remove fields that shouldn't be updated
    delete updateData.shopitemid;
    delete updateData.remainingImages;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update'
      });
    }

    const updatedProduct = await ShopProductModel.update(shopitemid, updateData);

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct
    });

  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Internal server error during update'
    });
  }
};

exports.updateShopDetails = async (req, res) => {
  try {
    if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: 'Authentication required' });

    const userId = req.user.id;
    const allowed = ['shop_name','business_registration_number','shop_address','shop_phone_number','shop_email','shop_description','shop_category','operating_hours','opening_days','delivery_areas','latitude','longitude'];
    const updates = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }

    if (Object.keys(updates).length === 0) return res.status(400).json({ success: false, message: 'No valid fields provided' });

    // Build update SQL
    const parts = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = Object.keys(updates).map(k => updates[k]);
    values.push(userId);

    const [result] = await pool.execute(`UPDATE shop_details SET ${parts} WHERE user_id = ?`, values);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Shop not found' });

    const [rows] = await pool.execute('SELECT * FROM shop_details WHERE user_id = ? LIMIT 1', [userId]);
    const shop = rows && rows.length ? rows[0] : null;
    return res.status(200).json({ success: true, data: shop });
  } catch (err) {
    console.error('Error updating shop details:', err);
    return res.status(500).json({ success: false, message: 'Failed to update shop details', error: err.message });
  }
};