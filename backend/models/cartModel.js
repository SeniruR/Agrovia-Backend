const { pool } = require('../config/database');

const toCoordinate = (value) => {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

async function getFarmerCoordinates(productId) {
  // 1. Try the materialized view that already joins farmer details
  const [farmerRows] = await pool.query(
    `SELECT farmer_latitude, farmer_longitude 
       FROM recent_cart_items_with_farmer_location 
      WHERE productId = ?
      LIMIT 5`,
    [productId]
  );

  for (const row of farmerRows) {
    const latitude = toCoordinate(row.farmer_latitude ?? row.latitude);
    const longitude = toCoordinate(row.farmer_longitude ?? row.longitude);
    if (latitude !== null && longitude !== null) {
      return {
        latitude,
        longitude,
        source: 'farmer_profile',
        originType: 'farmer'
      };
    }
  }

  // 2. Fall back to the cart record itself (supports shop items storing coords at add-to-cart time)
  const [cartRows] = await pool.query(
    `SELECT latitude, longitude, productType, updatedAt, createdAt
       FROM carts
      WHERE productId = ?
      ORDER BY updatedAt DESC, createdAt DESC
      LIMIT 5`,
    [productId]
  );

  for (const row of cartRows) {
    const latitude = toCoordinate(row.latitude);
    const longitude = toCoordinate(row.longitude);
    if (latitude !== null && longitude !== null) {
      return {
        latitude,
        longitude,
        source: 'cart_record',
        originType: row.productType || null
      };
    }
  }

  // 3. Final fallback: if this is a shop product, use its shop_details coordinates
  const [shopRows] = await pool.query(
    `SELECT sd.latitude, sd.longitude
       FROM products p
       JOIN shop_details sd ON sd.id = p.shop_id
      WHERE p.id = ?
      LIMIT 1`,
    [productId]
  );

  if (shopRows.length > 0) {
    const latitude = toCoordinate(shopRows[0].latitude);
    const longitude = toCoordinate(shopRows[0].longitude);
    if (latitude !== null && longitude !== null) {
      return {
        latitude,
        longitude,
        source: 'shop_details',
        originType: 'shop'
      };
    }
  }

  return null;
}


/**
 * Get all cart items with farmer coordinates for a specific buyer
 */
async function getBuyerCartCoordinates(buyerId) {
  const [rows] = await pool.query(
    `SELECT cart_id,
            productName,
            productId,
            farmer_full_name,
            farmer_latitude,
            farmer_longitude,
            farmer_latitude AS latitude,
            farmer_longitude AS longitude
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