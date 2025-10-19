const pool = require('../utils/db');

// Optional dev logger
const devLog = (...args) => { if (process.env.DEBUG_ATTACHMENT_LOGS === 'true') console.log(...args); };

// GET /api/v1/driver/deliveries
// Returns deliveries (order items) assigned to the authenticated transporter
exports.getDeliveriesForTransporter = async (req, res) => {
  try {
    const transporterUserId = req.user.id;

    const sql = `
      SELECT
        ot.id AS order_transport_id,
        ot.order_item_id,
        oi.id AS order_item_id,
        oi.productName,
        oi.quantity,
        oi.productUnit,
        oi.status,
        oi.product_type AS productType,
        o.id AS order_id,
        o.orderId AS externalOrderId,
        o.deliveryName,
        o.deliveryPhone,
        o.deliveryAddress,
        o.deliveryDistrict,
        cp.location AS pickupLocation,
        cp.district AS pickupDistrict,
        u_farmer.full_name AS farmerName,
        u_farmer.phone_number AS farmerPhone,
        sd.shop_name AS shopName,
        sd.shop_phone_number AS shopPhone,
        sd.shop_address AS shopAddress,
        sd.latitude AS shopLatitude,
        sd.longitude AS shopLongitude,
        sd.delivery_areas AS shopDeliveryAreas,
        u_shop.full_name AS shopOwnerName,
        u_shop.phone_number AS shopOwnerPhone,
        -- coordinates: prefer values stored on order_transports (copied from allocation), fall back to user/crop posts or shop details
        ot.item_latitude AS ot_item_latitude,
        ot.item_longitude AS ot_item_longitude,
        ot.user_latitude AS ot_user_latitude,
        ot.user_longitude AS ot_user_longitude,
        u_farmer.latitude AS farmer_latitude,
        u_farmer.longitude AS farmer_longitude,
        u_buyer.latitude AS buyer_latitude,
        u_buyer.longitude AS buyer_longitude,
        td.id AS transporter_detail_id,
        td.user_id AS transporter_user_id,
        ot.transport_cost,
        ot.calculated_distance,
        ot.vehicle_type,
        ot.vehicle_number,
        o.createdAt
      FROM order_transports ot
      JOIN order_items oi ON oi.id = ot.order_item_id
      JOIN orders o ON o.id = oi.orderId
      LEFT JOIN crop_posts cp ON cp.id = oi.productId
      LEFT JOIN users u_farmer ON cp.farmer_id = u_farmer.id
      LEFT JOIN products p ON p.id = oi.productId
      LEFT JOIN shop_details sd ON sd.id = p.shop_id
      LEFT JOIN users u_shop ON sd.user_id = u_shop.id
      LEFT JOIN users u_buyer ON o.userId = u_buyer.id
      LEFT JOIN transporter_details td ON (td.id = ot.transporter_id OR td.id = ot.transport_id)
      WHERE td.user_id = ?
      ORDER BY o.createdAt DESC
    `;

    const [rows] = await pool.execute(sql, [transporterUserId]);

    // Map rows to a clean delivery object for frontend
    // Helper to normalize various order status values into the four canonical statuses:
    // 'pending' | 'collecting' | 'in-progress' | 'completed'
    const normalizeStatus = (s) => {
      if (!s) return 'pending';
      const st = String(s).toLowerCase().trim();
      if (st.includes('collect') || st.includes('assigned') || st.includes('on-the-way') || st.includes('on_the_way')) return 'collecting';
      if (st.includes('collected') ) return 'in-progress';
      if (st.includes('complete') || st === 'delivered') return 'completed';
      if (st.includes('in-progress') || st.includes('inprogress') || st.includes('in progress') || st.includes('deliver') || st.includes('in-transit') || st.includes('transit')) return 'in-progress';
      // Default to pending
      return 'pending';
    };

    const deliveries = rows.map((r) => {
      const productType = (r.productType || 'crop').toLowerCase();
      const isShop = productType === 'shop';

      const pickupLocation = isShop
        ? (r.shopAddress || r.shopName || r.pickupLocation || null)
        : (r.pickupLocation || r.shopAddress || null);

      const pickupDistrict = isShop
        ? (r.shopDeliveryAreas || r.deliveryDistrict || null)
        : (r.pickupDistrict || r.shopDeliveryAreas || null);

      const pickupLatitude = r.ot_item_latitude
        || (isShop ? r.shopLatitude : r.farmer_latitude)
        || null;

      const pickupLongitude = r.ot_item_longitude
        || (isShop ? r.shopLongitude : r.farmer_longitude)
        || null;

      const contactName = isShop
        ? (r.shopName || r.shopOwnerName || null)
        : (r.farmerName || null);

      const contactPhone = isShop
        ? (r.shopPhone || r.shopOwnerPhone || null)
        : (r.farmerPhone || null);

      return {
        id: r.order_transport_id,
        orderItemId: r.order_item_id,
        orderId: r.order_id,
        externalOrderId: r.externalOrderId,
        status: normalizeStatus(r.status),
        productName: r.productName,
        quantity: r.quantity,
        productUnit: r.productUnit,
        productType,
        pickupLocation,
        pickupDistrict,
        pickupLatitude,
        pickupLongitude,
        farmerName: contactName,
        farmerPhone: contactPhone,
        farmerLatitude: pickupLatitude,
        farmerLongitude: pickupLongitude,
        buyerLatitude: r.ot_user_latitude || r.buyer_latitude || null,
        buyerLongitude: r.ot_user_longitude || r.buyer_longitude || null,
        buyerName: r.deliveryName || r.buyerName,
  buyerAddress: r.deliveryAddress || null,
        buyerPhone: r.deliveryPhone || r.buyerPhone,
        deliveryLocation: r.deliveryAddress || null,
        scheduledDate: r.scheduledDate || (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : null),
        scheduledTime: r.scheduledTime || (r.createdAt ? new Date(r.createdAt).toLocaleTimeString() : null),
        transport_cost: r.transport_cost,
        calculated_distance: r.calculated_distance,
        vehicle_type: r.vehicle_type,
        vehicle_number: r.vehicle_number,
        transporterDetailId: r.transporter_detail_id,
        transporterId: r.transporter_user_id,
        transporterUserId: r.transporter_user_id,
        shopName: r.shopName || null,
        shopPhone: r.shopPhone || r.shopOwnerPhone || null,
        shopAddress: r.shopAddress || null,
        shopLatitude: r.shopLatitude || null,
        shopLongitude: r.shopLongitude || null,
        shopOwnerName: r.shopOwnerName || null,
        shopOwnerPhone: r.shopOwnerPhone || null,
        createdAt: r.createdAt
      };
    });

    return res.json({ success: true, data: deliveries });
  } catch (err) {
    console.error('Error fetching driver deliveries:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch deliveries', error: err.message });
  }
};

// PATCH /api/v1/driver/deliveries/:id/status
// Updates the status of an order item (delivery) for the authenticated transporter
exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params; // This is the order_transport_id
    const { status } = req.body;
    const transporterUserId = req.user.id;

  devLog(`🚚 STATUS UPDATE REQUEST: transport_id=${id}, raw_status="${status}", user_id=${transporterUserId}`);

    // Normalize incoming status to the four canonical statuses before persisting
    const canonicalizeIncomingStatus = (s) => {
      if (!s) return null;
      const st = String(s).toLowerCase().trim();
      if (st.includes('collect')) return 'collecting';
      if (st.includes('collected')) return 'in-progress';
      if (st.includes('complete') || st === 'delivered') return 'completed';
      if (st.includes('in-progress') || st.includes('inprogress') || st.includes('in progress') || st.includes('deliver')) return 'in-progress';
      if (st.includes('pending') || st === 'new' || st === 'created' || st === 'assigned') return 'pending';
      return null;
    };

    const newStatus = canonicalizeIncomingStatus(status);
    const validStatuses = ['pending', 'collecting', 'in-progress', 'completed'];
    if (!newStatus || !validStatuses.includes(newStatus)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid status. Must map to one of: ${validStatuses.join(', ')}` 
      });
    }

    // First verify that this order_transport belongs to the authenticated transporter
    const verifySql = `
      SELECT ot.order_item_id, oi.id
      FROM order_transports ot
      JOIN order_items oi ON oi.id = ot.order_item_id
      LEFT JOIN transporter_details td ON (td.id = ot.transporter_id OR td.id = ot.transport_id)
      WHERE ot.id = ? AND td.user_id = ?
    `;

    const [verifyRows] = await pool.execute(verifySql, [id, transporterUserId]);

    if (verifyRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Delivery not found or not assigned to you' 
      });
    }

    const orderItemId = verifyRows[0].order_item_id;

  devLog(`✅ Verified: order_transport_id=${id} -> order_item_id=${orderItemId}`);

    // Update the order_items status
    const updateSql = `
      UPDATE order_items 
      SET status = ? 
      WHERE id = ?
    `;

  devLog(`🔄 Updating order_items: SET status='${newStatus}' WHERE id=${orderItemId}`);
  const [updateResult] = await pool.execute(updateSql, [newStatus, orderItemId]);
    devLog(`📝 Update result:`, updateResult);

    if (updateResult.affectedRows === 0) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to update delivery status' 
      });
    }

  devLog(`✅ Successfully updated order_item ${orderItemId} to status: ${newStatus}`);

    return res.json({ 
      success: true, 
      message: 'Delivery status updated successfully',
      data: {
        order_transport_id: id,
        order_item_id: orderItemId,
        new_status: status
      }
    });

  } catch (err) {
    console.error('Error updating delivery status:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to update delivery status', 
      error: err.message 
    });
  }
};

// DELETE /api/v1/driver/deliveries/:id
// Deletes a completed delivery for the authenticated transporter
exports.deleteDelivery = async (req, res) => {
  try {
    const { id } = req.params; // This is the order_transport_id
    const transporterUserId = req.user.id;

  devLog(`🗑️ DELETE REQUEST: transport_id=${id}, user_id=${transporterUserId}`);

    // First verify that this order_transport belongs to the authenticated transporter
    // and that the delivery is completed
    const verifySql = `
      SELECT ot.order_item_id, oi.id, oi.status
      FROM order_transports ot
      JOIN order_items oi ON oi.id = ot.order_item_id
      LEFT JOIN transporter_details td ON (td.id = ot.transporter_id OR td.id = ot.transport_id)
      WHERE ot.id = ? AND td.user_id = ?
    `;

    const [verifyRows] = await pool.execute(verifySql, [id, transporterUserId]);

    if (verifyRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Delivery not found or not assigned to you' 
      });
    }

    const orderItemId = verifyRows[0].order_item_id;
    const currentStatus = verifyRows[0].status;

  // Only allow deletion of completed deliveries (normalize current status first)
  const currentNormalized = normalizeStatus(currentStatus);
  if (currentNormalized !== 'completed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only completed deliveries can be deleted' 
      });
    }

  devLog(`✅ Verified: order_transport_id=${id} -> order_item_id=${orderItemId}, status=${currentStatus}`);

    // Delete the order_transport record (this will remove it from driver's list)
    const deleteSql = `
      DELETE FROM order_transports 
      WHERE id = ?
    `;

  devLog(`🗑️ Deleting order_transport: id=${id}`);
  const [deleteResult] = await pool.execute(deleteSql, [id]);
  devLog(`📝 Delete result:`, deleteResult);

    if (deleteResult.affectedRows === 0) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to delete delivery' 
      });
    }

  devLog(`✅ Successfully deleted order_transport ${id}`);

    return res.json({ 
      success: true, 
      message: 'Delivery deleted successfully',
      data: {
        order_transport_id: id,
        order_item_id: orderItemId
      }
    });

  } catch (err) {
    console.error('Error deleting delivery:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to delete delivery', 
      error: err.message 
    });
  }
};
