
const { pool } = require('../config/database');


class ShopOwner {
  // Create a new shop owner details record
  static async create(shopOwnerData) {
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
      shop_license_mime,
      shop_image,
      shop_image_mime
    } = shopOwnerData;

    const query = `
      INSERT INTO shop_details (
        user_id, shop_name, business_registration_number, shop_address, shop_phone_number, shop_email, shop_description, shop_category, operating_hours, opening_days, delivery_areas, latitude, longitude, shop_license, shop_license_mime, shop_image, shop_image_mime
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      user_id,
      shop_name ?? null,
      business_registration_number ?? null,
      shop_address ?? null,
      shop_phone_number ?? null,
      shop_email ?? null,
      shop_description ?? null,
      shop_category ?? null,
      operating_hours ?? null,
      Array.isArray(opening_days) ? opening_days.join(',') : (opening_days ?? null),
      delivery_areas ?? null,
      shopOwnerData.latitude ?? null,
      shopOwnerData.longitude ?? null,
      shop_license ?? null,
      shop_license_mime ?? null,
      shop_image ?? null,
      shop_image_mime ?? null
    ];
    try {
      const [result] = await pool.execute(query, values);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Find shop details by user_id
  static async findByUserId(user_id) {
    const query = 'SELECT * FROM shop_details WHERE user_id = ?';
    try {
      const [rows] = await pool.execute(query, [user_id]);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }
}
getAll: async () => {
    const [rows] = await pool.execute('SELECT * FROM shop_products');
    return rows;
  }
module.exports = ShopOwner;
