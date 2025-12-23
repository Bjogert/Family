import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../auth/middleware.js';
import * as pushRepo from './repository.js';
import * as pushService from './service.js';
import { getPublicVapidKey, isPushEnabled } from './vapid.js';
import { logger } from '../../utils/logger.js';

interface SubscribeBody {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

interface UnsubscribeBody {
    endpoint: string;
}

export default async function pushRoutes(app: FastifyInstance) {
    // All routes require authentication
    app.addHook('preHandler', requireAuth);

    // GET /api/push/vapid-key - Get public VAPID key for subscription
    app.get('/vapid-key', async (request: FastifyRequest, reply: FastifyReply) => {
        const publicKey = getPublicVapidKey();

        if (!publicKey) {
            return reply.status(503).send({
                success: false,
                message: 'Push notifications not configured',
            });
        }

        return reply.send({
            success: true,
            publicKey,
        });
    });

    // GET /api/push/status - Check if push is enabled and user has subscriptions
    app.get('/status', async (request: any, reply: FastifyReply) => {
        const userId = request.user.id;

        const enabled = isPushEnabled();
        const hasSubscription = enabled ? await pushRepo.hasSubscription(userId) : false;

        return reply.send({
            success: true,
            enabled,
            subscribed: hasSubscription,
        });
    });

    // POST /api/push/subscribe - Subscribe to push notifications
    app.post<{ Body: SubscribeBody }>(
        '/subscribe',
        async (request: FastifyRequest<{ Body: SubscribeBody }>, reply: FastifyReply) => {
            const user = (request as any).user;
            const { endpoint, keys } = request.body;

            if (!endpoint || !keys?.p256dh || !keys?.auth) {
                return reply.status(400).send({
                    success: false,
                    message: 'Invalid subscription data',
                });
            }

            if (!isPushEnabled()) {
                return reply.status(503).send({
                    success: false,
                    message: 'Push notifications not configured',
                });
            }

            try {
                const subscription = await pushRepo.saveSubscription({
                    userId: user.id,
                    endpoint,
                    p256dh: keys.p256dh,
                    auth: keys.auth,
                    userAgent: request.headers['user-agent'],
                });

                logger.info('Push subscription saved', { userId: user.id, subscriptionId: subscription.id });

                return reply.send({
                    success: true,
                    message: 'Successfully subscribed to push notifications',
                });
            } catch (error: any) {
                logger.error('Failed to save push subscription', { error: error.message });
                return reply.status(500).send({
                    success: false,
                    message: 'Failed to save subscription',
                });
            }
        }
    );

    // POST /api/push/unsubscribe - Unsubscribe from push notifications
    app.post<{ Body: UnsubscribeBody }>(
        '/unsubscribe',
        async (request: FastifyRequest<{ Body: UnsubscribeBody }>, reply: FastifyReply) => {
            const { endpoint } = request.body;

            if (!endpoint) {
                return reply.status(400).send({
                    success: false,
                    message: 'Endpoint required',
                });
            }

            try {
                const removed = await pushRepo.removeSubscription(endpoint);

                if (removed) {
                    logger.info('Push subscription removed', { endpoint: endpoint.substring(0, 50) });
                }

                return reply.send({
                    success: true,
                    message: 'Successfully unsubscribed',
                });
            } catch (error: any) {
                logger.error('Failed to remove push subscription', { error: error.message });
                return reply.status(500).send({
                    success: false,
                    message: 'Failed to unsubscribe',
                });
            }
        }
    );

    // POST /api/push/test - Send a test notification to current user
    app.post('/test', async (request: any, reply: FastifyReply) => {
        const userId = request.user.id;

        if (!isPushEnabled()) {
            return reply.status(503).send({
                success: false,
                message: 'Push notifications not configured',
            });
        }

        const hasSubscription = await pushRepo.hasSubscription(userId);
        if (!hasSubscription) {
            return reply.status(400).send({
                success: false,
                message: 'No push subscription found. Please enable notifications first.',
            });
        }

        const success = await pushService.sendTestNotification(userId);

        return reply.send({
            success,
            message: success ? 'Test notification sent!' : 'Failed to send notification',
        });
    });
}
