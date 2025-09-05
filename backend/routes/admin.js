const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all option definitions
router.get('/options', async (req, res) => {
  try {
    const [options] = await db.execute(`
      SELECT * FROM option_definitions 
      ORDER BY category, display_order, name
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
    // Get all tiers
    const [tiers] = await db.execute(`
      SELECT st.*, GROUP_CONCAT(CONCAT(to.option_id, ':', to.value) SEPARATOR '|') as options_data
      FROM subscription_tiers st
      LEFT JOIN tier_options to ON st.id = to.tier_id
      GROUP BY st.id
      ORDER BY st.user_type, st.display_order, st.name
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

      const tierData = {
        id: tier.id,
        name: tier.name,
        price: tier.price,
        benefits: tier.benefits ? JSON.parse(tier.benefits) : [],
        options: options,
        display_order: tier.display_order,
        is_active: tier.is_active
      };

      if (result[tier.user_type]) {
        result[tier.user_type].push(tierData);
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

    // Start transaction
    await db.execute('START TRANSACTION');

    try {
      // Update the tier
      await db.execute(`
        UPDATE subscription_tiers 
        SET name = ?, price = ?, benefits = ?, updated_at = NOW()
        WHERE id = ? AND user_type = ?
      `, [name, price, JSON.stringify(benefits), tierId, userType]);

      // Delete existing tier options
      await db.execute('DELETE FROM tier_options WHERE tier_id = ?', [tierId]);

      // Insert new tier options
      if (options && Object.keys(options).length > 0) {
        const optionValues = Object.entries(options).map(([optionId, value]) => [
          tierId, optionId, value
        ]);
        
        const placeholders = optionValues.map(() => '(?, ?, ?)').join(', ');
        const flatValues = optionValues.flat();
        
        await db.execute(`
          INSERT INTO tier_options (tier_id, option_id, value) 
          VALUES ${placeholders}
        `, flatValues);
      }

      await db.execute('COMMIT');
      res.json({ message: 'Tier updated successfully' });
    } catch (error) {
      await db.execute('ROLLBACK');
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

    // Start transaction
    await db.execute('START TRANSACTION');

    try {
      // Get next display order
      const [orderResult] = await db.execute(`
        SELECT COALESCE(MAX(display_order), 0) + 1 as next_order 
        FROM subscription_tiers 
        WHERE user_type = ?
      `, [userType]);
      
      const displayOrder = orderResult[0].next_order;

      // Insert the tier
      const [result] = await db.execute(`
        INSERT INTO subscription_tiers (name, user_type, price, benefits, display_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      `, [name, userType, price, JSON.stringify(benefits), displayOrder]);

      const tierId = result.insertId;

      // Insert tier options if provided
      if (options && Object.keys(options).length > 0) {
        const optionValues = Object.entries(options).map(([optionId, value]) => [
          tierId, optionId, value
        ]);
        
        const placeholders = optionValues.map(() => '(?, ?, ?)').join(', ');
        const flatValues = optionValues.flat();
        
        await db.execute(`
          INSERT INTO tier_options (tier_id, option_id, value) 
          VALUES ${placeholders}
        `, flatValues);
      }

      await db.execute('COMMIT');
      
      // Return the created tier
      const newTier = {
        id: tierId,
        name,
        price,
        benefits,
        options: options || {},
        display_order: displayOrder,
        is_active: true
      };
      
      res.status(201).json(newTier);
    } catch (error) {
      await db.execute('ROLLBACK');
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

    // Start transaction
    await db.execute('START TRANSACTION');

    try {
      // Delete tier options first (due to foreign key)
      await db.execute('DELETE FROM tier_options WHERE tier_id = ?', [tierId]);

      // Delete the tier
      const [result] = await db.execute(`
        DELETE FROM subscription_tiers 
        WHERE id = ? AND user_type = ?
      `, [tierId, userType]);

      if (result.affectedRows === 0) {
        await db.execute('ROLLBACK');
        return res.status(404).json({ error: 'Tier not found' });
      }

      await db.execute('COMMIT');
      res.json({ message: 'Tier deleted successfully' });
    } catch (error) {
      await db.execute('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error deleting tier:', error);
    res.status(500).json({ error: 'Failed to delete tier' });
  }
});

module.exports = router;
