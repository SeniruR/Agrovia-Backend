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
    if (orderIds.length === 0) {
      return res.json({ success: true, data: [] });
    }
    const placeholders = orderIds.map(() => '?').join(',');
    const [items] = await db.execute(
      `SELECT id, orderId, productId, productName, quantity, unitPrice, subtotal, productUnit, farmerName, location, productImage
       FROM order_items WHERE orderId IN (${placeholders})`,
      orderIds
    );

    // Fetch order_transports for these order_items
    const itemIds = items.map(i => i.id);
    const itemPlaceholders = itemIds.map(() => '?').join(',') || 'NULL';
    // Fetch order_transports and enrich with transporter user info when available
    const [transports] = await db.execute(
      `SELECT ot.*, td.user_id as transporter_user_id, u.full_name as transporter_name, u.phone_number as transporter_phone
       FROM order_transports ot
       LEFT JOIN transporter_details td ON td.id = ot.transporter_id
       LEFT JOIN users u ON td.user_id = u.id
       WHERE ot.order_item_id IN (${itemPlaceholders})`,
      itemIds
    );

    // Fetch product origin (location/district) from crop_posts for these products
    const productIds = items.map(i => i.productId).filter(Boolean);
    const productPlaceholders = productIds.length > 0 ? productIds.map(() => '?').join(',') : 'NULL';
    const productMap = {};
    if (productIds.length > 0) {
      // Join with users to grab farmer name and phone
      const [productsRows] = await db.execute(
        `SELECT cp.id, cp.location, cp.district, cp.farmer_id, u.full_name as farmer_name, u.phone_number as farmer_phone
         FROM crop_posts cp
         LEFT JOIN users u ON cp.farmer_id = u.id
         WHERE cp.id IN (${productPlaceholders})`,
        productIds
      );
      for (const p of productsRows) {
        productMap[p.id] = p;
      }
    }

    // Group transports by order_item_id
    const transportsByItem = {};
    for (const t of transports || []) {
      transportsByItem[t.order_item_id] = transportsByItem[t.order_item_id] || [];
      transportsByItem[t.order_item_id].push(t);
    }

    // Attach transports and product origin to items
    // Prefer snapshot values stored on order_items (farmerName, location) when present,
    // otherwise fall back to current values from crop_posts -> users (productMap).
    const itemsWithTransports = items.map(item => ({
      ...item,
      transports: transportsByItem[item.id] || [],
  // Always prefer authoritative location/district from crop_posts (productMap)
  productLocation: (productMap[item.productId] && productMap[item.productId].location) || null,
  productDistrict: (productMap[item.productId] && productMap[item.productId].district) || null,
      productFarmerName: item.farmerName || (productMap[item.productId] && productMap[item.productId].farmer_name) || null,
      // Note: order_items currently doesn't store farmer phone; use productMap when available.
      productFarmerPhone: (productMap[item.productId] && productMap[item.productId].farmer_phone) || null
    }));

    // Group items by their orderId
    const itemsByOrder = {};
    itemsWithTransports.forEach(item => {
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
      const [orderItemResult] = await connection.execute(
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
      const newOrderItemId = orderItemResult.insertId;

      // Copy any transport allocations linked to this cart item into order_transports
      // We support lookup by cartItemId (frontend field) or by product id as fallback
      try {
        const cartItemIdCandidates = [];
        if (item.cartItemId) cartItemIdCandidates.push(item.cartItemId);
        if (item.cart_item_id) cartItemIdCandidates.push(item.cart_item_id);
        // Also allow the product id as a fallback (some allocations used item.id earlier)
        cartItemIdCandidates.push(item.id);

        // Deduplicate and filter nulls
        const ids = Array.from(new Set(cartItemIdCandidates.filter(v => v !== undefined && v !== null)));
        if (ids.length > 0) {
          const placeholders = ids.map(() => '?').join(',');
          const [allocRows] = await connection.execute(
            `SELECT * FROM cart_transports WHERE cart_item_id IN (${placeholders})`,
            ids
          );

          // Debug: log allocations fetched for inspection
          console.log('DEBUG: allocRows for cart_item ids', ids, '=>', JSON.stringify(allocRows, null, 2));

          if (allocRows && allocRows.length > 0) {
            for (const alloc of allocRows) {
              console.log('DEBUG: copying alloc -> transport_id:', alloc.transport_id, 'transporter_id:', alloc.transporter_id, 'transporterId:', alloc.transporterId);
                await connection.execute(
                  `INSERT INTO order_transports (
                    order_item_id, transport_id, transporter_id, vehicle_type, vehicle_number,
                    phone_number, base_rate, per_km_rate, calculated_distance, transport_cost,
                    district, user_latitude, user_longitude, item_latitude, item_longitude, created_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    newOrderItemId,
                    alloc.transport_id || null,
                    // Some allocations store transporter as transporter_id, others used transport_id (transporter_details.id)
                    alloc.transporter_id || alloc.transporterId || alloc.transport_id || null,
                    alloc.vehicle_type || null,
                    alloc.vehicle_number || null,
                    alloc.phone_number || null,
                    alloc.base_rate || null,
                    alloc.per_km_rate || null,
                    alloc.calculated_distance || null,
                    alloc.transport_cost || null,
                    alloc.district || null,
                    alloc.user_latitude || null,
                    alloc.user_longitude || null,
                    alloc.item_latitude || null,
                    alloc.item_longitude || null,
                    alloc.created_at || new Date()
                  ]
                );
              }
            // Remove copied allocations from cart_transports
            await connection.execute(
              `DELETE FROM cart_transports WHERE cart_item_id IN (${placeholders})`,
              ids
            );
          }
        }
      } catch (copyErr) {
        console.error('Error copying cart_transports to order_transports:', copyErr);
        // If this fails, allow rollback by throwing so transaction doesn't commit partially
        throw copyErr;
      }
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
