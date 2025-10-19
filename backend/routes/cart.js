

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { pool } = require('../config/database');
const { getFarmerCoordinates, getBuyerCartCoordinates } = require("../models/cartModel");

// Get cart items for the authenticated user
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const [cartItems] = await pool.execute(
      `SELECT * FROM carts WHERE userId = ? ORDER BY createdAt DESC`, [userId]
    );
    res.status(200).json({ success: true, data: cartItems });
  } catch (error) {
    console.error('Error fetching cart items:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch cart items', error: error.message });
  }
});

// Add item to cart
router.post('/', authenticate, async (req, res) => {
  console.log('🛒 Cart POST request received:', {
    userId: req.user?.id,
    body: req.body
  });
  try {
    const userId = req.user.id;
    const {
      productId,
      quantity,
      productName,
      priceAtAddTime,
      productUnit,
      farmerName,
      location,
      productImage,
      district,
      productType,
      latitude,
      longitude
    } = req.body;

    const hasLatitude = Object.prototype.hasOwnProperty.call(req.body, 'latitude');
    const hasLongitude = Object.prototype.hasOwnProperty.call(req.body, 'longitude');

    const normalizeCoordinate = (value) => {
      if (value === undefined) return undefined;
      if (value === null || value === '') return null;
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    };

    const normalizedLatitude = normalizeCoordinate(latitude);
    const normalizedLongitude = normalizeCoordinate(longitude);

    console.log('📋 Processing cart addition:', {
      userId,
      productId,
      quantity,
      productName,
      farmerName,
      location,
      district,
      productType,
      latitude: normalizedLatitude,
      longitude: normalizedLongitude
    });

    // Check if the item already exists in the cart (considering both productId and productType)
    const [existingRows] = await pool.execute(
      `SELECT * FROM carts WHERE userId = ? AND productId = ? AND productType = ?`, 
      [userId, productId, productType || 'crop']
    );

    if (existingRows.length > 0) {
      // Update quantity if item exists
      console.log('🔄 Updating existing cart item');
      const existingItem = existingRows[0];
      const newQuantity = existingItem.quantity + quantity;
      const updatedLatitude = hasLatitude ? normalizedLatitude : existingItem.latitude;
      const updatedLongitude = hasLongitude ? normalizedLongitude : existingItem.longitude;
      await pool.execute(
        `UPDATE carts SET quantity = ?, priceAtAddTime = ?, latitude = ?, longitude = ?, updatedAt = NOW() WHERE id = ?`,
        [newQuantity, priceAtAddTime, updatedLatitude, updatedLongitude, existingItem.id]
      );
      console.log('✅ Cart item updated successfully');
      res.status(200).json({ success: true, message: 'Cart item updated' });
    } else {
      // Insert new item - productImage can now be LONGTEXT to handle base64 data URLs
      console.log('➕ Adding new cart item');
      
      const insertLatitude = hasLatitude ? normalizedLatitude : null;
      const insertLongitude = hasLongitude ? normalizedLongitude : null;

      const insertResult = await pool.execute(
        `INSERT INTO carts (userId, productId, quantity, priceAtAddTime, productName, productUnit, farmerName, location, productImage, district, productType, latitude, longitude, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          userId,
          productId,
          quantity,
          priceAtAddTime,
          productName,
          productUnit,
          farmerName,
          location,
          productImage,
          district,
          productType || 'crop',
          insertLatitude,
          insertLongitude
        ]
      );
      console.log('✅ New cart item added successfully:', insertResult[0]);
      res.status(201).json({ success: true, message: 'Item added to cart' });
    }
  } catch (error) {
    console.error('❌ Error adding item to cart:', error);
    console.error('🔍 Error details:', {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage
    });
    res.status(500).json({ success: false, message: 'Failed to add item to cart', error: error.message });
  }
});

// Update cart item quantity
router.put('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const cartItemId = req.params.id;
    const { quantity } = req.body;

    if (quantity <= 0) {
  // Remove dependent cart_transports first to avoid FK constraint errors, then remove the cart item
  await pool.execute(`DELETE FROM cart_transports WHERE cart_item_id = ?`, [cartItemId]);
  await pool.execute(`DELETE FROM carts WHERE id = ? AND userId = ?`, [cartItemId, userId]);
      return res.status(200).json({ success: true, message: 'Item removed from cart' });
    } else {
      // Update the quantity
      const [result] = await pool.execute(
        `UPDATE carts SET quantity = ?, updatedAt = NOW() WHERE id = ? AND userId = ?`,
        [quantity, cartItemId, userId]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Cart item not found' });
      }
      return res.status(200).json({ success: true, message: 'Cart item updated' });
    }
  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({ success: false, message: 'Failed to update cart item', error: error.message });
  }
});

// Remove item from cart
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const cartItemId = req.params.id;
    // Remove dependent transport allocations first to satisfy FK constraints
    await pool.execute(`DELETE FROM cart_transports WHERE cart_item_id = ?`, [cartItemId]);
    const [result] = await pool.execute(
      `DELETE FROM carts WHERE id = ? AND userId = ?`, [cartItemId, userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }
    res.status(200).json({ success: true, message: 'Item removed from cart' });
  } catch (error) {
    console.error('Error removing cart item:', error);
    res.status(500).json({ success: false, message: 'Failed to remove cart item', error: error.message });
  }
});

// Clear cart
router.delete('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    // Remove dependent transport allocations first to avoid FK constraint errors
    await pool.execute(
      `DELETE ct FROM cart_transports ct
       JOIN carts c ON ct.cart_item_id = c.id
       WHERE c.userId = ?`,
      [userId]
    );
    await pool.execute(`DELETE FROM carts WHERE userId = ?`, [userId]);
    res.status(200).json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ success: false, message: 'Failed to clear cart', error: error.message });
  }
});


router.get("/:productId/coordinates", async (req, res) => {
  try {
    const coords = await getFarmerCoordinates(req.params.productId);
    if (!coords) {
      return res.status(404).json({ success: false, message: "Coordinates not found for product" });
    }
    res.json({ success: true, data: coords });
  } catch (err) {
    console.error("Error fetching product coordinates:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

router.get("/buyer/:buyerId/cart-coordinates", async (req, res) => {
  try {
    const coordsList = await getBuyerCartCoordinates(req.params.buyerId);
    res.json(coordsList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

module.exports = router;
