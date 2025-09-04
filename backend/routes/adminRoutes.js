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
    
    console.log('Fetched options from database:', options.length, 'options found');
    res.json(options);
  } catch (error) {
    console.error('Error fetching options:', error);
    res.status(500).json({ error: 'Failed to fetch options' });
  }
});

// Debug endpoint to check and seed option definitions
router.post('/options/seed', async (req, res) => {
  try {
    // Check if options already exist
    const [existingOptions] = await db.execute('SELECT COUNT(*) as count FROM option_definitions');
    
    if (existingOptions[0].count > 0) {
      return res.json({ message: 'Options already exist', count: existingOptions[0].count });
    }
    
    // Seed default options
    const defaultOptions = [
      {
        id: 'max_ads_per_month',
        name: 'Max ads per month',
        type: 'number',
        unit: 'ads',
        default_value: '2',
        min_value: 0,
        max_value: 1000,
        description: 'Number of ads a shop/farmer can post per month'
      },
      {
        id: 'priority_support',
        name: 'Priority support',
        type: 'boolean',
        default_value: 'false',
        description: 'Whether the tier includes priority customer support'
      },
      {
        id: 'featured_placement',
        name: 'Featured placement',
        type: 'boolean',
        default_value: 'false',
        description: 'Whether the shop gets featured placement on marketplace'
      }
    ];
    
    for (const option of defaultOptions) {
      await db.execute(`
        INSERT INTO option_definitions 
        (id, name, type, unit, default_value, min_value, max_value, description, editable_by_admin)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `, [
        option.id, option.name, option.type, option.unit || null, 
        option.default_value, option.min_value || null, option.max_value || null, 
        option.description
      ]);
    }
    
    res.json({ message: 'Options seeded successfully', count: defaultOptions.length });
  } catch (error) {
    console.error('Error seeding options:', error);
    res.status(500).json({ error: 'Failed to seed options' });
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
        console.log('Parsing options_data for tier', tier.id, ':', tier.options_data);
        tier.options_data.split('|').forEach(optionPair => {
          const [optionId, value] = optionPair.split(':');
          options[optionId] = value === 'unlimited' ? 'unlimited' : 
                            (!isNaN(value) ? Number(value) : value === 'true');
        });
        console.log('Parsed options for tier', tier.id, ':', options);
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
        console.log('Processing tier options:', options);
        
        for (const [optionId, value] of Object.entries(options)) {
          console.log('Processing option:', { optionId, value });
          
          // For compatibility, try both string ID and numeric ID lookup
          const [optionRows] = await connection.execute(
            'SELECT id FROM option_definitions WHERE id = ? OR name = ?', 
            [optionId, optionId]
          );
          
          console.log('Option lookup result:', { optionId, found: optionRows.length > 0 });
          
          if (optionRows.length > 0) {
            const actualOptionId = optionRows[0].id;
            console.log('Inserting tier option:', { tierId, actualOptionId, value });
            
            await connection.execute(`
              INSERT INTO tier_options (tier_id, option_id, value) 
              VALUES (?, ?, ?)
            `, [tierId, actualOptionId, JSON.stringify(value)]);
          } else {
            console.warn('Option not found in database:', optionId);
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

// User Subscription Management Routes

// Create a new user subscription (when user subscribes to a tier)
router.post('/user-subscriptions', async (req, res) => {
  try {
    const { userId, tierId, userType, orderId, amount, paymentMethod } = req.body;
    
    console.log('Received subscription request:', { userId, tierId, userType, orderId, amount, paymentMethod });
    
    if (!userId || !tierId || !userType || !orderId) {
      console.log('Missing required fields');
      return res.status(400).json({ error: 'Missing required fields: userId, tierId, userType, orderId' });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Check if tier exists
      const [tierRows] = await connection.execute(
        'SELECT id, name, price FROM subscription_tiers WHERE id = ?',
        [tierId]
      );
      
      console.log('Tier lookup result for tierId', tierId, ':', tierRows);
      
      if (tierRows.length === 0) {
        console.log('Tier not found for ID:', tierId);
        await connection.rollback();
        connection.release();
        return res.status(404).json({ error: 'Subscription tier not found' });
      }

      const tier = tierRows[0];
      console.log('Creating subscription with payment method:', paymentMethod, 'for tier price:', tier.price);

      // Cancel any existing active subscription for this user and user type
      await connection.execute(`
        UPDATE user_subscriptions 
        SET status = 'cancelled', end_date = CURRENT_TIMESTAMP 
        WHERE user_id = ? AND user_type = ? AND status = 'active'
      `, [userId, userType]);

      // Calculate next billing date (1 month from now for paid plans, null for free)
      const nextBillingDate = tier.price > 0 ? 
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : // 30 days from now
        null;

      // Create new subscription
      const [subscriptionResult] = await connection.execute(`
        INSERT INTO user_subscriptions 
        (user_id, tier_id, user_type, status, next_billing_date, payment_method) 
        VALUES (?, ?, ?, 'active', ?, ?)
      `, [userId, tierId, userType, nextBillingDate, paymentMethod || 'payhere']);

      const subscriptionId = subscriptionResult.insertId;

      // Create billing history record
      const billingPeriodStart = new Date();
      const billingPeriodEnd = tier.price > 0 ? 
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : // 30 days from now
        null;

      await connection.execute(`
        INSERT INTO billing_history 
        (subscription_id, user_id, tier_id, order_id, amount, payment_method, 
         payment_status, billing_period_start, billing_period_end) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        subscriptionId, 
        userId, 
        tierId, 
        orderId, 
        amount || tier.price, 
        paymentMethod || 'payhere',
        // Set status based on payment method and amount
        tier.price === 0 ? 'completed' : // Free plans are completed
        paymentMethod === 'free' ? 'completed' : // Explicitly free method
        paymentMethod === 'card' ? 'completed' : // PayHere card payments are pre-authorized
        'pending', // Default to pending for other cases
        billingPeriodStart,
        billingPeriodEnd
      ]);

      await connection.commit();
      connection.release();

      res.json({ 
        success: true,
        message: 'Subscription created successfully',
        data: {
          subscriptionId,
          tierId,
          tierName: tier.name,
          userType,
          status: 'active',
          nextBillingDate: nextBillingDate ? billingPeriodEnd : null
        }
      });

    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Error creating user subscription:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to create subscription', details: error.message });
  }
});

// Get user's billing history (MUST come before the /:userId/:userType route)
router.get('/user-subscriptions/:userId/billing-history', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    // Ensure we have valid integers
    const limitInt = Math.max(1, parseInt(limit) || 10);
    const offsetInt = Math.max(0, parseInt(offset) || 0);

    console.log('Billing history params:', { userId, limitInt, offsetInt });

    // Use string concatenation for LIMIT and OFFSET as they can't be parameterized in MySQL prepared statements
    const [billingHistory] = await db.execute(`
      SELECT bh.* 
      FROM billing_history bh
      WHERE bh.user_id = ?
      ORDER BY bh.created_at DESC
      LIMIT ${limitInt} OFFSET ${offsetInt}
    `, [userId]);

    console.log('Billing history found:', billingHistory.length, 'records');

    // If we have records, get the tier names separately
    const enrichedHistory = [];
    for (const record of billingHistory) {
      try {
        const [tierResult] = await db.execute(`
          SELECT name FROM subscription_tiers WHERE id = ?
        `, [record.tier_id]);
        
        const tierName = tierResult.length > 0 ? tierResult[0].name : 'Unknown Plan';
        
        enrichedHistory.push({
          ...record,
          tier_name: tierName,
          user_type: 'unknown' // We'll get this from user_subscriptions if needed
        });
      } catch (err) {
        console.warn('Error enriching record:', err);
        enrichedHistory.push({
          ...record,
          tier_name: 'Unknown Plan',
          user_type: 'unknown'
        });
      }
    }

    res.json({
      success: true,
      billingHistory: enrichedHistory.map(record => ({
        id: record.id,
        orderId: record.order_id,
        paymentId: record.payment_id,
        tierName: record.tier_name,
        userType: record.user_type,
        amount: record.amount,
        currency: record.currency,
        paymentMethod: record.payment_method,
        paymentStatus: record.payment_status,
        paymentDate: record.payment_date,
        billingPeriodStart: record.billing_period_start,
        billingPeriodEnd: record.billing_period_end,
        createdAt: record.created_at
      }))
    });
  } catch (error) {
    console.error('Error fetching billing history:', error);
    res.status(500).json({ error: 'Failed to fetch billing history' });
  }
});

// Get user's current subscription
router.get('/user-subscriptions/:userId/:userType', async (req, res) => {
  try {
    const { userId, userType } = req.params;

    const [subscriptions] = await db.execute(`
      SELECT us.*, st.name as tier_name, st.price as tier_price, st.benefits 
      FROM user_subscriptions us
      JOIN subscription_tiers st ON us.tier_id = st.id
      WHERE us.user_id = ? AND us.user_type = ? AND us.status = 'active'
      ORDER BY us.created_at DESC
      LIMIT 1
    `, [userId, userType]);

    if (subscriptions.length === 0) {
      return res.json({ 
        success: true, 
        currentSubscription: null,
        message: 'No active subscription found'
      });
    }

    const subscription = subscriptions[0];
    
    // Parse benefits
    let benefits = [];
    try {
      benefits = typeof subscription.benefits === 'string' ? 
        JSON.parse(subscription.benefits) : 
        subscription.benefits || [];
    } catch (e) {
      console.warn('Failed to parse benefits:', e);
      benefits = [];
    }

    res.json({
      success: true,
      currentSubscription: {
        id: subscription.id,
        tierId: subscription.tier_id,
        tierName: subscription.tier_name,
        tierPrice: subscription.tier_price,
        benefits: benefits,
        status: subscription.status,
        startDate: subscription.start_date,
        nextBillingDate: subscription.next_billing_date,
        paymentMethod: subscription.payment_method
      }
    });
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// Update payment status (webhook endpoint for payment gateway)
router.put('/billing-history/:orderId/payment-status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentId, paymentStatus, paymentDate } = req.body;

    console.log('Payment status update request:', {
      orderId,
      paymentId,
      paymentStatus,
      paymentDate
    });

    const [result] = await db.execute(`
      UPDATE billing_history 
      SET payment_id = ?, payment_status = ?, payment_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE order_id = ?
    `, [paymentId, paymentStatus, paymentDate || new Date(), orderId]);

    console.log('Payment status update result:', {
      affectedRows: result.affectedRows,
      orderId
    });

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Billing record not found' });
    }

    res.json({ 
      success: true, 
      message: 'Payment status updated successfully' 
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ error: 'Failed to update payment status' });
  }
});

module.exports = router;
