/**
 * models/NotificationSubscription.js
 * Stores Web Push subscriptions for employees.
 */
const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    userId: { type: String, required: true }, // Employee ID (e.g., MET10001) or Admin email
    endpoint: { type: String, required: true, unique: true },
    expirationTime: { type: Number, default: null },
    keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true }
    },
    deviceType: { type: String, enum: ['mobile', 'desktop', 'tablet'], default: 'mobile' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('NotificationSubscription', subscriptionSchema);
