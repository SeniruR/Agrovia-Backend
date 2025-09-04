const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Load admin controller with a defensive check so startup errors are clearer
const adminController = require('../controllers/adminController');
if (!adminController || typeof adminController !== 'object') {
	console.error('Failed to load adminController, got:', adminController);
	throw new Error('adminController did not export an object, check the module for syntax/runtime errors');
}

const { getAllShopsWithItems, setShopActiveStatus } = adminController;
if (typeof getAllShopsWithItems !== 'function' || typeof setShopActiveStatus !== 'function') {
	console.error('adminController exports keys:', Object.keys(adminController));
	console.error('getAllShopsWithItems type:', typeof getAllShopsWithItems, 'setShopActiveStatus type:', typeof setShopActiveStatus);
	throw new Error('adminController is missing expected handler functions (getAllShopsWithItems, setShopActiveStatus)');
}

// GET /api/v1/admin/shops
router.get('/shops', getAllShopsWithItems);
// PATCH /api/v1/admin/shops/:id/active
router.patch('/shops/:id/active', setShopActiveStatus);

// Subscription management routes

// Get all option definitions
router.get('/options', async (req, res) => {
  try {
    const [options] = await db.execute(`
      SELECT id, name, type, unit, default_value, min_value, max_value, 
             enum_values, editable_by_admin, description
      FROM option_definitions 
      ORDER BY name
    `);
    res.json(options);
  } catch (error) {
    console.error('Error fetching options:', error);
    res.status(500).json({ error: 'Failed to fetch options' });
  }
});

// Get all subscription tiers
router.get('/subscriptions', async (req, res) => {
  try {
    // Get all tiers with their options (using simplified tables)
    const [tiers] = await db.execute(`
      SELECT st.id, st.type, st.name, st.price, st.benefits, st.is_active, st.sort_order,
             GROUP_CONCAT(CONCAT(od.id, ':', tier_opt.value) SEPARATOR '|') as options_data
      FROM subscription_tiers st
      LEFT JOIN tier_options tier_opt ON st.id = tier_opt.tier_id
      LEFT JOIN option_definitions od ON tier_opt.option_id = od.id
      GROUP BY st.id
      ORDER BY st.type, st.sort_order, st.name
    `);

    // Transform the data to group by user_type and parse options
    const result = {
      farmer: [],
      buyer: [],
      shop: []
    };

    tiers.forEach(tier => {
      const options = {};
      if (tier.options_data) {
        tier.options_data.split('|').forEach(optionPair => {
          const [optionId, value] = optionPair.split(':');
          options[optionId] = value === 'unlimited' ? 'unlimited' : 
                            (!isNaN(value) ? Number(value) : value === 'true');
        });
      }

      // Parse benefits with error handling
      let benefits = [];
      if (tier.benefits) {
        if (Array.isArray(tier.benefits)) {
          // Benefits is already a parsed JSON array
          benefits = tier.benefits;
        } else {
          try {
            benefits = JSON.parse(tier.benefits);
          } catch (e) {
            // If JSON parsing fails, treat as a simple string and convert to array
            console.warn('Invalid JSON in benefits for tier', tier.id, ':', tier.benefits);
            benefits = [tier.benefits]; // Convert string to array
          }
        }
      }

      const tierData = {
        id: tier.id,           // Simple integer ID
        name: tier.name,
        price: tier.price,
        benefits: benefits,
        options: options,
        is_active: tier.is_active,
        sort_order: tier.sort_order
      };

      // Use the type field from the table
      const userType = tier.type || 'shop'; // fallback to shop
      if (result[userType]) {
        result[userType].push(tierData);
      }
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching subscription tiers:', error);
    res.status(500).json({ error: 'Failed to fetch subscription tiers' });
  }
});

// Update a subscription tier
router.put('/subscriptions/:userType/:tierId', async (req, res) => {
  try {
    const { userType, tierId } = req.params;
    const { name, price, benefits, options } = req.body;

    // Get connection and start transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Update the tier using optimized table
      await connection.execute(`
        UPDATE subscription_tiers 
        SET name = ?, price = ?, benefits = ?
        WHERE id = ?
      `, [name, price, JSON.stringify(benefits), tierId]);

      // Delete existing tier options
      await connection.execute('DELETE FROM tier_options WHERE tier_id = ?', [tierId]);

      // Insert new tier options (use option IDs directly)
      if (options && Object.keys(options).length > 0) {
        for (const [optionId, value] of Object.entries(options)) {
          // Verify the option exists
          const [optionRows] = await connection.execute(
            'SELECT id FROM option_definitions WHERE id = ?', 
            [optionId]
          );
          
          if (optionRows.length > 0) {
            await connection.execute(`
              INSERT INTO tier_options (tier_id, option_id, value) 
              VALUES (?, ?, ?)
            `, [tierId, optionId, value]);
          }
        }
      }

      await connection.commit();
      connection.release();
      res.json({ message: 'Tier updated successfully' });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Error updating tier:', error);
    res.status(500).json({ error: 'Failed to update tier' });
  }
});

// Create a new subscription tier
router.post('/subscriptions/:userType', async (req, res) => {
  try {
    const { userType } = req.params;
    const { name, price, benefits, options } = req.body;

    // Get connection and start transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Insert the tier with simplified table structure
      const [result] = await connection.execute(`
        INSERT INTO subscription_tiers (type, name, price, benefits, is_active, sort_order)
        VALUES (?, ?, ?, ?, 1, 0)
      `, [userType, name, price, JSON.stringify(benefits)]);

      const tierId = result.insertId;

      // Insert tier options (use option IDs directly)
      if (options && Object.keys(options).length > 0) {
        for (const [optionId, value] of Object.entries(options)) {
          // Verify the option exists
          const [optionRows] = await connection.execute(
            'SELECT id FROM option_definitions WHERE id = ?', 
            [optionId]
          );
          
          if (optionRows.length > 0) {
            await connection.execute(`
              INSERT INTO tier_options (tier_id, option_id, value) 
              VALUES (?, ?, ?)
            `, [tierId, optionId, value]);
          }
        }
      }

      await connection.commit();
      connection.release();
      
      // Return the created tier
      const newTier = {
        id: tierId,
        name,
        price,
        benefits,
        options: options || {}
      };
      
      res.status(201).json(newTier);
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Error creating tier:', error);
    res.status(500).json({ error: 'Failed to create tier' });
  }
});

// Delete a subscription tier
router.delete('/subscriptions/:userType/:tierId', async (req, res) => {
  try {
    const { userType, tierId } = req.params;

    // Get connection and start transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Delete tier options first (due to foreign key)
      await connection.execute('DELETE FROM tier_options WHERE tier_id = ?', [tierId]);

      // Delete the tier
      const [result] = await connection.execute(`
        DELETE FROM subscription_tiers 
        WHERE id = ?
      `, [tierId]);

      if (result.affectedRows === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ error: 'Tier not found' });
      }

      await connection.commit();
      connection.release();
      res.json({ message: 'Tier deleted successfully' });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Error deleting tier:', error);
    res.status(500).json({ error: 'Failed to delete tier' });
  }
});

module.exports = router;
