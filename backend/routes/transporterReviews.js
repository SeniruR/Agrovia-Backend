const express = require('express');
const { authenticate } = require('../middleware/auth');
const TransporterReviewsController = require('../controllers/transporterReviewsController');

const router = express.Router();

router.post('/', authenticate, TransporterReviewsController.createOrUpdate);
router.get('/order-item/:orderItemId', authenticate, TransporterReviewsController.getForOrderItem);
router.get('/transporter/:transporterId', authenticate, TransporterReviewsController.getForTransporter);
router.get('/transporter/:transporterId/summary', authenticate, TransporterReviewsController.getSummary);

module.exports = router;
