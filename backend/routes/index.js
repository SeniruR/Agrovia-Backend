const express = require('express');

const authRoutes = require('./auth');
const organizationRoutes = require('./organizations');
const farmerRoutes = require('./farmers');

const shopProductRoutes = require('./shopProductRoutes');

const cropPostRoutes = require('./cropPosts');
const userRoutes = require('./users');
const shopComplaintRoutes = require('./shopComplaint');
const transporterRoutes = require('./transporterRoutes');
const moderatorRoutes = require('./moderatorRoutes');
const transportComplaintRoutes = require('./transportComplaint');
const cropComplaintRoutes = require('./cropComplaint');
const cartRoutes = require('./cart');
const driverRoutes = require('./driverRoutes');
const cropReviewRoutes = require('./cropReviews');
const testRoutes = require('./testRoutes');

const organizationApprovalRoutes = require('./organizationApproval');
const shopOwnerRoutes = require('./shopOwnerRoutes'); // <-- Require shopOwnerRoutes
// (undo) removed disableAccounts route registration
const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Agrovia API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// (undo) removed disableAccounts route registration

// API routes
router.use('/auth', authRoutes);
router.use('/organizations', organizationRoutes);
router.use('/organization-approval', organizationApprovalRoutes);
router.use('/farmers', farmerRoutes);
router.use('/shop-products', shopProductRoutes);
router.use('/crop-posts', cropPostRoutes);
router.use('/users', userRoutes);
// Shop search endpoint for live-search dropdowns
router.use('/shops', require('./shops'));
router.use('/shop-complaints', shopComplaintRoutes);
router.use('/transporters', transporterRoutes);
router.use('/moderators', moderatorRoutes);
router.use('/transport-complaints', transportComplaintRoutes);
router.use('/crop-complaints', cropComplaintRoutes);
router.use('/cart', cartRoutes);
router.use('/shopowners', shopOwnerRoutes); // <-- Register shopOwnerRoutes
router.use('/driver', driverRoutes);

// Register admin routes
router.use('/admin', require('./adminRoutes'));

// Mount proxy routes
const proxyRoutes = require('./proxy');
router.use('/proxy', proxyRoutes);

module.exports = router;
