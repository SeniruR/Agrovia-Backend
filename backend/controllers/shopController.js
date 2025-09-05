const { pool } = require('../config/database');

// Controller for searching shops by name
const searchShops = async (req, res) => {
  const { search = '' } = req.query;
  try {
    const [rows] = await pool.execute(
      `SELECT id, shop_name, shop_address FROM shop_details WHERE shop_name LIKE ? LIMIT 10`,
      [`%${search}%`]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error searching shops:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { searchShops };
