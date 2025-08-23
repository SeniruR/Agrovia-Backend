const express = require('express');
const router = express.Router();

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

module.exports = router;
