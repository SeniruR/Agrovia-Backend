const { pool } = require('../config/database');

// Helper to convert Buffer to data URL
function bufferToDataUrl(buffer, mime) {
  if (!buffer) return null;
  const base64 = buffer.toString('base64');
  return `data:${mime || 'image/jpeg'};base64,${base64}`;
}

const ShopProductModel = {
  // Get all products (for admin/listing)
  getAll: async () => {
    const [rows] = await pool.execute(`
   SELECT p.id AS productId, p.shop_id, p.product_name, p.brand_name, p.description,
     p.category_id, p.image AS primary_image, p.image_mime AS primary_mime,
     inv.unit_type, inv.unit_price, inv.quantity, inv.is_available,
     pc.name AS category_name,
       sd.id AS shop_detail_id, sd.shop_name,
       sd.is_active,
       u.full_name AS owner_name,
       COALESCE(sd.shop_phone_number, u.phone_number) AS phone_no,
       COALESCE(sd.shop_email, u.email) AS email,
       sd.shop_address,
       sd.business_registration_number,
       sd.shop_description,
       sd.shop_category,
       sd.operating_hours,
       sd.opening_days,
       sd.delivery_areas,
       sd.latitude,
       sd.longitude,
       sd.shop_image AS shop_image_blob, sd.shop_image_mime,
         COALESCE(p.district, u.district) AS district,
         COALESCE(p.district, u.district) AS city,
       sr.average_rating,
       sr.review_count,
       sr.last_reviewed_at,
     pi.id AS image_id, pi.image AS image_blob, pi.image_mime AS image_mime
      FROM products p
      LEFT JOIN product_inventory inv ON inv.product_id = p.id
      LEFT JOIN product_images pi ON pi.product_id = p.id
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      LEFT JOIN shop_details sd ON sd.id = p.shop_id
      LEFT JOIN users u ON u.id = sd.user_id
      LEFT JOIN (
        SELECT shop_id, AVG(rating) AS average_rating, COUNT(*) AS review_count, MAX(created_at) AS last_reviewed_at
        FROM shop_reviews
        GROUP BY shop_id
      ) sr ON sr.shop_id = p.id
      ORDER BY p.id DESC
    `);

    // Group rows by productId
    const map = new Map();
    for (const r of rows) {
      const pid = r.productId;
      if (!map.has(pid)) {
          map.set(pid, {
          id: pid,
          shop_id: r.shop_id,
          shop_name: r.shop_name,
          owner_name: r.owner_name,
          phone_no: r.phone_no,
          email: r.email,
          shop_address: r.shop_address,
          business_registration_number: r.business_registration_number,
          shop_description: r.shop_description,
          shop_category: r.shop_category,
          operating_hours: r.operating_hours,
          opening_days: r.opening_days,
          delivery_areas: r.delivery_areas,
          latitude: r.latitude,
          longitude: r.longitude,
          shop_image: bufferToDataUrl(r.shop_image_blob, r.shop_image_mime),
          is_active: typeof r.is_active !== 'undefined' ? r.is_active : null,
          city: r.city,
          district: r.district || r.city || null,
          product_name: r.product_name,
          brand: r.brand_name,
          product_description: r.description,
          category_id: r.category_id,
          category: r.category_name,
          unit: r.unit_type,
          price: r.unit_price,
          available_quantity: r.quantity,
          is_available: r.is_available,
          average_rating: r.average_rating !== null && r.average_rating !== undefined ? Number(r.average_rating) : null,
          review_count: r.review_count !== null && r.review_count !== undefined ? Number(r.review_count) : 0,
          last_reviewed_at: r.last_reviewed_at,
          images: []
        });
        // primary image
        if (r.primary_image) {
          const url = bufferToDataUrl(r.primary_image, r.primary_mime);
          if (url) map.get(pid).images.push(url);
        }
      }

      // additional images
      if (r.image_blob) {
        const url = bufferToDataUrl(r.image_blob, r.image_mime);
        if (url) {
          // avoid duplicates
          const arr = map.get(pid).images;
          if (!arr.includes(url)) arr.push(url);
        }
      }
    }

    return Array.from(map.values());
  },

  // Get products for a specific user (resolve shop via shop_details)
  getAllByUserId: async (userId) => {
    // find shop id(s) for user
    const [shopRows] = await pool.execute('SELECT id FROM shop_details WHERE user_id = ?', [userId]);
    if (!shopRows || shopRows.length === 0) return [];
    const shopIds = shopRows.map(s => s.id);

    // fetch products for these shops
    const placeholders = shopIds.map(() => '?').join(',');
    const [rows] = await pool.execute(`
      SELECT p.id AS productId, p.shop_id, p.product_name, p.brand_name, p.description,
        p.category_id, p.image AS primary_image, p.image_mime AS primary_mime,
        inv.unit_type, inv.unit_price, inv.quantity, inv.is_available,
        pc.name AS category_name,
        sd.shop_name,
        sd.is_active,
        u.full_name AS owner_name,
        COALESCE(sd.shop_phone_number, u.phone_number) AS phone_no,
        COALESCE(sd.shop_email, u.email) AS email,
        sd.shop_address,
        sd.business_registration_number,
        sd.shop_description,
        sd.shop_category,
        sd.operating_hours,
        sd.opening_days,
        sd.delivery_areas,
        sd.latitude,
        sd.longitude,
        sd.shop_image AS shop_image_blob, sd.shop_image_mime,
          COALESCE(p.district, u.district) AS district,
          COALESCE(p.district, u.district) AS city,
        sr.average_rating,
        sr.review_count,
        sr.last_reviewed_at,
        pi.id AS image_id, pi.image AS image_blob, pi.image_mime AS image_mime
      FROM products p
      LEFT JOIN product_inventory inv ON inv.product_id = p.id
      LEFT JOIN product_images pi ON pi.product_id = p.id
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      LEFT JOIN shop_details sd ON sd.id = p.shop_id
      LEFT JOIN users u ON u.id = sd.user_id
      LEFT JOIN (
        SELECT shop_id, AVG(rating) AS average_rating, COUNT(*) AS review_count, MAX(created_at) AS last_reviewed_at
        FROM shop_reviews
        GROUP BY shop_id
      ) sr ON sr.shop_id = p.id
      WHERE p.shop_id IN (${placeholders})
      ORDER BY p.id DESC
    `, shopIds);

    const map = new Map();
    for (const r of rows) {
      const pid = r.productId;
      if (!map.has(pid)) {
          map.set(pid, {
          id: pid,
          shop_id: r.shop_id,
          shop_name: r.shop_name,
          owner_name: r.owner_name,
          phone_no: r.phone_no,
          email: r.email,
          shop_address: r.shop_address,
          business_registration_number: r.business_registration_number,
          shop_description: r.shop_description,
          shop_category: r.shop_category,
          operating_hours: r.operating_hours,
          opening_days: r.opening_days,
          delivery_areas: r.delivery_areas,
          latitude: r.latitude,
          longitude: r.longitude,
          shop_image: bufferToDataUrl(r.shop_image_blob, r.shop_image_mime),
          is_active: typeof r.is_active !== 'undefined' ? r.is_active : null,
          city: r.city,
          district: r.district || r.city || null,
          product_name: r.product_name,
          brand: r.brand_name,
          product_description: r.description,
          category_id: r.category_id,
          category: r.category_name,
          unit: r.unit_type,
          price: r.unit_price,
          available_quantity: r.quantity,
          is_available: r.is_available,
          average_rating: r.average_rating !== null && r.average_rating !== undefined ? Number(r.average_rating) : null,
          review_count: r.review_count !== null && r.review_count !== undefined ? Number(r.review_count) : 0,
          last_reviewed_at: r.last_reviewed_at,
          images: []
        });
        if (r.primary_image) {
          const url = bufferToDataUrl(r.primary_image, r.primary_mime);
          if (url) map.get(pid).images.push(url);
        }
      }
      if (r.image_blob) {
        const url = bufferToDataUrl(r.image_blob, r.image_mime);
        if (url) {
          const arr = map.get(pid).images;
          if (!arr.includes(url)) arr.push(url);
        }
      }
    }

    return Array.from(map.values());
  },

  // Very similar to getAllByUserId but kept for compatibility
  getAllViewByUserId: async (userId) => {
    return await ShopProductModel.getAllByUserId(userId);
  },

  // Return shop details (single object) for a user
  getShopDetailsByUserId: async (userId) => {
  const [rows] = await pool.execute(`
  SELECT sd.id AS shop_id, sd.shop_name,
  sd.is_active,
     u.full_name AS owner_name,
     COALESCE(sd.shop_phone_number, u.phone_number) AS phone_no,
     COALESCE(sd.shop_email, u.email) AS email,
     sd.shop_address,
     sd.business_registration_number,
     sd.shop_description,
     sd.shop_category,
     sd.operating_hours,
     sd.opening_days,
     sd.delivery_areas,
     sd.latitude,
     sd.longitude,
  sd.shop_image AS shop_image_blob, sd.shop_image_mime,
  u.district AS district,
  u.district AS city,
     (
       SELECT ss.reason_code FROM shop_suspensions ss
       WHERE ss.shop_id = sd.id
       ORDER BY ss.created_at DESC
       LIMIT 1
     ) AS suspension_reason,
     (
       SELECT ss.reason_detail FROM shop_suspensions ss
       WHERE ss.shop_id = sd.id
       ORDER BY ss.created_at DESC
       LIMIT 1
     ) AS suspension_detail
    ,(
      -- comma-separated list of product ids affected by the latest suspension (if any)
      SELECT GROUP_CONCAT(ssi.product_id) FROM shop_suspension_items ssi
      WHERE ssi.suspension_id = (
        SELECT ss2.id FROM shop_suspensions ss2
        WHERE ss2.shop_id = sd.id
        ORDER BY ss2.created_at DESC
        LIMIT 1
      )
    ) AS suspension_item_ids
      FROM shop_details sd
      LEFT JOIN users u ON u.id = sd.user_id
      WHERE sd.user_id = ?
      LIMIT 1
    `, [userId]);

    if (!rows || rows.length === 0) return null;
    const shop = rows[0];

    // If there are suspension item ids, fetch their basic details
    if (shop.suspension_item_ids) {
      // suspension_item_ids stored as comma-separated string
      const ids = shop.suspension_item_ids.split(',').map(s => Number(s)).filter(Boolean);
      if (ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',');
        const [itemRows] = await pool.execute(
          `SELECT p.id AS id, p.product_name, pc.name AS category, inv.unit_price AS price
           FROM products p
           LEFT JOIN product_categories pc ON pc.id = p.category_id
           LEFT JOIN product_inventory inv ON inv.product_id = p.id
           WHERE p.id IN (${placeholders})`,
          ids
        );
        shop.suspension_items = (itemRows || []).map(r => ({ id: r.id, product_name: r.product_name, category: r.category, price: r.price }));
      } else {
        shop.suspension_items = [];
      }
    } else {
      shop.suspension_items = [];
    }

    return shop;
  },

  findById: async (productId) => {
    const [rows] = await pool.execute(`
      SELECT p.id AS productId, p.shop_id, p.product_name, p.brand_name, p.description,
        p.category_id, p.image AS primary_image, p.image_mime AS primary_mime,
        inv.unit_type, inv.unit_price, inv.quantity, inv.is_available,
        pc.name AS category_name,
        sd.shop_name,
        u.full_name AS owner_name,
        COALESCE(sd.shop_phone_number, u.phone_number) AS phone_no,
        COALESCE(sd.shop_email, u.email) AS email,
  sd.shop_address,
  COALESCE(p.district, u.district) AS district,
  COALESCE(p.district, u.district) AS city,
        sr.average_rating,
        sr.review_count,
        sr.last_reviewed_at,
        pi.id AS image_id, pi.image AS image_blob, pi.image_mime AS image_mime
      FROM products p
      LEFT JOIN product_inventory inv ON inv.product_id = p.id
      LEFT JOIN product_images pi ON pi.product_id = p.id
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      LEFT JOIN shop_details sd ON sd.id = p.shop_id
      LEFT JOIN users u ON u.id = sd.user_id
      LEFT JOIN (
        SELECT shop_id, AVG(rating) AS average_rating, COUNT(*) AS review_count, MAX(created_at) AS last_reviewed_at
        FROM shop_reviews
        GROUP BY shop_id
      ) sr ON sr.shop_id = p.id
      WHERE p.id = ?
    `, [productId]);

    if (!rows || rows.length === 0) return null;
  const map = new Map();
    for (const r of rows) {
      const pid = r.productId;
      if (!map.has(pid)) {
          map.set(pid, {
          id: pid,
          shop_id: r.shop_id,
          shop_name: r.shop_name,
          owner_name: r.owner_name,
          phone_no: r.phone_no,
          email: r.email,
          shop_address: r.shop_address,
          business_registration_number: r.business_registration_number,
          shop_description: r.shop_description,
          shop_category: r.shop_category,
          operating_hours: r.operating_hours,
          opening_days: r.opening_days,
          delivery_areas: r.delivery_areas,
          latitude: r.latitude,
          longitude: r.longitude,
          shop_image: bufferToDataUrl(r.shop_image_blob, r.shop_image_mime),
          city: r.city,
          district: r.district || r.city || null,
          product_name: r.product_name,
          brand: r.brand_name,
          product_description: r.description,
          category_id: r.category_id,
          category: r.category_name,
          unit: r.unit_type,
          price: r.unit_price,
          available_quantity: r.quantity,
          is_available: r.is_available,
          average_rating: r.average_rating !== null && r.average_rating !== undefined ? Number(r.average_rating) : null,
          review_count: r.review_count !== null && r.review_count !== undefined ? Number(r.review_count) : 0,
          last_reviewed_at: r.last_reviewed_at,
          images: []
        });
        if (r.primary_image) {
          const url = bufferToDataUrl(r.primary_image, r.primary_mime);
          if (url) map.get(pid).images.push(url);
        }
      }
      if (r.image_blob) {
        const url = bufferToDataUrl(r.image_blob, r.image_mime);
        if (url) {
          const arr = map.get(pid).images;
          if (!arr.includes(url)) arr.push(url);
        }
      }
    }

    return Array.from(map.values())[0];
  },

  update: async (productId, updateData) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Update products table fields if present
      const productFields = {};
      const allowedProductFields = ['product_name', 'brand_name', 'description', 'category_id'];
      for (const k of allowedProductFields) {
        if (updateData[k] !== undefined && updateData[k] !== null) productFields[k] = updateData[k];
      }

      // If category provided as name, resolve id
      if (updateData.category && !productFields.category_id) {
        const catName = updateData.category.toString().trim();
        if (catName) {
          const [catRows] = await connection.execute('SELECT id FROM product_categories WHERE LOWER(name) = LOWER(?)', [catName]);
          if (catRows.length) productFields.category_id = catRows[0].id;
          else {
            const [catRes] = await connection.execute('INSERT INTO product_categories (name) VALUES (?)', [catName]);
            productFields.category_id = catRes.insertId;
          }
        }
      }

      if (Object.keys(productFields).length > 0) {
        const setParts = Object.keys(productFields).map(k => `${k} = ?`).join(', ');
        const values = Object.keys(productFields).map(k => productFields[k]);
        values.push(productId);
        await connection.execute(`UPDATE products SET ${setParts} WHERE id = ?`, values);
      }

      // Update inventory
      if (updateData.price !== undefined || updateData.available_quantity !== undefined || updateData.unit !== undefined || updateData.is_available !== undefined) {
        // Build update for product_inventory (assumes single inventory row per product)
        const invFields = {};
        if (updateData.price !== undefined) invFields.unit_price = updateData.price;
        if (updateData.available_quantity !== undefined) invFields.quantity = updateData.available_quantity;
        if (updateData.unit !== undefined) invFields.unit_type = updateData.unit;
        if (updateData.is_available !== undefined) invFields.is_available = updateData.is_available ? 1 : 0;

        if (Object.keys(invFields).length > 0) {
          const setParts = Object.keys(invFields).map(k => `${k} = ?`).join(', ');
          const values = Object.keys(invFields).map(k => invFields[k]);
          values.push(productId);
          // Try update; if no rows updated, insert
          const [result] = await connection.execute(`UPDATE product_inventory SET ${setParts} WHERE product_id = ?`, values);
          if (result.affectedRows === 0) {
            // insert
            const unit_type = invFields.unit_type || null;
            const unit_price = invFields.unit_price || 0;
            const quantity = invFields.quantity || 0;
            const is_available = invFields.is_available !== undefined ? invFields.is_available : (quantity > 0 ? 1 : 0);
            await connection.execute('INSERT INTO product_inventory (product_id, unit_type, unit_price, quantity, is_available) VALUES (?, ?, ?, ?, ?)', [productId, unit_type, unit_price, quantity, is_available]);
          }
        }
      }

      // Handle images: if updateData.images present (stringified JSON or array)
      if (updateData.images) {
        let imagesArr = updateData.images;
        if (typeof imagesArr === 'string') {
          try { imagesArr = JSON.parse(imagesArr); } catch (e) { imagesArr = []; }
        }

        if (Array.isArray(imagesArr)) {
          // delete existing images
          await connection.execute('DELETE FROM product_images WHERE product_id = ?', [productId]);

          // Insert new images
          for (const img of imagesArr) {
            // img may be { buffer: base64, mimetype } or a data URL string
            if (img && typeof img === 'object' && img.buffer) {
              const buf = Buffer.from(img.buffer, 'base64');
              await connection.execute('INSERT INTO product_images (product_id, image, image_mime) VALUES (?, ?, ?)', [productId, buf, img.mimetype || null]);
            } else if (typeof img === 'string' && img.startsWith('data:')) {
              // parse data URL
              const match = img.match(/^data:(.+);base64,(.*)$/);
              if (match) {
                const mime = match[1];
                const b64 = match[2];
                const buf = Buffer.from(b64, 'base64');
                await connection.execute('INSERT INTO product_images (product_id, image, image_mime) VALUES (?, ?, ?)', [productId, buf, mime]);
              }
            }
          }

          // Update primary image on products table using first image if present
          const [firstRow] = await connection.execute('SELECT id, image, image_mime FROM product_images WHERE product_id = ? ORDER BY id ASC LIMIT 1', [productId]);
          if (firstRow && firstRow.length) {
            await connection.execute('UPDATE products SET image = ?, image_mime = ? WHERE id = ?', [firstRow[0].image, firstRow[0].image_mime, productId]);
          }
        }
      }

      await connection.commit();
      connection.release();

      return await ShopProductModel.findById(productId);
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
  },

  deleteById: async (productId) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // delete dependent rows first to satisfy FK constraints
      await connection.execute('DELETE FROM product_images WHERE product_id = ?', [productId]);
      await connection.execute('DELETE FROM product_inventory WHERE product_id = ?', [productId]);

      const [result] = await connection.execute('DELETE FROM products WHERE id = ?', [productId]);

      await connection.commit();
      connection.release();

      return { success: result.affectedRows > 0, affectedRows: result.affectedRows };
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
  }
};

module.exports = ShopProductModel;