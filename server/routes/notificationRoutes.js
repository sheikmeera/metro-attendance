/**
 * routes/notificationRoutes.js
 * API endpoints for push notifications.
 */
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// All notifications routes are for authenticated users
router.post('/subscribe', notificationController.subscribe);

module.exports = router;
