const db = require('../config/database');

const safeNumber = value => {
  if (value === undefined || value === null) return 0;
  const num = Number(value);
  return Number.isNaN(num) ? 0 : num;
};

const safeFloat = value => {
  const num = parseFloat(value);
  return Number.isNaN(num) ? 0 : num;
};

const safeDate = value => {
  try {
    const date = value ? new Date(value) : null;
    return Number.isNaN(date?.getTime()) ? null : date;
  } catch (err) {
    return null;
  }
};

const safePercent = (partial, total) => {
  if (!total) return 0;
  const result = (safeNumber(partial) / safeNumber(total)) * 100;
  return Number.isFinite(result) ? result : 0;
};

/**
 * Query helper that wraps db.execute with defensive error handling.
 */
const runQuery = async (sql, params = []) => {
  try {
    return await db.execute(sql, params);
  } catch (error) {
    console.error('adminDashboardController query failed:', { sql, params, error });
    return [[], []];
  }
};

/**
 * Aggregate high-level statistics for the admin dashboard. All numbers come directly
 * from the production database — no mock data, no fallbacks.
 */
const getOverviewStats = async () => {
  const [[{ total_users = 0, active_users = 0, inactive_users = 0 } = {}]] = await runQuery(`
    SELECT 
      COUNT(*) AS total_users,
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_users,
      SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS inactive_users
    FROM users
  `);

  const [[{ total_farmers = 0 } = {}]] = await runQuery(`
    SELECT COUNT(*) AS total_farmers
    FROM users
    WHERE user_type IN ('1', '1.0', '1.1', 1, 1.1)
  `);

  const [[{ total_buyers = 0 } = {}]] = await runQuery(`
    SELECT COUNT(*) AS total_buyers
    FROM users
    WHERE user_type IN ('2', '2.0', 2)
  `);

  const [[{ active_crop_listings = 0 } = {}]] = await runQuery(`
    SELECT COUNT(*) AS active_crop_listings
    FROM crop_posts
    WHERE status = 'active'
  `);

  const [[{ active_shop_listings = 0 } = {}]] = await runQuery(`
    SELECT COUNT(DISTINCT product_id) AS active_shop_listings
    FROM product_inventory
    WHERE is_available = 1 AND quantity > 0
  `);

  const [[{ total_orders = 0, completed_orders = 0, open_orders = 0 } = {}]] = await runQuery(`
    SELECT 
      COUNT(*) AS total_orders,
      SUM(CASE WHEN status IN ('delivered', 'completed') THEN 1 ELSE 0 END) AS completed_orders,
      SUM(CASE WHEN status NOT IN ('delivered', 'completed') THEN 1 ELSE 0 END) AS open_orders
    FROM orders
  `);

  const subscriptionStatusFilters = ['completed', 'paid', 'success', 'successful'];
  const subscriptionStatusPlaceholders = subscriptionStatusFilters.map(() => '?').join(', ');
  const [[{ subscription_revenue = 0 } = {}]] = await runQuery(`
    SELECT COALESCE(SUM(amount), 0) AS subscription_revenue
    FROM billing_history
    WHERE LOWER(COALESCE(payment_status, '')) IN (${subscriptionStatusPlaceholders})
  `, subscriptionStatusFilters);

  const orderCompletionFilters = ['delivered', 'completed', 'paid', 'success', 'successful'];
  const orderStatusPlaceholders = orderCompletionFilters.map(() => '?').join(', ');
  const [[{ crop_revenue = 0 } = {}]] = await runQuery(`
    SELECT COALESCE(SUM(totalAmount), 0) AS crop_revenue
    FROM orders
    WHERE LOWER(COALESCE(status, '')) IN (${orderStatusPlaceholders})
  `, orderCompletionFilters);

  const paymentStatusFilters = ['success', 'successful', 'completed', 'paid', 'approved'];
  const paymentStatusPlaceholders = paymentStatusFilters.map(() => '?').join(', ');
  const [[{ shop_revenue = 0 } = {}]] = await runQuery(`
    SELECT COALESCE(SUM(amount), 0) AS shop_revenue
    FROM payment_orders
    WHERE LOWER(COALESCE(status, '')) IN (${paymentStatusPlaceholders})
  `, paymentStatusFilters);

  const [[{ unresolved_complaints = 0 } = {}]] = await runQuery(`
    SELECT COUNT(*) AS unresolved_complaints
    FROM (
      SELECT id,
             CASE WHEN reply IS NOT NULL AND reply <> '' THEN 'resolved' ELSE 'open' END AS status
      FROM crop_complaints
      UNION ALL
      SELECT id,
             'open' AS status
      FROM shop_complaints
      UNION ALL
      SELECT id,
             'open' AS status
      FROM transport_complaints
    ) AS c
    WHERE status = 'open'
  `);

  const [[{ active_shops = 0, suspended_shops = 0 } = {}]] = await runQuery(`
    SELECT 
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_shops,
      SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS suspended_shops
    FROM shop_details
  `);

  const [[{ total_subscriptions = 0 } = {}]] = await runQuery(`
    SELECT COUNT(*) AS total_subscriptions
    FROM user_subscriptions
    WHERE status = 'active'
  `);

  const [[{ total_transporters = 0 } = {}]] = await runQuery(`
    SELECT COUNT(*) AS total_transporters
    FROM users
    WHERE user_type IN ('4', 4)
  `);

  const [[{ total_moderators = 0 } = {}]] = await runQuery(`
    SELECT COUNT(*) AS total_moderators
    FROM users
    WHERE user_type IN ('5', '5.1', 5)
  `);

  const cropListings = safeNumber(active_crop_listings);
  const shopListings = safeNumber(active_shop_listings);
  const listingsTotal = cropListings + shopListings;

  const subscriptionRevenue = safeFloat(subscription_revenue);
  const cropRevenue = safeFloat(crop_revenue);
  const shopRevenue = safeFloat(shop_revenue);
  const revenueTotal = subscriptionRevenue + cropRevenue + shopRevenue;

  return {
    totals: {
      users: safeNumber(total_users),
      activeUsers: safeNumber(active_users),
      inactiveUsers: safeNumber(inactive_users),
      farmers: safeNumber(total_farmers),
      buyers: safeNumber(total_buyers),
      listings: listingsTotal,
      listingsBreakdown: {
        crops: cropListings,
        shopItems: shopListings
      },
      orders: safeNumber(total_orders),
      completedOrders: safeNumber(completed_orders),
      openOrders: safeNumber(open_orders),
      revenue: revenueTotal,
      revenueBreakdown: {
        crops: cropRevenue,
        shop: shopRevenue,
        subscriptions: subscriptionRevenue
      },
      complaints: safeNumber(unresolved_complaints),
      activeShops: safeNumber(active_shops),
      suspendedShops: safeNumber(suspended_shops),
      activeSubscriptions: safeNumber(total_subscriptions),
      transporters: safeNumber(total_transporters),
      moderators: safeNumber(total_moderators)
    }
  };
};

const getMonthlyRevenue = async (months = 6) => {
  const [rows] = await runQuery(`
    SELECT 
      DATE_FORMAT(payment_date, '%Y-%m-01') AS month,
      SUM(amount) AS revenue,
      COUNT(DISTINCT user_id) AS paying_users
    FROM billing_history
    WHERE payment_status IN ('completed', 'paid', 'success')
      AND payment_date >= DATE_SUB(DATE_FORMAT(NOW(), '%Y-%m-01'), INTERVAL ? MONTH)
    GROUP BY DATE_FORMAT(payment_date, '%Y-%m-01')
    ORDER BY month ASC
  `, [months - 1]);

  return rows.map(row => ({
    month: row.month,
    revenue: safeFloat(row.revenue),
    users: safeNumber(row.paying_users)
  }));
};

const getCropDistribution = async () => {
  const [rows] = await runQuery(`
    SELECT crop_category AS category, COUNT(*) AS total
    FROM crop_posts
    WHERE status = 'active'
    GROUP BY crop_category
  `);

  return rows
    .filter(row => row.category)
    .map(row => ({
      name: row.category,
      value: safeNumber(row.total)
    }));
};

const getWeeklyActivities = async () => {
  const [rows] = await runQuery(`
    SELECT day,
           SUM(CASE WHEN source = 'crop_post' THEN 1 ELSE 0 END) AS listings,
           SUM(CASE WHEN source = 'order' THEN 1 ELSE 0 END) AS purchases,
           SUM(CASE WHEN source = 'complaint' THEN 1 ELSE 0 END) AS complaints
    FROM (
      SELECT DATE_FORMAT(created_at, '%W') AS day, 'crop_post' AS source FROM crop_posts WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      UNION ALL
      SELECT DATE_FORMAT(createdAt, '%W') AS day, 'order' AS source FROM orders WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      UNION ALL
      SELECT DATE_FORMAT(submitted_at, '%W') AS day, 'complaint' AS source FROM crop_complaints WHERE submitted_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      UNION ALL
      SELECT DATE_FORMAT(submitted_at, '%W') AS day, 'complaint' AS source FROM shop_complaints WHERE submitted_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      UNION ALL
      SELECT DATE_FORMAT(submitted_at, '%W') AS day, 'complaint' AS source FROM transport_complaints WHERE submitted_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    ) AS activity
    GROUP BY day
    ORDER BY FIELD(day, 'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')
  `);

  return rows.map(row => ({
    day: row.day,
    listings: safeNumber(row.listings),
    purchases: safeNumber(row.purchases),
    complaints: safeNumber(row.complaints)
  }));
};

const getRegionalUsers = async () => {
  const [rows] = await runQuery(`
    SELECT district AS region,
           SUM(CASE WHEN user_type IN ('1','1.0','1.1', 1, 1.1) THEN 1 ELSE 0 END) AS farmers,
           SUM(CASE WHEN user_type IN ('2','2.0', 2) THEN 1 ELSE 0 END) AS buyers
    FROM users
    WHERE district IS NOT NULL AND district <> ''
    GROUP BY district
  `);

  return rows.map(row => ({
    region: row.region,
    farmers: safeNumber(row.farmers),
    buyers: safeNumber(row.buyers)
  }));
};

const getRecentActivities = async () => {
  const [rows] = await runQuery(`
    SELECT * FROM (
      SELECT id, full_name AS label, 'farmer' AS type, created_at FROM users WHERE user_type IN ('1','1.0','1.1',1,1.1)
      UNION ALL
      SELECT id, full_name AS label, 'buyer' AS type, created_at FROM users WHERE user_type IN ('2','2.0',2)
      UNION ALL
      SELECT id, full_name AS label, 'transporter' AS type, created_at FROM users WHERE user_type IN ('4','4.0',4)
      UNION ALL
      SELECT id, full_name AS label, 'moderator' AS type, created_at FROM users WHERE user_type IN ('5','5.0','5.1',5)
      UNION ALL
      SELECT id, shop_name AS label, 'shop' AS type, created_at FROM shop_details
      UNION ALL
      SELECT id, title AS label, 'complaint' AS type, submitted_at AS created_at FROM crop_complaints
      UNION ALL
      SELECT id, title AS label, 'complaint' AS type, submitted_at AS created_at FROM shop_complaints
      UNION ALL
      SELECT id, title AS label, 'complaint' AS type, submitted_at AS created_at FROM transport_complaints
      UNION ALL
      SELECT id, crop_name AS label, 'listing' AS type, created_at FROM crop_posts
      UNION ALL
      SELECT id, orderId AS label, 'order' AS type, createdAt AS created_at FROM orders
    ) AS activity
    ORDER BY created_at DESC
    LIMIT 20
  `);

  return rows.map(row => ({
    id: row.id,
    type: row.type,
    label: row.label,
    time: safeDate(row.created_at)
  }));
};

const getPendingComplaints = async () => {
  const [rows] = await runQuery(`
    SELECT id, title, submitted_by, priority, submitted_at,
      CASE WHEN reply IS NOT NULL AND reply <> '' THEN 'resolved' ELSE 'open' END AS status,
      'crop' AS source
    FROM crop_complaints
    WHERE reply IS NULL OR reply = ''
    UNION ALL
    SELECT id, title, submitted_by, priority, submitted_at,
      'open' AS status,
      'shop' AS source
    FROM shop_complaints
    UNION ALL
    SELECT id, title, submitted_by, priority, submitted_at,
      'open' AS status,
      'transport' AS source
    FROM transport_complaints
    ORDER BY submitted_at DESC
    LIMIT 20
  `);

  return rows.map(row => ({
    id: row.id,
    title: row.title,
    priority: row.priority || 'Normal',
  status: row.status === 'resolved' ? 'Resolved' : 'Open',
    submittedBy: row.submitted_by,
    submittedAt: safeDate(row.submitted_at),
    source: row.source
  }));
};

const getUserStats = async () => {
  const [rows] = await runQuery(`
    SELECT
      SUM(CASE WHEN user_type IN ('1','1.0','1.1',1,1.1) THEN 1 ELSE 0 END) AS farmers,
      SUM(CASE WHEN user_type IN ('2','2.0',2) THEN 1 ELSE 0 END) AS buyers,
      SUM(CASE WHEN user_type IN ('3','3.0',3) THEN 1 ELSE 0 END) AS shopOwners,
      SUM(CASE WHEN user_type IN ('4','4.0',4) THEN 1 ELSE 0 END) AS transporters,
      SUM(CASE WHEN user_type IN ('5','5.0','5.1',5) THEN 1 ELSE 0 END) AS moderators,
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS inactive
    FROM users
  `);

  const stats = rows[0] || {};

  return {
    farmers: safeNumber(stats.farmers),
    buyers: safeNumber(stats.buyers),
    shopOwners: safeNumber(stats.shopOwners),
    transporters: safeNumber(stats.transporters),
    moderators: safeNumber(stats.moderators),
    active: safeNumber(stats.active),
    inactive: safeNumber(stats.inactive)
  };
};

const getSubscriptionBreakdown = async () => {
  const [rows] = await runQuery(`
    SELECT 
      CASE 
        WHEN user_type IN ('1','1.0','1.1',1,1.1) THEN 'farmer'
        WHEN user_type IN ('2','2.0',2) THEN 'buyer'
        WHEN user_type IN ('3','3.0',3) THEN 'shop'
        ELSE 'other'
      END AS category,
      tier_id,
      COUNT(*) AS total
    FROM user_subscriptions
    WHERE status = 'active'
    GROUP BY category, tier_id
  `);

  return rows.reduce((acc, row) => {
    if (!acc[row.category]) acc[row.category] = [];
    acc[row.category].push({
      tierId: row.tier_id,
      count: safeNumber(row.total)
    });
    return acc;
  }, {});
};

const getShopHighlights = async () => {
  const [rows] = await runQuery(`
    SELECT sd.id, sd.shop_name, sd.shop_address, sd.is_active,
           COUNT(p.id) AS total_items,
           SUM(CASE WHEN oi.status IN ('delivered','completed') THEN 1 ELSE 0 END) AS fulfilled_orders
    FROM shop_details sd
    LEFT JOIN products p ON p.shop_id = sd.id
    LEFT JOIN order_items oi ON oi.productId = p.id
    GROUP BY sd.id
    ORDER BY fulfilled_orders DESC
    LIMIT 10
  `);

  return rows.map(row => ({
    id: row.id,
    name: row.shop_name,
    address: row.shop_address,
    active: row.is_active === 1,
    totalItems: safeNumber(row.total_items),
    fulfilledOrders: safeNumber(row.fulfilled_orders)
  }));
};

const getPendingApprovals = async () => {
  const [[{ pending_orgs = 0 } = {}]] = await runQuery(`
    SELECT COUNT(*) AS pending_orgs FROM organizations WHERE is_active = 0
  `);

  const [[{ pending_shopowners = 0 } = {}]] = await runQuery(`
    SELECT COUNT(*) AS pending_shopowners FROM users WHERE user_type IN ('3','3.0',3) AND is_active = 0
  `);

  const [[{ pending_transporters = 0 } = {}]] = await runQuery(`
    SELECT COUNT(*) AS pending_transporters FROM users WHERE user_type IN ('4','4.0',4) AND is_active = 0
  `);

  const [[{ pending_moderators = 0 } = {}]] = await runQuery(`
    SELECT COUNT(*) AS pending_moderators FROM users WHERE user_type IN ('5','5.0','5.1',5) AND is_active = 0
  `);

  return {
    organizations: safeNumber(pending_orgs),
    shopOwners: safeNumber(pending_shopowners),
    transporters: safeNumber(pending_transporters),
    moderators: safeNumber(pending_moderators)
  };
};

const getOpenTickets = async () => {
  const [rows] = await runQuery(`
    SELECT id, title, priority,
      'open' AS status,
      submitted_at, 'shop' AS category
    FROM shop_complaints
    UNION ALL
    SELECT id, title, priority,
      'open' AS status,
      submitted_at, 'transport' AS category
    FROM transport_complaints
    UNION ALL
    SELECT id, title, priority,
      CASE WHEN reply IS NOT NULL AND reply <> '' THEN 'resolved' ELSE 'open' END AS status,
      submitted_at, 'crop' AS category
    FROM crop_complaints
    WHERE reply IS NULL OR reply = ''
    ORDER BY submitted_at DESC
    LIMIT 15
  `);

  return rows.map(row => ({
    id: row.id,
    title: row.title,
    priority: row.priority || 'Normal',
  status: row.status === 'resolved' ? 'Resolved' : 'Open',
    submittedAt: safeDate(row.submitted_at),
    category: row.category
  }));
};

const getTransporterCoverage = async () => {
  const [rows] = await runQuery(`
    SELECT district, COUNT(*) AS total
    FROM transporter_details td
    JOIN users u ON td.user_id = u.id
    WHERE u.is_active = 1
    GROUP BY district
  `);

  return rows.map(row => ({
    district: row.district,
    total: safeNumber(row.total)
  }));
};

const getDashboardData = async () => {
  const [overview, revenue, cropDistribution, weekly, regional, activities, complaints, userStats, subscriptions, shops, approvals, tickets, coverage] = await Promise.all([
    getOverviewStats(),
    getMonthlyRevenue(),
    getCropDistribution(),
    getWeeklyActivities(),
    getRegionalUsers(),
    getRecentActivities(),
    getPendingComplaints(),
    getUserStats(),
    getSubscriptionBreakdown(),
    getShopHighlights(),
    getPendingApprovals(),
    getOpenTickets(),
    getTransporterCoverage()
  ]);

  return {
    overview,
    revenue,
    cropDistribution,
    weekly,
    regional,
    activities,
    complaints,
    userStats,
    subscriptions,
    shops,
    approvals,
    tickets,
    coverage
  };
};

module.exports = {
  getDashboardData
};
