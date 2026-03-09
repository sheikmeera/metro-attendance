/**
 * controllers/notificationController.js
 * Handles Web Push subscription and notification sending.
 */
const webpush = require('web-push');
const NotificationSubscription = require('../models/NotificationSubscription');

// Configure web-push with VAPID keys from environment
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        'mailto:admin@metroelectricals.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

// POST /api/notifications/subscribe
exports.subscribe = async (req, res) => {
    try {
        const { subscription, userId, deviceType } = req.body;

        if (!subscription || !userId) {
            return res.status(400).json({ error: 'Subscription and userId are required.' });
        }

        // Upsert subscription
        await NotificationSubscription.findOneAndUpdate(
            { endpoint: subscription.endpoint },
            {
                userId,
                endpoint: subscription.endpoint,
                expirationTime: subscription.expirationTime,
                keys: {
                    p256dh: subscription.keys.p256dh,
                    auth: subscription.keys.auth
                },
                deviceType: deviceType || 'mobile'
            },
            { upsert: true, new: true }
        );

        res.status(201).json({ success: true, message: 'Subscribed successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Utility: Send notification to a specific user
 */
exports.sendToUser = async (userId, payload) => {
    try {
        const subs = await NotificationSubscription.find({ userId });
        if (!subs.length) return;

        const results = await Promise.allSettled(subs.map(sub => {
            const pushSub = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.keys.p256dh,
                    auth: sub.keys.auth
                }
            };
            return webpush.sendNotification(pushSub, JSON.stringify(payload));
        }));

        // Clean up expired subscriptions
        for (let i = 0; i < results.length; i++) {
            if (results[i].status === 'rejected' && (results[i].reason.statusCode === 410 || results[i].reason.statusCode === 404)) {
                await NotificationSubscription.deleteOne({ endpoint: subs[i].endpoint });
            }
        }
    } catch (err) {
        console.error('Error sending push notifications:', err);
    }
};
