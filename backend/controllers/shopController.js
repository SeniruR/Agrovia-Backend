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

// Controller to get shop by ID
const getShopById = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'Shop ID is required' });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT id, shop_name, shop_address, is_active FROM shop_details WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Check if shop is active
    if (rows[0].is_active === 0) {
      return res.status(403).json({ error: 'Shop is not active' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error getting shop by ID:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { searchShops, getShopById };
