const pool = require('../config/database').pool;

// Get shop statistics for a shop owner (simplified - only orders and products)
const getShopStatistics = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // First, get the shop_id for this user
    const [shopRows] = await pool.query(
      'SELECT id as shop_id FROM shop_details WHERE user_id = ?',
      [userId]
    );
    
    if (shopRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found for this user'
      });
    }
    
    const shopId = shopRows[0].shop_id;
    console.log(`Fetching statistics for shop_id: ${shopId}`);
    
    // Get total products count
    const [productRows] = await pool.query(
      'SELECT COUNT(*) as total_products FROM products WHERE shop_id = ?',
      [shopId]
    );
    
    console.log(`Shop ${shopId} - Products query result:`, productRows[0]);
    
    // Get total orders count (using correct column names and explicit casting)
    let totalOrders = 0;
    
    try {
      // Get orders count for this shop by joining through products
      // Using explicit casting to ensure data type compatibility
      const [orderRows] = await pool.query(
        `SELECT COUNT(DISTINCT oi.orderId) as total_orders
         FROM order_items oi
         INNER JOIN products p ON CAST(oi.productId AS SIGNED) = CAST(p.id AS SIGNED)
         WHERE p.shop_id = ?`,
        [shopId]
      );
      
      if (orderRows.length > 0) {
        totalOrders = parseInt(orderRows[0].total_orders) || 0;
      }
      
      console.log(`Shop ${shopId} - Orders query result:`, orderRows[0]);
      
      // If still 0, let's try a different approach - get product IDs first
      if (totalOrders === 0) {
        const [productIds] = await pool.query(
          'SELECT id FROM products WHERE shop_id = ?',
          [shopId]
        );
        
        if (productIds.length > 0) {
          const ids = productIds.map(p => p.id);
          console.log(`Shop ${shopId} - Product IDs:`, ids);
          
          const [orderRows2] = await pool.query(
            `SELECT COUNT(DISTINCT orderId) as total_orders
             FROM order_items 
             WHERE productId IN (${ids.map(() => '?').join(',')})`,
            ids
          );
          
          totalOrders = parseInt(orderRows2[0]?.total_orders) || 0;
          console.log(`Shop ${shopId} - Alternative orders query result:`, orderRows2[0]);
        }
      }
    } catch (error) {
      console.log('Error querying orders for shop:', error.message);
      totalOrders = 0;
    }
    
    return res.json({
      success: true,
      data: {
        shopId: shopId,
        totalProducts: parseInt(productRows[0]?.total_products) || 0,
        totalOrders: totalOrders
      }
    });
    
  } catch (error) {
    console.error('Shop statistics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch shop statistics',
      error: error.message
    });
  }
};

module.exports = {
  getShopStatistics
};
