const express = require('express');
const router = express.Router();
const shopOwnerController = require('../controllers/shopOwnerController');

// Get all shop owner accounts for approval
router.get('/accounts', shopOwnerController.getAllShopOwners);

// Approve shop owner
router.post('/approve/:id', shopOwnerController.approveShopOwner);

// Reject shop owner
router.post('/reject/:id', shopOwnerController.rejectShopOwner);

// Suspend shop owner
router.post('/suspend/:id', shopOwnerController.suspendShopOwner);

module.exports = router;
