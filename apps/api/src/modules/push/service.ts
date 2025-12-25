import webpush from 'web-push';
import { logger } from '../../utils/logger.js';
import * as pushRepo from './repository.js';
import * as authRepo from '../auth/repository.js';
import { isPushEnabled } from './vapid.js';

export interface NotificationPayload {
    title: string;
    body: string;
    url?: string;
    tag?: string;
    icon?: string;
    requireInteraction?: boolean;
}

export interface SendResult {
    success: boolean;
    subscriptionId: number;
    error?: string;
}

/**
 * Send push notification to a specific user
 * Sends to all their registered devices
 */
export async function sendToUser(
    userId: number,
    payload: NotificationPayload
): Promise<SendResult[]> {
    if (!isPushEnabled()) {
        logger.debug('Push notifications disabled, skipping');
        return [];
    }

    const subscriptions = await pushRepo.getSubscriptionsByUserId(userId);
    if (subscriptions.length === 0) {
        logger.debug('No push subscriptions for user', { userId });
        return [];
    }

    return sendToSubscriptions(subscriptions, payload);
}

/**
 * Send push notification to multiple users
 * Useful for family-wide notifications
 */
export async function sendToUsers(
    userIds: number[],
    payload: NotificationPayload
): Promise<SendResult[]> {
    if (!isPushEnabled()) {
        logger.debug('Push notifications disabled, skipping');
        return [];
    }

    const subscriptions = await pushRepo.getSubscriptionsByUserIds(userIds);
    if (subscriptions.length === 0) {
        logger.debug('No push subscriptions for users', { userIds });
        return [];
    }

    return sendToSubscriptions(subscriptions, payload);
}

/**
 * Send notification to specific subscriptions
 */
async function sendToSubscriptions(
    subscriptions: pushRepo.PushSubscription[],
    payload: NotificationPayload
): Promise<SendResult[]> {
    const results: SendResult[] = [];
    const payloadString = JSON.stringify(payload);

    for (const sub of subscriptions) {
        try {
            await webpush.sendNotification(
                {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth,
                    },
                },
                payloadString
            );

            await pushRepo.updateLastUsed(sub.id);
            results.push({ success: true, subscriptionId: sub.id });

            logger.debug('Push notification sent', { subscriptionId: sub.id, userId: sub.userId });
        } catch (error: any) {
            // Handle expired/invalid subscriptions
            if (error.statusCode === 404 || error.statusCode === 410) {
                logger.info('Removing expired push subscription', { subscriptionId: sub.id });
                await pushRepo.removeSubscription(sub.endpoint);
            }

            results.push({
                success: false,
                subscriptionId: sub.id,
                error: error.message,
            });

            logger.error('Failed to send push notification', {
                subscriptionId: sub.id,
                error: error.message,
                statusCode: error.statusCode,
            });
        }
    }

    return results;
}

/**
 * Check if user has notification preference enabled
 */
export async function shouldNotify(
    userId: number,
    type: 'grocery_assigned' | 'grocery_updated' | 'calendar_created' | 'calendar_reminder'
): Promise<boolean> {
    const prefs = await authRepo.getUserPreferences(userId);
    if (!prefs) return true; // Default to enabled

    switch (type) {
        case 'grocery_assigned':
            return prefs.notifications.groceryAssigned;
        case 'grocery_updated':
            return prefs.notifications.groceryListUpdated;
        case 'calendar_created':
            return prefs.notifications.calendarEventCreated;
        case 'calendar_reminder':
            return prefs.notifications.calendarEventReminder;
        default:
            return true;
    }
}

/**
 * Notify user about grocery assignment
 */
export async function notifyGroceryAssigned(
    assignedUserId: number,
    itemName: string,
    assignedByName: string
): Promise<void> {
    if (!await shouldNotify(assignedUserId, 'grocery_assigned')) {
        return;
    }

    await sendToUser(assignedUserId, {
        title: 'Inköpslista',
        body: `${assignedByName} tilldelade "${itemName}" till dig`,
        url: '/groceries',
        tag: 'grocery-assigned',
    });
}

/**
 * Notify family about grocery list update
 */
export async function notifyGroceryUpdated(
    familyId: number,
    excludeUserId: number,
    itemName: string,
    action: 'added' | 'removed' | 'bought'
): Promise<void> {
    // Get all family members except the one who made the change
    const { pool } = await import('../../db/index.js');
    const result = await pool.query(
        'SELECT id FROM users WHERE family_id = $1 AND id != $2',
        [familyId, excludeUserId]
    );

    const userIds = result.rows.map((r: any) => r.id);

    // Filter to only users with this notification enabled
    const notifyUserIds: number[] = [];
    for (const userId of userIds) {
        if (await shouldNotify(userId, 'grocery_updated')) {
            notifyUserIds.push(userId);
        }
    }

    if (notifyUserIds.length === 0) return;

    const actionText = action === 'added' ? 'lades till' : action === 'removed' ? 'togs bort' : 'köptes';

    await sendToUsers(notifyUserIds, {
        title: 'Inköpslista uppdaterad',
        body: `"${itemName}" ${actionText}`,
        url: '/groceries',
        tag: 'grocery-updated',
    });
}

/**
 * Notify about calendar event
 */
export async function notifyCalendarEvent(
    familyId: number,
    excludeUserId: number,
    eventTitle: string,
    eventDate: string
): Promise<void> {
    const { pool } = await import('../../db/index.js');
    const result = await pool.query(
        'SELECT id FROM users WHERE family_id = $1 AND id != $2',
        [familyId, excludeUserId]
    );

    const userIds = result.rows.map((r: any) => r.id);

    const notifyUserIds: number[] = [];
    for (const userId of userIds) {
        if (await shouldNotify(userId, 'calendar_created')) {
            notifyUserIds.push(userId);
        }
    }

    if (notifyUserIds.length === 0) return;

    await sendToUsers(notifyUserIds, {
        title: 'Ny händelse',
        body: `${eventTitle} - ${eventDate}`,
        url: '/calendar',
        tag: 'calendar-event',
    });
}

/**
 * Notify user about task assignment
 */
export async function notifyTaskAssigned(
    assignedUserId: number,
    taskTitle: string,
    assignedByName: string
): Promise<void> {
    // Task notifications always enabled for now (no preference toggle yet)
    await sendToUser(assignedUserId, {
        title: '📋 Ny uppgift',
        body: `${assignedByName} tilldelade "${taskTitle}" till dig`,
        url: '/tasks',
        tag: 'task-assigned',
    });
}

/**
 * Notify creator that a task has been marked as done (needs verification)
 */
export async function notifyTaskCompleted(
    creatorUserId: number,
    taskTitle: string,
    completedByName: string
): Promise<void> {
    await sendToUser(creatorUserId, {
        title: '✅ Uppgift klar',
        body: `${completedByName} har markerat "${taskTitle}" som klar`,
        url: '/tasks',
        tag: 'task-completed',
    });
}

/**
 * Notify user about task reminder (upcoming due time)
 */
export async function notifyTaskReminder(
    userId: number,
    taskTitle: string,
    minutesBefore: number
): Promise<void> {
    let body: string;
    if (minutesBefore === 0) {
        body = `"${taskTitle}" ska göras nu!`;
    } else if (minutesBefore < 60) {
        body = `"${taskTitle}" ska göras om ${minutesBefore} minuter`;
    } else if (minutesBefore === 60) {
        body = `"${taskTitle}" ska göras om 1 timme`;
    } else if (minutesBefore === 120) {
        body = `"${taskTitle}" ska göras om 2 timmar`;
    } else if (minutesBefore === 1440) {
        body = `"${taskTitle}" ska göras imorgon`;
    } else {
        body = `"${taskTitle}" påminnelse`;
    }

    await sendToUser(userId, {
        title: '⏰ Påminnelse',
        body,
        url: '/tasks',
        tag: `task-reminder-${userId}`,
        requireInteraction: true,
    });
}

/**
 * Send a test notification to a user
 */
export async function sendTestNotification(userId: number): Promise<boolean> {
    const results = await sendToUser(userId, {
        title: 'Testnotifikation',
        body: 'Push-notifieringar fungerar! 🎉',
        url: '/',
        tag: 'test',
    });

    return results.some(r => r.success);
}
