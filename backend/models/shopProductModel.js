const { pool } = require('../config/database');

const ShopProductModel = {
  create: async (product) => {
    const [result] = await pool.execute(
      `INSERT INTO shop_products (
        shop_name, owner_name, email, phone_no, shop_address, city,
        product_name, brand, category, season, price, unit,
        available_quantity, product_description, usage_history,product_type,images,organic_certified,features
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product.shop_name,
        product.owner_name,
        product.email,
        product.phone_no,
        product.shop_address,
        product.city,
        product.product_name,
        product.brand,
        product.category,
        product.season,
        product.price,
        product.unit,
        product.available_quantity,
        product.product_description,
        product.usage_history,
        product.features,
        product.organicCertified,
        product.productType,
        JSON.stringify(product.images || [])
      ]
    );
    return result;
  },

  getAll: async () => {
    const [rows] = await pool.execute('SELECT * FROM shop_products');
    return rows;
  }
};

module.exports = ShopProductModel;
