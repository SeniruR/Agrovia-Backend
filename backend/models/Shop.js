const pool = require('../config/database');

class Shop {
  // Create a new shop details record
  static async create(shopData) {
    const {
      user_id,
      shop_name,
      business_registration_number,
      shop_address,
      shop_phone_number,
      shop_email,
      shop_description,
      shop_category,
      operating_hours,
      opening_days,
      delivery_areas,
      shop_license,
      shop_image
    } = shopData;

    const shopQuery = `
      INSERT INTO shop_details (
        user_id, shop_name, business_registration_number, shop_address, shop_phone_number, shop_email, shop_description, shop_category, operating_hours, opening_days, delivery_areas, shop_license, shop_image
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const shopValues = [
      user_id,
      shop_name,
      business_registration_number,
      shop_address,
      shop_phone_number,
      shop_email,
      shop_description,
      shop_category,
      operating_hours,
      JSON.stringify(opening_days),
      delivery_areas,
      shop_license,
      shop_image
    ];
    const [shopResult] = await pool.execute(shopQuery, shopValues);
    return { shop_id: shopResult.insertId };
  }
}

module.exports = Shop;
