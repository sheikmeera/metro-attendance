/**
 * utils/pushNotification.js
 * Browser-side logic for Web Push notifications.
 */
import client from '../api/client';

const VAPID_PUBLIC_KEY = 'BCHRs1RsO4Bhs9mYVtneVyuK5qBEXgNyAEEGLnPQULdml-3k1Y_ebdkrRz88yAiGJSTHduxQh5HcfjyhoCOupjr4';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function subscribeToPush(userId) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push notifications not supported.');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.ready;

        // Check for existing subscription
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });
        }

        // Send to backend
        const res = await client.post('/notifications/subscribe', {
            subscription: JSON.parse(JSON.stringify(subscription)),
            userId,
            deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
        });

        return res.data;
    } catch (err) {
        console.error('Failed to subscribe to push notifications:', err);
    }
}

export async function requestNotificationPermission(userId) {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            await subscribeToPush(userId);
        }
    } else if (Notification.permission === 'granted') {
        await subscribeToPush(userId);
    }
}
