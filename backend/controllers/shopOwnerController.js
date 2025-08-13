const ShopOwner = require('../models/ShopOwner');
const User = require('../models/User');
const db = require('../config/database');

// Get all shop owner accounts for approval
exports.getAllShopOwners = async (req, res) => {
  try {
    // Use a JOIN to fetch users and their shop details in one query
    const query = `
      SELECT u.id, u.full_name, u.email, u.phone_number, u.district, u.nic, u.address, u.user_type, u.created_at, u.is_active, u.profile_image, u.profile_image_mime,
        s.shop_name, s.business_registration_number, s.shop_address, s.shop_phone_number, s.shop_email, s.shop_description, s.shop_category, s.operating_hours, s.opening_days, s.delivery_areas, s.shop_license, s.shop_image
      FROM users u
      LEFT JOIN shop_details s ON u.id = s.user_id
      WHERE u.user_type = 3
    `;
    const [rows] = await db.pool.execute(query);
    // Convert profile_image from Buffer to base64 string
    rows.forEach(user => {
      if (user.profile_image) {
        user.profile_image = Buffer.from(user.profile_image).toString('base64');
      }
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching shop owners', error: err.message });
  }
};

// Approve shop owner
exports.approveShopOwner = async (req, res) => {
  try {
    const id = req.params.id;
    await User.setActive(id, 1);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error approving shop owner', error: err.message });
  }
};

// Reject shop owner
exports.rejectShopOwner = async (req, res) => {
  try {
    const id = req.params.id;
    await User.delete(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error rejecting shop owner', error: err.message });
  }
};

// Suspend shop owner
exports.suspendShopOwner = async (req, res) => {
  try {
    const id = req.params.id;
    await User.setActive(id, 0);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error suspending shop owner', error: err.message });
  }
};
