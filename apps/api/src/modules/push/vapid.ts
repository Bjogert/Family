import webpush from 'web-push';
import { config } from '../../config.js';
import { logger } from '../../utils/logger.js';

/**
 * Initialize VAPID keys for Web Push
 * VAPID (Voluntary Application Server Identification) authenticates
 * our server with push services (Google FCM, Apple, etc.)
 */
export function initializeVapid(): void {
    const publicKey = config.vapid.publicKey;
    const privateKey = config.vapid.privateKey;
    const subject = config.vapid.subject;

    if (!publicKey || !privateKey) {
        logger.warn('VAPID keys not configured - push notifications disabled');
        return;
    }

    try {
        webpush.setVapidDetails(subject, publicKey, privateKey);
        logger.info('VAPID keys configured for push notifications');
    } catch (error) {
        logger.error('Failed to set VAPID details', { error });
    }
}

/**
 * Get the public VAPID key for frontend subscription
 */
export function getPublicVapidKey(): string | null {
    return config.vapid.publicKey || null;
}

/**
 * Check if push notifications are properly configured
 */
export function isPushEnabled(): boolean {
    return !!(config.vapid.publicKey && config.vapid.privateKey);
}
