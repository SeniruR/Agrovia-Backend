const express = require('express');
const router = express.Router();
const weatherAlertController = require('../controllers/weatherAlert.controller');
const { authenticate } = require('../middleware/auth');

router.post('/weather-alert', authenticate, weatherAlertController.createWeatherAlert);
router.get('/weather-alert', authenticate, weatherAlertController.getAllWeatherAlerts);
router.delete('/weather-alert/:id', authenticate, weatherAlertController.deleteWeatherAlert);

module.exports = router;
