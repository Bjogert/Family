import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getPreferences, updatePreferences, resetPreferences, DIETARY_RESTRICTIONS } from './service.js';
import * as authService from '../auth/service.js';

interface AuthenticatedRequest extends FastifyRequest {
    session: {
        userId: number;
        familyId: number;
    };
}

// Authentication middleware
async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const sessionId = request.cookies.sessionId;

    if (!sessionId) {
        reply.status(401).send({ error: 'Authentication required' });
        return;
    }

    const session = await authService.validateSession(sessionId);

    if (!session) {
        reply.status(401).send({ error: 'Invalid or expired session' });
        return;
    }

    (request as AuthenticatedRequest).session = {
        userId: session.userId,
        familyId: session.familyId,
    };
}

const PreferencesSchema = z.object({
    spicy: z.number().min(1).max(10).optional(),
    asian: z.number().min(1).max(10).optional(),
    swedish: z.number().min(1).max(10).optional(),
    vegetarian: z.number().min(1).max(10).optional(),
    vegan: z.number().min(1).max(10).optional(),
    healthConscious: z.number().min(1).max(10).optional(),
    kidFriendly: z.number().min(1).max(10).optional(),
    quickMeals: z.number().min(1).max(10).optional(),
    budgetConscious: z.number().min(1).max(10).optional(),
});

const UpdatePreferencesSchema = z.object({
    preferences: PreferencesSchema.optional(),
    restrictions: z.array(z.string()).optional(),
});

export async function preferencesRoutes(fastify: FastifyInstance): Promise<void> {
    // All routes require authentication
    fastify.addHook('preHandler', requireAuth);

    // Get preferences for family
    fastify.get(
        '/',
        async (request: FastifyRequest, reply: FastifyReply) => {
            const { familyId } = (request as AuthenticatedRequest).session;
            const result = await getPreferences(familyId);
            return reply.send(result);
        }
    );

    // Get list of available dietary restrictions
    fastify.get(
        '/restrictions',
        async (_request: FastifyRequest, reply: FastifyReply) => {
            return reply.send({ restrictions: DIETARY_RESTRICTIONS });
        }
    );

    // Update preferences
    fastify.put(
        '/',
        async (request: FastifyRequest, reply: FastifyReply) => {
            const { familyId } = (request as AuthenticatedRequest).session;

            const parseResult = UpdatePreferencesSchema.safeParse(request.body);
            if (!parseResult.success) {
                return reply.status(400).send({
                    error: 'Invalid request body',
                    details: parseResult.error.errors,
                });
            }

            const result = await updatePreferences(familyId, parseResult.data);
            return reply.send(result);
        }
    );

    // Reset preferences to defaults
    fastify.post(
        '/reset',
        async (request: FastifyRequest, reply: FastifyReply) => {
            const { familyId } = (request as AuthenticatedRequest).session;
            const result = await resetPreferences(familyId);
            return reply.send(result);
        }
    );
}
