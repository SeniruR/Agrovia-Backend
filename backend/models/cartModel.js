const { pool } = require('../config/database');

async function getFarmerCoordinates(cartId) {
  const [rows] = await pool.query(
    `SELECT farmer_latitude, farmer_longitude 
     FROM recent_cart_items_with_farmer_location 
     WHERE productId= ?`,
    [cartId]
  );
  return rows.length > 0 ? rows[0] : null;
}


/**
 * Get all cart items with farmer coordinates for a specific buyer
 */
async function getBuyerCartCoordinates(buyerId) {
  const [rows] = await pool.query(
    `SELECT cart_id, productName, productId,farmer_full_name, 
            farmer_latitude, farmer_longitude
     FROM recent_cart_items_with_farmer_location
     WHERE buyer_id = ?`,
    [buyerId]
  );
  return rows;
}

module.exports = {
  getFarmerCoordinates,
  getBuyerCartCoordinates
};