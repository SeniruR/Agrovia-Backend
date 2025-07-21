const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const db = require('../utils/db'); // adjust path to your db connection

// GET /api/v1/orders (fetch orders for authenticated user)
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    // Fetch orders for the user
    const [orders] = await db.execute(
      `SELECT id, orderId AS externalOrderId, status, totalAmount, currency, createdAt
       FROM orders WHERE userId = ? ORDER BY createdAt DESC`,
      [userId]
    );
    // If no orders, return empty array
    if (orders.length === 0) {
      return res.json({ success: true, data: [] });
    }
    // Fetch items for all orders in one query
    const orderIds = orders.map(o => o.id);
    const placeholders = orderIds.map(() => '?').join(',');
    const [items] = await db.execute(
      `SELECT id, orderId, productId, productName, quantity, unitPrice, subtotal, productUnit, farmerName, location, productImage
       FROM order_items WHERE orderId IN (${placeholders})`,
      orderIds
    );
    // Group items by their orderId
    const itemsByOrder = {};
    items.forEach(item => {
      if (!itemsByOrder[item.orderId]) itemsByOrder[item.orderId] = [];
      itemsByOrder[item.orderId].push(item);
    });
    // Attach items to each order
    const ordersWithProducts = orders.map(order => ({
      ...order,
      products: itemsByOrder[order.id] || []
    }));
    res.json({ success: true, data: ordersWithProducts });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch orders', error: err.message });
  }
});
// POST /api/v1/orders
router.post('/', authenticate, async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const {
      orderId,        // PayHere order ID
      paymentId,      // PayHere payment ID
      status,
      totalAmount,
      currency,
      deliveryName,
      deliveryPhone,
      deliveryAddress,
      deliveryDistrict,
      deliveryCountry,
      items // array of cart items
    } = req.body;
    const userId = req.user.id;

    // Insert order
    const [orderResult] = await connection.execute(
      `INSERT INTO orders (
        userId, orderId, paymentId, status, totalAmount, currency,
        deliveryName, deliveryPhone, deliveryAddress, deliveryDistrict, deliveryCountry
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, orderId, paymentId, status, totalAmount, currency,
       deliveryName, deliveryPhone, deliveryAddress, deliveryDistrict, deliveryCountry]
    );
    const newOrderId = orderResult.insertId;

    // Insert order items and adjust crop inventory
    for (const item of items) {
      // Insert order_items
      await connection.execute(
        `INSERT INTO order_items (
          orderId, productId, productName, quantity, unitPrice, subtotal,
          productUnit, farmerName, location, productImage
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newOrderId,
          item.id,
          item.productName || item.name,
          item.quantity,
          item.unitPrice || item.price,
          (item.quantity * (item.unitPrice || item.price)).toFixed(2),
          item.productUnit || item.unit,
          item.farmerName || item.farmer,
          item.location,
          item.productImage || item.image || null
        ]
      );
      // Decrease inventory in crop_posts
      await connection.execute(
        `UPDATE crop_posts SET quantity = quantity - ? WHERE id = ?`,
        [item.quantity, item.id]
      );
    }
    // Clear user's cart
    await connection.execute('DELETE FROM carts WHERE userId = ?', [userId]);

    await connection.commit();
    res.status(201).json({ success: true, orderId: newOrderId });
  } catch (err) {
    await connection.rollback();
    console.error('Order save error:', err);
    res.status(500).json({ success: false, message: 'Order save failed', error: err.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
