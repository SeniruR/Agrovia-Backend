const express = require('express');
const router = express.Router();
const db = require('../utils/db'); // adjust path to your db connection

// POST /api/v1/orders
router.post('/', async (req, res) => {
  try {
    const {
      userId,
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

    const orderValues = [
      userId, orderId, paymentId, status, totalAmount, currency,
      deliveryName, deliveryPhone, deliveryAddress, deliveryDistrict, deliveryCountry
    ];

    // Insert order
    const [orderResult] = await db.execute(
      `INSERT INTO orders (
        userId, orderId, paymentId, status, totalAmount, currency,
        deliveryName, deliveryPhone, deliveryAddress, deliveryDistrict, deliveryCountry
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      orderValues
    );
    const newOrderId = orderResult.insertId;

    // Insert order items
    for (const item of items) {
      // Map frontend cart item fields to order_items columns
      const itemValues = [
        newOrderId,          // FK to orders.id
        item.id,             // productId
        item.name,           // productName
        item.quantity,       // quantity
        item.price,          // unitPrice
        item.quantity * item.price, // subtotal
        item.unit,           // productUnit
        item.farmer,         // farmerName
        item.location,       // location
        item.image || null   // productImage
      ];
      await db.execute(
        `INSERT INTO order_items (
          orderId, productId, productName, quantity, unitPrice, subtotal,
          productUnit, farmerName, location, productImage
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        itemValues
      );
    }

    res.status(201).json({ success: true, orderId: newOrderId });
  } catch (err) {
    console.error('Order save error:', err);
    res.status(500).json({ success: false, message: 'Order save failed', error: err.message });
  }
});

module.exports = router;
