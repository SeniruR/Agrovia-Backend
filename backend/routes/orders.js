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
      `SELECT id, userId, orderId AS externalOrderId, status, totalAmount, currency, createdAt
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
      `SELECT id, orderId, productId, productName, quantity, unitPrice, subtotal, productUnit, farmerName, location, productImage, status
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
    const productMetaMap = {};
    if (productIds.length > 0) {
      // Metadata from crop posts (farmer linkage + location)
      const [cropRows] = await db.execute(
        `SELECT cp.id, cp.location, cp.district, cp.farmer_id, u.full_name as farmer_name, u.phone_number as farmer_phone
         FROM crop_posts cp
         LEFT JOIN users u ON cp.farmer_id = u.id
         WHERE cp.id IN (${productPlaceholders})`,
        productIds
      );
      for (const row of cropRows) {
        productMetaMap[row.id] = {
          ...(productMetaMap[row.id] || {}),
          location: row.location,
          district: row.district,
          farmer_id: row.farmer_id,
          farmer_name: row.farmer_name,
          farmer_phone: row.farmer_phone
        };
      }

      // Metadata from shop products (shop owner linkage)
      const [shopRows] = await db.execute(
        `SELECT p.id, sd.user_id AS shop_owner_id
         FROM products p
         LEFT JOIN shop_details sd ON sd.id = p.shop_id
         WHERE p.id IN (${productPlaceholders})`,
        productIds
      );
      for (const row of shopRows) {
        productMetaMap[row.id] = {
          ...(productMetaMap[row.id] || {}),
          shop_owner_id: row.shop_owner_id
        };
      }
    }

    // Group transports by order_item_id
    const transportsByItem = {};
    for (const t of transports || []) {
      transportsByItem[t.order_item_id] = transportsByItem[t.order_item_id] || [];
      transportsByItem[t.order_item_id].push(t);
    }

    // Helper to canonicalize status values into: 'pending' | 'collecting' | 'in-progress' | 'completed'
    const canonicalizeStatus = (s) => {
      if (!s) return 'pending';
      const st = String(s).toLowerCase().trim();
      if (st.includes('collect') || st.includes('assigned') || st.includes('on-the-way') || st.includes('on_the_way')) return 'collecting';
      if (st.includes('collected')) return 'in-progress';
      if (st.includes('complete') || st === 'delivered') return 'completed';
      if (st.includes('in-progress') || st.includes('inprogress') || st.includes('in progress') || st.includes('deliver') || st.includes('in-transit') || st.includes('transit')) return 'in-progress';
      return 'pending';
    };

    // Attach transports and product origin to items
    // Prefer snapshot values stored on order_items (farmerName, location) when present,
    // otherwise fall back to current values from crop_posts -> users (productMap).
    const itemsWithTransports = items.map(item => {
      const itemTransports = transportsByItem[item.id] || [];
      const primaryTransport = itemTransports && itemTransports.length > 0 ? itemTransports[0] : null;
      // try common transport status fields on the transport row
      const transportRawStatus = primaryTransport ? (primaryTransport.status || primaryTransport.transport_status || primaryTransport.order_transport_status || primaryTransport.delivery_status || primaryTransport.transporter_status) : null;
      // final item status: prefer the order_items.status column, otherwise fallback to transport status
      const finalRaw = item.status || transportRawStatus || null;
      const finalStatus = canonicalizeStatus(finalRaw);
      const meta = productMetaMap[item.productId] || {};
      return {
        ...item,
        status: finalStatus,
        transports: itemTransports,
        _transport_raw_status: transportRawStatus,
        // Prefer authoritative metadata but fall back to snapshot values on the order item
        productLocation: meta.location || item.location || null,
        productDistrict: meta.district || null,
        productFarmerName: item.farmerName || meta.farmer_name || null,
        productFarmerPhone: meta.farmer_phone || null,
        productFarmerId: meta.farmer_id || null,
        productShopOwnerId: meta.shop_owner_id || null
      };
    });

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

// GET /api/v1/farmer/orders (fetch orders that include products by the authenticated farmer)
router.get('/farmer/orders', authenticate, async (req, res) => {
  try {
    const farmerId = req.user.id;

    // Find crop posts owned by this farmer

    const [posts] = await db.execute(
      `SELECT id FROM crop_posts WHERE farmer_id = ?`,
      [farmerId]
    );
    const productIds = posts.map(p => p.id);
    if (productIds.length === 0) return res.json({ success: true, data: [] });

    // Find order_items that reference these products
    const productPlaceholders = productIds.map(() => '?').join(',');
    const [matchingItems] = await db.execute(
      `SELECT id, orderId, productId, productName, quantity, unitPrice, subtotal, productUnit, farmerName, location, productImage, status
       FROM order_items WHERE productId IN (${productPlaceholders})`,
      productIds
    );

    if (matchingItems.length === 0) return res.json({ success: true, data: [] });

    const orderIds = Array.from(new Set(matchingItems.map(i => i.orderId)));
    const orderPlaceholders = orderIds.map(() => '?').join(',');

    // Fetch orders (include delivery fields so farmers can see buyer contact/pickup info)
    const [orders] = await db.execute(
      `SELECT id, orderId AS externalOrderId, status, totalAmount, currency, createdAt,
              deliveryName, deliveryPhone, deliveryAddress, deliveryDistrict
       FROM orders WHERE id IN (${orderPlaceholders}) ORDER BY createdAt DESC`,
      orderIds
    );

    // Fetch transports for the relevant items
    const itemIds = matchingItems.map(i => i.id);
    const itemPlaceholders = itemIds.map(() => '?').join(',') || 'NULL';
    const [transports] = await db.execute(
      `SELECT ot.*, td.user_id as transporter_user_id, u.full_name as transporter_name, u.phone_number as transporter_phone
       FROM order_transports ot
       LEFT JOIN transporter_details td ON td.id = ot.transporter_id
       LEFT JOIN users u ON td.user_id = u.id
       WHERE ot.order_item_id IN (${itemPlaceholders})`,
      itemIds
    );

    // Fetch product metadata for these products
    const productMetaMap = {};
    if (productIds.length > 0) {
      const [cropRows] = await db.execute(
        `SELECT cp.id, cp.location, cp.district, cp.farmer_id, u.full_name as farmer_name, u.phone_number as farmer_phone
         FROM crop_posts cp
         LEFT JOIN users u ON cp.farmer_id = u.id
         WHERE cp.id IN (${productPlaceholders})`,
        productIds
      );
      for (const row of cropRows) {
        productMetaMap[row.id] = {
          ...(productMetaMap[row.id] || {}),
          location: row.location,
          district: row.district,
          farmer_id: row.farmer_id,
          farmer_name: row.farmer_name,
          farmer_phone: row.farmer_phone
        };
      }

      const [shopRows] = await db.execute(
        `SELECT p.id, sd.user_id AS shop_owner_id
         FROM products p
         LEFT JOIN shop_details sd ON sd.id = p.shop_id
         WHERE p.id IN (${productPlaceholders})`,
        productIds
      );
      for (const row of shopRows) {
        productMetaMap[row.id] = {
          ...(productMetaMap[row.id] || {}),
          shop_owner_id: row.shop_owner_id
        };
      }
    }

    // Group transports by order_item_id
    const transportsByItem = {};
    for (const t of transports || []) {
      transportsByItem[t.order_item_id] = transportsByItem[t.order_item_id] || [];
      transportsByItem[t.order_item_id].push(t);
    }

    // Helper to canonicalize status values into: 'pending' | 'collecting' | 'in-progress' | 'completed'
    // (reuse same logic for farmer endpoint)
    const canonicalizeStatus_farmer = (s) => {
      if (!s) return 'pending';
      const st = String(s).toLowerCase().trim();
      if (st.includes('collect') || st.includes('assigned') || st.includes('on-the-way') || st.includes('on_the_way')) return 'collecting';
      if (st.includes('collected')) return 'in-progress';
      if (st.includes('complete') || st === 'delivered') return 'completed';
      if (st.includes('in-progress') || st.includes('inprogress') || st.includes('in progress') || st.includes('deliver') || st.includes('in-transit') || st.includes('transit')) return 'in-progress';
      return 'pending';
    };

    // Attach transports and product origin to the matching items
    const itemsWithTransports = matchingItems.map(item => {
      const itemTransports = transportsByItem[item.id] || [];
      const primaryTransport = itemTransports && itemTransports.length > 0 ? itemTransports[0] : null;
      const transportRawStatus = primaryTransport ? (primaryTransport.status || primaryTransport.transport_status || primaryTransport.order_transport_status || primaryTransport.delivery_status || primaryTransport.transporter_status) : null;
      const finalRaw = item.status || transportRawStatus || null;
      const finalStatus = canonicalizeStatus_farmer(finalRaw);
      const meta = productMetaMap[item.productId] || {};
      return {
        ...item,
        status: finalStatus,
        transports: itemTransports,
        _transport_raw_status: transportRawStatus,
        productLocation: meta.location || item.location || null,
        productDistrict: meta.district || null,
        productFarmerName: item.farmerName || meta.farmer_name || null,
        productFarmerPhone: meta.farmer_phone || null,
        productFarmerId: meta.farmer_id || null,
        productShopOwnerId: meta.shop_owner_id || null
      };
    });

    // Group items by orderId
    const itemsByOrder = {};
    itemsWithTransports.forEach(item => {
      if (!itemsByOrder[item.orderId]) itemsByOrder[item.orderId] = [];
      itemsByOrder[item.orderId].push(item);
    });

    // Attach items to each order (only the farmer's items)
    const ordersWithProducts = orders.map(order => ({
      ...order,
      products: itemsByOrder[order.id] || []
    }));

    return res.json({ success: true, data: ordersWithProducts });
  } catch (err) {
    console.error('Error fetching farmer orders:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch farmer orders', error: err.message });
  }
});

// GET /api/v1/orders/shop/orders (fetch orders containing products owned by the authenticated shop owner)
router.get('/shop/orders', authenticate, async (req, res) => {
  try {
    const shopOwnerId = req.user.id;

    // Resolve shop IDs associated with this owner
    const [shopRows] = await db.execute(
      `SELECT id FROM shop_details WHERE user_id = ?`,
      [shopOwnerId]
    );

    if (!shopRows || shopRows.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const shopIds = shopRows.map((row) => row.id);
    const shopPlaceholders = shopIds.map(() => '?').join(',');

    // Fetch order items where the products belong to the owner's shops
    const [matchingItems] = await db.execute(
      `SELECT oi.id, oi.orderId, oi.productId, oi.productName, oi.quantity, oi.unitPrice, oi.subtotal,
              oi.productUnit, oi.farmerName, oi.location, oi.productImage, oi.status,
              o.orderId AS externalOrderId, o.status AS orderStatus, o.totalAmount, o.currency, o.createdAt,
              o.deliveryName, o.deliveryPhone, o.deliveryAddress, o.deliveryDistrict,
              o.userId AS buyerId,
              buyer.full_name AS buyerName,
              buyer.phone_number AS buyerPhone,
              buyer.email AS buyerEmail,
              p.id AS canonicalProductId,
              p.shop_id AS canonicalShopId
       FROM order_items oi
       INNER JOIN orders o ON o.id = oi.orderId
       INNER JOIN products p ON p.id = oi.productId
       INNER JOIN shop_details sd ON sd.id = p.shop_id
       LEFT JOIN users buyer ON buyer.id = o.userId
       WHERE sd.id IN (${shopPlaceholders})
       ORDER BY o.createdAt DESC`,
      shopIds
    );

    if (!matchingItems || matchingItems.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const orderIds = Array.from(new Set(matchingItems.map((item) => item.orderId)));
    const orderPlaceholders = orderIds.map(() => '?').join(',');

    const [orders] = await db.execute(
      `SELECT id, orderId AS externalOrderId, status, totalAmount, currency, createdAt,
              deliveryName, deliveryPhone, deliveryAddress, deliveryDistrict
       FROM orders WHERE id IN (${orderPlaceholders}) ORDER BY createdAt DESC`,
      orderIds
    );

    const itemIds = matchingItems.map((item) => item.id);
    const itemPlaceholders = itemIds.map(() => '?').join(',');

    const [transports] = itemIds.length > 0 ? await db.execute(
      `SELECT ot.*, td.user_id as transporter_user_id, u.full_name as transporter_name, u.phone_number as transporter_phone
       FROM order_transports ot
       LEFT JOIN transporter_details td ON td.id = ot.transporter_id
       LEFT JOIN users u ON td.user_id = u.id
       WHERE ot.order_item_id IN (${itemPlaceholders})`,
      itemIds
    ) : [[]];

    const productIds = matchingItems.map((item) => item.canonicalProductId).filter(Boolean);
    const productPlaceholders = productIds.length > 0 ? productIds.map(() => '?').join(',') : null;
    const productMetaMap = {};

    if (productIds.length > 0) {
      const [productRows] = await db.execute(
        `SELECT p.id, sd.shop_name, sd.shop_phone_number, sd.shop_email,
                inv.quantity AS inventory_quantity, inv.unit_price AS inventory_unit_price,
                inv.unit_type AS inventory_unit_type
         FROM products p
         LEFT JOIN shop_details sd ON sd.id = p.shop_id
         LEFT JOIN product_inventory inv ON inv.product_id = p.id
         WHERE p.id IN (${productPlaceholders})`,
        productIds
      );

      for (const row of productRows) {
        productMetaMap[row.id] = {
          shop_name: row.shop_name,
          shop_phone_number: row.shop_phone_number,
          shop_email: row.shop_email,
          inventory_quantity: row.inventory_quantity,
          inventory_unit_price: row.inventory_unit_price,
          inventory_unit_type: row.inventory_unit_type
        };
      }
    }

    const transportsByItem = {};
    for (const t of transports || []) {
      transportsByItem[t.order_item_id] = transportsByItem[t.order_item_id] || [];
      transportsByItem[t.order_item_id].push(t);
    }

    const canonicalizeStatus = (s) => {
      if (!s) return 'pending';
      const st = String(s).toLowerCase().trim();
      if (st.includes('collect') || st.includes('assigned') || st.includes('on-the-way') || st.includes('on_the_way')) return 'collecting';
      if (st.includes('collected')) return 'in-progress';
      if (st.includes('complete') || st === 'delivered') return 'completed';
      if (st.includes('in-progress') || st.includes('inprogress') || st.includes('in progress') || st.includes('deliver') || st.includes('in-transit') || st.includes('transit')) return 'in-progress';
      return 'pending';
    };

    const itemsWithTransports = matchingItems.map((item) => {
      const meta = productMetaMap[item.canonicalProductId] || {};
      const itemTransports = transportsByItem[item.id] || [];
      const primaryTransport = itemTransports.length > 0 ? itemTransports[0] : null;
      const transportRawStatus = primaryTransport ? (primaryTransport.status || primaryTransport.transport_status || primaryTransport.order_transport_status || primaryTransport.delivery_status || primaryTransport.transporter_status) : null;
      const finalRaw = item.status || transportRawStatus || null;
      const finalStatus = canonicalizeStatus(finalRaw);

      return {
        ...item,
        status: finalStatus,
        transports: itemTransports,
        _transport_raw_status: transportRawStatus,
        shopName: meta.shop_name || null,
        shopPhone: meta.shop_phone_number || null,
        shopEmail: meta.shop_email || null,
        inventoryQuantity: meta.inventory_quantity,
        inventoryUnitPrice: meta.inventory_unit_price,
        inventoryUnitType: meta.inventory_unit_type
      };
    });

    const itemsByOrder = {};
    itemsWithTransports.forEach((item) => {
      if (!itemsByOrder[item.orderId]) itemsByOrder[item.orderId] = [];
      itemsByOrder[item.orderId].push(item);
    });

    const ordersWithProducts = orders.map((order) => ({
      ...order,
      products: itemsByOrder[order.id] || []
    }));

    return res.json({ success: true, data: ordersWithProducts });
  } catch (err) {
    console.error('Error fetching shop orders:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch shop orders', error: err.message });
  }
});

// PATCH /api/v1/orders/:orderId/items/:itemId/collect
router.patch('/:orderId/items/:itemId/collect', authenticate, async (req, res) => {
  try {
    const orderId = Number(req.params.orderId);
    const itemId = Number(req.params.itemId);

    if (!Number.isInteger(orderId) || !Number.isInteger(itemId)) {
      return res.status(400).json({ success: false, message: 'Invalid order or item identifier' });
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    const [itemRows] = await db.execute(
      `SELECT oi.id AS orderItemId,
              oi.status AS itemStatus,
              oi.orderId,
              o.userId AS buyerId,
              o.status AS orderStatus,
              cp.farmer_id AS farmerId,
              sd.user_id AS shopOwnerId
       FROM order_items oi
       INNER JOIN orders o ON o.id = oi.orderId
       LEFT JOIN crop_posts cp ON cp.id = oi.productId
       LEFT JOIN products p ON p.id = oi.productId
       LEFT JOIN shop_details sd ON sd.id = p.shop_id
       WHERE oi.id = ? AND oi.orderId = ?`,
      [itemId, orderId]
    );

    if (!itemRows || itemRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order item not found' });
    }

    const record = itemRows[0];

    const allowedIds = new Set(
      [record.buyerId, record.farmerId, record.shopOwnerId]
        .filter((value) => value !== null && value !== undefined)
    );
    const privilegedRole = userRole === 'admin' || userRole === 'moderator' || userRole === 'main_moderator';

    if (!allowedIds.has(userId) && !privilegedRole) {
      return res.status(403).json({ success: false, message: 'You do not have permission to update this order item' });
    }

    // Ensure the item is a pickup (no transport assignments)
    const [transportCountRows] = await db.execute(
      `SELECT COUNT(*) AS count FROM order_transports WHERE order_item_id = ?`,
      [itemId]
    );
    if ((transportCountRows[0]?.count || 0) > 0) {
      return res.status(400).json({ success: false, message: 'Items with transport assignments cannot be marked as collected manually' });
    }

    const currentStatus = (record.itemStatus || '').toString().toLowerCase();
    if (['completed', 'delivered'].includes(currentStatus)) {
      return res.json({
        success: true,
        data: {
          item: {
            id: itemId,
            orderId,
            status: 'completed'
          },
          order: {
            id: orderId,
            status: record.orderStatus
          }
        }
      });
    }

    await db.execute(
      `UPDATE order_items SET status = ?, updatedAt = NOW() WHERE id = ? AND orderId = ?`,
      ['completed', itemId, orderId]
    );

    // If all items in the order are now completed/delivered, mark order as completed
    const [remainingRows] = await db.execute(
      `SELECT COUNT(*) AS remaining
       FROM order_items
       WHERE orderId = ? AND LOWER(status) NOT IN ('completed', 'delivered')`,
      [orderId]
    );

    let updatedOrderStatus = record.orderStatus;
    if ((remainingRows[0]?.remaining || 0) === 0) {
      await db.execute(`UPDATE orders SET status = 'COMPLETED' WHERE id = ?`, [orderId]);
      updatedOrderStatus = 'COMPLETED';
    }

    return res.json({
      success: true,
      data: {
        item: {
          id: itemId,
          orderId,
          status: 'completed'
        },
        order: {
          id: orderId,
          status: updatedOrderStatus
        }
      }
    });
  } catch (err) {
    console.error('Error marking order item as collected:', err);
    return res.status(500).json({ success: false, message: 'Failed to update order item status', error: err.message });
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

    console.log('📦 Order creation request:', {
      orderId,
      userId,
      totalAmount,
      currency,
      deliveryName,
      deliveryPhone,
      deliveryAddress,
      deliveryDistrict,
      deliveryCountry,
      itemsCount: Array.isArray(items) ? items.length : 0
    });

    // Helpers to sanitize values for SQL bindings (mysql2 does not accept undefined)
    const nvl = (v, fallback = null) => (v === undefined ? fallback : v);
    const toNumberOrNull = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const toStringOrNull = (v) => (v === undefined || v === null ? null : String(v));

    const safeStatus = toStringOrNull(status) || 'PAID';
    const safeTotal = toNumberOrNull(totalAmount) ?? 0;
    const safeCurrency = toStringOrNull(currency) || 'LKR';
    const safeDeliveryName = toStringOrNull(deliveryName);
    const safeDeliveryPhone = toStringOrNull(deliveryPhone);
    const safeDeliveryAddress = toStringOrNull(deliveryAddress);
    const safeDeliveryDistrict = toStringOrNull(deliveryDistrict);
    const safeDeliveryCountry = toStringOrNull(deliveryCountry);
    const safeOrderId = toStringOrNull(orderId) || `ORDER-${Date.now()}`;
    const safePaymentId = toStringOrNull(paymentId) || null;

    // Insert order
    const [orderResult] = await connection.execute(
      `INSERT INTO orders (
        userId, orderId, paymentId, status, totalAmount, currency,
        deliveryName, deliveryPhone, deliveryAddress, deliveryDistrict, deliveryCountry
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId,
       safeOrderId,
       safePaymentId,
       safeStatus,
       safeTotal,
       safeCurrency,
       safeDeliveryName,
       safeDeliveryPhone,
       safeDeliveryAddress,
       safeDeliveryDistrict,
       safeDeliveryCountry]
    );
    const newOrderId = orderResult.insertId;

    // Insert order items and adjust crop inventory
    for (const item of (Array.isArray(items) ? items : [])) {
      // Sanitize per-item values
      const productId = toNumberOrNull(item.id);
      const productName = toStringOrNull(item.productName || item.name) || 'Product';
      const quantity = toNumberOrNull(item.quantity) ?? 1;
      const unitPrice = toNumberOrNull(item.unitPrice ?? item.price) ?? 0;
      // Ensure subtotal is always a valid number
      const subtotalValue = Number.isFinite(quantity * unitPrice) ? (quantity * unitPrice) : 0;
      const subtotal = parseFloat(subtotalValue.toFixed(2));
      const productUnit = toStringOrNull(item.productUnit || item.unit) || null;
      const farmerName = toStringOrNull(item.farmerName || item.farmer) || null;
      const location = toStringOrNull(item.location || item.district) || null;
      // Truncate productImage to fit varchar(255) column
      const rawProductImage = toStringOrNull(item.productImage || item.image);
      const productImage = rawProductImage && rawProductImage.length > 255 
        ? rawProductImage.substring(0, 255) 
        : rawProductImage;
      const productTypeRaw = toStringOrNull(item.productType || item.product_type || item.sourceType);
      let productType = (productTypeRaw || 'crop').toLowerCase();
      if (!['crop', 'shop'].includes(productType)) {
        productType = 'crop';
      }

      // Insert order_items
      const [orderItemResult] = await connection.execute(
        `INSERT INTO order_items (
          orderId, productId, productName, quantity, unitPrice, subtotal,
          productUnit, farmerName, location, productImage, createdAt, updatedAt, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)`,
        [
          newOrderId,
          productId,
          productName,
          quantity,
          unitPrice,
          subtotal,
          productUnit,
          farmerName,
          location,
          productImage,
          'pending' // default status
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
      // Decrease inventory based on product type
      if (productId !== null) {
        if (productType === 'shop') {
          const [inventoryResult] = await connection.execute(
            `UPDATE product_inventory
               SET quantity = GREATEST(quantity - ?, 0),
                   is_available = CASE
                     WHEN quantity - ? <= 0 THEN 0
                     ELSE is_available
                   END
             WHERE product_id = ?`,
            [quantity, quantity, productId]
          );

          if (!inventoryResult || inventoryResult.affectedRows === 0) {
            console.warn('⚠️ Order placement could not update product_inventory record', {
              productId,
              quantityRequested: quantity,
              productType
            });
          }
        } else {
          await connection.execute(
            `UPDATE crop_posts
               SET quantity = GREATEST(quantity - ?, 0),
                   status = CASE
                     WHEN quantity - ? <= 0 THEN 'inactive'
                     ELSE status
                   END,
                   updated_at = NOW()
             WHERE id = ?`,
            [quantity, quantity, productId]
          );
        }
      }
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

// GET /api/v1/orders/monthly-count/:userId (get monthly order count for a specific user)
router.get('/monthly-count/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Get current month's start and end dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    console.log(`Fetching monthly order count for user ${userId} from ${startOfMonth.toISOString()} to ${endOfMonth.toISOString()}`);
    
    // Count orders for this user in the current month
    const [result] = await db.execute(
      `SELECT COUNT(*) as count 
       FROM orders 
       WHERE userId = ? 
       AND createdAt >= ? 
       AND createdAt <= ?`,
      [userId, startOfMonth, endOfMonth]
    );
    
    const orderCount = result[0]?.count || 0;
    
    console.log(`User ${userId} has ${orderCount} orders this month`);
    
    res.json({ 
      success: true, 
      count: parseInt(orderCount),
      period: {
        start: startOfMonth.toISOString(),
        end: endOfMonth.toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching monthly order count:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch monthly order count',
      error: error.message 
    });
  }
});

module.exports = router;
