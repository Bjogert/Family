import { pool } from '../../db/index.js';
import { logger } from '../../utils/logger.js';

export interface PushSubscription {
    id: number;
    userId: number;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent: string | null;
    createdAt: Date;
    lastUsedAt: Date | null;
}

export interface PushSubscriptionInput {
    userId: number;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string;
}

/**
 * Save a push subscription for a user
 * Uses UPSERT to handle re-subscriptions
 */
export async function saveSubscription(input: PushSubscriptionInput): Promise<PushSubscription> {
    const { userId, endpoint, p256dh, auth, userAgent } = input;

    const result = await pool.query(
        `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (endpoint) DO UPDATE SET
       user_id = $1,
       p256dh = $3,
       auth = $4,
       user_agent = $5,
       last_used_at = NOW()
     RETURNING id, user_id, endpoint, p256dh, auth, user_agent, created_at, last_used_at`,
        [userId, endpoint, p256dh, auth, userAgent || null]
    );

    return mapRow(result.rows[0]);
}

/**
 * Remove a subscription by endpoint
 */
export async function removeSubscription(endpoint: string): Promise<boolean> {
    const result = await pool.query(
        'DELETE FROM push_subscriptions WHERE endpoint = $1',
        [endpoint]
    );
    return (result.rowCount ?? 0) > 0;
}

/**
 * Remove all subscriptions for a user
 */
export async function removeAllUserSubscriptions(userId: number): Promise<number> {
    const result = await pool.query(
        'DELETE FROM push_subscriptions WHERE user_id = $1',
        [userId]
    );
    return result.rowCount ?? 0;
}

/**
 * Get all subscriptions for a user
 */
export async function getSubscriptionsByUserId(userId: number): Promise<PushSubscription[]> {
    const result = await pool.query(
        `SELECT id, user_id, endpoint, p256dh, auth, user_agent, created_at, last_used_at
     FROM push_subscriptions
     WHERE user_id = $1`,
        [userId]
    );
    return result.rows.map(mapRow);
}

/**
 * Get subscriptions for multiple users (for batch notifications)
 */
export async function getSubscriptionsByUserIds(userIds: number[]): Promise<PushSubscription[]> {
    if (userIds.length === 0) return [];

    const result = await pool.query(
        `SELECT id, user_id, endpoint, p256dh, auth, user_agent, created_at, last_used_at
     FROM push_subscriptions
     WHERE user_id = ANY($1)`,
        [userIds]
    );
    return result.rows.map(mapRow);
}

/**
 * Update last_used_at timestamp when notification sent successfully
 */
export async function updateLastUsed(subscriptionId: number): Promise<void> {
    await pool.query(
        'UPDATE push_subscriptions SET last_used_at = NOW() WHERE id = $1',
        [subscriptionId]
    );
}

/**
 * Check if a user has any subscriptions
 */
export async function hasSubscription(userId: number): Promise<boolean> {
    const result = await pool.query(
        'SELECT 1 FROM push_subscriptions WHERE user_id = $1 LIMIT 1',
        [userId]
    );
    return result.rows.length > 0;
}

function mapRow(row: any): PushSubscription {
    return {
        id: row.id,
        userId: row.user_id,
        endpoint: row.endpoint,
        p256dh: row.p256dh,
        auth: row.auth,
        userAgent: row.user_agent,
        createdAt: row.created_at,
        lastUsedAt: row.last_used_at,
    };
}
