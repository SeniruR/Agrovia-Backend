const express = require('express');
const router = express.Router();
const pestAlertController = require('../controllers/pestAlertController');

router.post('/', pestAlertController.createPestAlert);
router.get('/', pestAlertController.getAllPestAlerts);
router.get('/:id', pestAlertController.getPestAlertById);
router.put('/:id', pestAlertController.updatePestAlert);
router.delete('/:id', pestAlertController.deletePestAlert);

module.exports = router;
