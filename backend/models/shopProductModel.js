const { pool } = require('../config/database');

const ShopProductModel = {
  create: async (product) => {
    const [result] = await pool.execute(
      `INSERT INTO shop_products (

    shop_name, owner_name, email, phone_no, shop_address, city,
    product_type, product_name, brand, category, season, price,
    unit, available_quantity, product_description, 
    usage_history, organic_certified, terms_accepted, images
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product.shop_name,
        product.owner_name,
        product.email,
        product.phone_no,
        product.shop_address,
        product.city,
        product.product_type,      // corrected order
        product.product_name,
        product.brand,
        product.category,
        product.season,
        product.price,
        product.unit,
        product.available_quantity,
        product.product_description,
     
        product.usage_history,
        product.organic_certified,
        product.terms_accepted,
        product.images
      ]
    );
    return result;
  },

  getAll: async () => {
    const [rows] = await pool.execute('SELECT * FROM shop_products');
    return rows;
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


    update: async (shopitemid, updateData) => {
  try {
    // Convert updateData to an array of values in the correct order
    const allowedFields = [
      'images',
      'shop_name',
      'owner_name',
      'phone_no',
      'shop_address',
      'city',
      'product_name',
      'brand',
      'category',
      'season',
      'price',
      'unit',
      'available_quantity',
      'product_description',
      'usage_history',
      'product_type',
      'organic_certified'
    ];

    // Filter and prepare values
    const values = [];
    const setClauses = [];
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        
        // Ensure proper type conversion for MySQL
        if (field === 'organic_certified') {
          values.push(updateData[field] ? 1 : 0);
        } else if (field === 'price' || field === 'available_quantity') {
          values.push(Number(updateData[field]));
        } else {
          values.push(updateData[field]);
        }
      }
    });

    if (setClauses.length === 0) {
      return { success: false, message: "No valid fields to update" };
    }

    // Add shopitemid to values for WHERE clause
    values.push(shopitemid);

    const [result] = await pool.execute(
      `UPDATE shop_products SET ${setClauses.join(', ')} WHERE shopitemid = ?`,
      values
    );

    return {
      success: result.affectedRows > 0,
      affectedRows: result.affectedRows,
      message: result.affectedRows > 0 
        ? "Product updated successfully" 
        : "No product found with that ID"
    };
  } catch (error) {
    console.error("Update error:", error);
    return { success: false, message: "Database update failed" };
  }
=======
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