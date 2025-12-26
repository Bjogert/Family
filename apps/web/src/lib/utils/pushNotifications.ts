/**
 * Push Notification Utilities
 * Handles browser push subscription management
 */

import { get, post } from '$lib/api/client';

/**
 * Check if push notifications are supported in this browser
 */
export function isPushSupported(): boolean {
    return (
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
    );
}

/**
 * Get current notification permission status
 */
export function getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) {
        return 'denied';
    }
    return Notification.permission;
}

/**
 * Request notification permission from user
 */
export async function requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
        return 'denied';
    }
    return Notification.requestPermission();
}

/**
 * Get the public VAPID key from API
 */
async function getVapidKey(): Promise<string | null> {
    try {
        const response = await get<{ success: boolean; publicKey: string }>('/push/vapid-key');
        return response.publicKey;
    } catch (error) {
        console.error('Failed to get VAPID key:', error);
        return null;
    }
}

/**
 * Convert VAPID key to Uint8Array for subscription
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Subscribe to push notifications
 * Returns true if successful
 */
export async function subscribeToPush(): Promise<boolean> {
    if (!isPushSupported()) {
        console.warn('Push notifications not supported');
        return false;
    }

    // Request permission first
    const permission = await requestPermission();
    if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return false;
    }

    // Get VAPID key
    const vapidKey = await getVapidKey();
    if (!vapidKey) {
        console.error('Failed to get VAPID key');
        return false;
    }

    try {
        // Get service worker registration
        const registration = await navigator.serviceWorker.ready;

        // Subscribe to push
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
        });

        // Send subscription to API
        const subscriptionJson = subscription.toJSON();
        await post('/push/subscribe', {
            endpoint: subscriptionJson.endpoint,
            keys: {
                p256dh: subscriptionJson.keys?.p256dh,
                auth: subscriptionJson.keys?.auth,
            },
        });

        return true;
    } catch (error) {
        console.error('Failed to subscribe to push:', error);
        return false;
    }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
    if (!isPushSupported()) {
        return true;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            // Unsubscribe from browser
            await subscription.unsubscribe();

            // Remove from API
            await post('/push/unsubscribe', {
                endpoint: subscription.endpoint,
            });
        }

        return true;
    } catch (error) {
        console.error('Failed to unsubscribe from push:', error);
        return false;
    }
}

/**
 * Check if currently subscribed to push notifications
 */
export async function isSubscribed(): Promise<boolean> {
    if (!isPushSupported()) {
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        return subscription !== null;
    } catch (error) {
        console.error('Failed to check subscription status:', error);
        return false;
    }
}

/**
 * Get push notification status from API
 */
export async function getPushStatus(): Promise<{ enabled: boolean; subscribed: boolean }> {
    try {
        const response = await get<{ success: boolean; enabled: boolean; subscribed: boolean }>(
            '/push/status'
        );
        return { enabled: response.enabled, subscribed: response.subscribed };
    } catch (error) {
        console.error('Failed to get push status:', error);
        return { enabled: false, subscribed: false };
    }
}

/**
 * Send a test notification to current user
 */
export async function sendTestNotification(): Promise<boolean> {
    try {
        const response = await post<{ success: boolean; message: string }>('/push/test', {});
        return response.success;
    } catch (error) {
        console.error('Failed to send test notification:', error);
        return false;
    }
}
