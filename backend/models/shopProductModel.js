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
};

module.exports = ShopProductModel;