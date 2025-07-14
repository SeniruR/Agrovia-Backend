const { pool } = require('../config/database');

const ShopProductModel = {
 create: async (product) => {
  // Replace all undefined fields with null
  const cleanProduct = Object.fromEntries(
    Object.entries(product).map(([key, value]) => [key, value === undefined ? null : value])
  );

  // Ensure images is a string (e.g., file path or comma-separated paths)
  if (Array.isArray(cleanProduct.images)) {
    cleanProduct.images = cleanProduct.images.join(','); // or transform to filenames if needed
  }

  const [result] = await pool.execute(
    `INSERT INTO shop_products (
      shop_name, owner_name, email, phone_no, shop_address, city,
      product_type, product_name, brand, category, season, price,
      unit, available_quantity, product_description, 
      usage_history, organic_certified, terms_accepted, images,
      user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      cleanProduct.shop_name,
      cleanProduct.owner_name,
      cleanProduct.email,
      cleanProduct.phone_no,
      cleanProduct.shop_address,
      cleanProduct.city,
      cleanProduct.product_type,
      cleanProduct.product_name,
      cleanProduct.brand,
      cleanProduct.category,
      cleanProduct.season,
      cleanProduct.price,
      cleanProduct.unit,
      cleanProduct.available_quantity,
      cleanProduct.product_description,
      cleanProduct.usage_history,
      cleanProduct.organic_certified,
      cleanProduct.terms_accepted,
      cleanProduct.images,
      cleanProduct.user_id
    ]
  );

  return result;
},


  getAll: async () => {
    const [rows] = await pool.execute('SELECT * FROM shop_products');
    return rows;
  },
  getAllByUserId: async (userId) => {
  try {
    console.log(`🛢️ Executing query for user ${userId}`);
    const [rows] = await pool.execute(
      'SELECT * FROM shop_products WHERE user_id = ?',
      [userId]
    );
    console.log('Query results:', rows);
    return rows || []; // Ensure array is returned
  } catch (err) {
    console.error('Database error:', {
      message: err.message,
      sqlMessage: err.sqlMessage,
      sql: err.sql
    });
    throw err;
  }
},
getAllViewByUserId: async (userId) => {
  try {
    console.log(`🛢️ Executing query for user ${userId}`);
    const [rows] = await pool.execute(
      'SELECT * FROM user_shop_details WHERE user_id = ?',
      [userId]
    );
    console.log('Query results:', rows);
    return rows || []; // Ensure array is returned
  } catch (err) {
    console.error('Database error:', {
      message: err.message,
      sqlMessage: err.sqlMessage,
      sql: err.sql
    });
    throw err;
  }
},



   findById: async (shopitemid) => {
    const [rows] = await pool.execute(
      'SELECT * FROM shop_products WHERE shopitemid = ?',
      [shopitemid]
    );
    return rows[0] || null;
  },
  deleteById: async (shopitemid) => {
    const [result] = await pool.execute(
      'DELETE FROM shop_products WHERE shopitemid = ?',
      [shopitemid]
    );
    return {
      success: result.affectedRows > 0,
      affectedRows: result.affectedRows
    };
  },
   update: async (id, updateData) => {
  delete updateData.shopitemid;

  const validFields = [
    'shop_name', 'owner_name', 'phone_no', 'shop_address', 'city',
    'product_type', 'product_name', 'brand', 'category', 'season',
    'price', 'unit', 'available_quantity', 'product_description',
    'usage_history', 'organic_certified', 'images'
  ];

  const filteredUpdate = {};
  for (const key in updateData) {
    if (validFields.includes(key)) {
      filteredUpdate[key] = updateData[key];
    }
  }

  if (Object.keys(filteredUpdate).length === 0) {
    throw new Error('No valid fields to update');
  }

  const fields = Object.keys(filteredUpdate);
  const values = Object.values(filteredUpdate);

  // Create SQL SET clause like: "shop_name = ?, owner_name = ? ..."
  const setClause = fields.map(field => `${field} = ?`).join(', ');

  const [result] = await pool.execute(
    `UPDATE shop_products SET ${setClause} WHERE shopitemid = ?`,
    [...values, id]
  );

  if (result.affectedRows === 0) {
    throw new Error('Product not found');
  }

  // Return updated row
  const [rows] = await pool.execute(
    'SELECT * FROM shop_products WHERE shopitemid = ?',
    [id]
  );

  return rows[0];
}
};

module.exports = ShopProductModel;