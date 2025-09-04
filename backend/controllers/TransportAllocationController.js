const { pool } = require('../config/database');
const TransportAllocation = require('../models/TransportAllocation');

// Create a transport allocation with FK validation and payload sanitization
exports.createTransportAllocation = async (req, res) => {
    try {
        const raw = req.body || {};

        // Accept cart id under several possible names from frontend
        const cartId = raw.cart_item_id || raw.cart_id || raw.cartId || (raw.cart && raw.cart.id);
        const transportId = raw.transport_id || raw.transporter_id || raw.transportId;

        // basic payload validation
        if (!cartId || !transportId) {
            return res.status(400).json({ message: 'Missing required fields: cart_item_id (or cart_id) and transport_id' });
        }

        // verify cart exists
        const [cartRows] = await pool.query('SELECT id FROM carts WHERE id = ?', [cartId]);
        if (!cartRows || cartRows.length === 0) {
            return res.status(400).json({ message: 'Invalid cart id' });
        }

        // verify transporter exists
        const [transRows] = await pool.query('SELECT id FROM transporter_details WHERE id = ?', [transportId]);
        if (!transRows || transRows.length === 0) {
            return res.status(400).json({ message: 'Invalid transport_id' });
        }

        // Log raw body to help debug missing fields
        console.log('Transport allocation raw body:', raw);

        // Build sanitized payload: map frontend names to DB columns
        const sanitized = {};
        sanitized.cart_item_id = cartId;
        sanitized.transport_id = transportId;

        // transporter name mapping (frontend may send transporter_name or transporterName)
        sanitized.transporter_name = raw.transporter_name || raw.transporterName || raw.transporter || null;

        sanitized.vehicle_type = raw.vehicle_type || raw.vehicleType || null;
        sanitized.vehicle_number = raw.vehicle_number || raw.vehicleNumber || null;
        sanitized.phone_number = raw.phone_number || raw.phoneNumber || null;

        const toNumber = (v) => (v === undefined || v === null || v === '' ? undefined : Number(v));
        if (toNumber(raw.base_rate ?? raw.baseRate) !== undefined) sanitized.base_rate = toNumber(raw.base_rate ?? raw.baseRate);
        if (toNumber(raw.per_km_rate ?? raw.perKmRate) !== undefined) sanitized.per_km_rate = toNumber(raw.per_km_rate ?? raw.perKmRate);
        if (toNumber(raw.calculated_distance ?? raw.calculatedDistance) !== undefined) sanitized.calculated_distance = toNumber(raw.calculated_distance ?? raw.calculatedDistance);
        if (toNumber(raw.transport_cost ?? raw.transportCost) !== undefined) sanitized.transport_cost = toNumber(raw.transport_cost ?? raw.transportCost);

        sanitized.district = raw.district || raw.area || null;

        if (raw.created_at) {
            const d = new Date(raw.created_at);
            if (!Number.isNaN(d.getTime())) sanitized.created_at = d;
        }

        // Log sanitized payload for debugging
        console.log('Transport allocation sanitized payload:', sanitized);

        const result = await TransportAllocation.create(sanitized);
        res.status(201).json({ message: 'Transport allocation created successfully', data: result });
    } catch (error) {
        console.error('Transport allocation error:', error);
        res.status(500).json({ message: 'Error creating transport allocation', error: error.message });
    }
};
// Get all transport allocations
exports.getAllTransportAllocations = async (req, res) => {
    try {
        const rows = await TransportAllocation.findAll();
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Get all transport allocations error:', err);
        res.status(500).json({ message: 'Error fetching transport allocations', error: err.message });
    }
};

// Get allocations by cart item id
exports.getByCartItem = async (req, res) => {
    try {
        const cart_item_id = req.params.cart_item_id;
        const rows = await TransportAllocation.findByCartItem(cart_item_id);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Get allocations by cart item error:', err);
        res.status(500).json({ message: 'Error fetching transport allocations', error: err.message });
    }
};