const express = require('express');
const router = express.Router();
const cropChatController = require('../controllers/cropChatController');
const { authenticate } = require('../middleware/auth');

router.get('/:cropId', authenticate, cropChatController.getMessages);
router.get('/:cropId/buyers', authenticate, cropChatController.getBuyers);
router.post('/', authenticate, cropChatController.createMessage);
module.exports = router;
