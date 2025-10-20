const express = require('express');
const { authenticate } = require('../middleware/auth');
const TransporterReviewsController = require('../controllers/transporterReviewsController');

const router = express.Router();

router.post('/', authenticate, TransporterReviewsController.createOrUpdate);
router.get('/order-item/:orderItemId', authenticate, TransporterReviewsController.getForOrderItem);
// Public endpoints so marketplace pages can surface transporter feedback without requiring login
router.get('/transporter/:transporterId', TransporterReviewsController.getForTransporter);
router.get('/transporter/:transporterId/summary', TransporterReviewsController.getSummary);

module.exports = router;
