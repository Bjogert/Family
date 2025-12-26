import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../auth/middleware.js';
import {
    generateMenu,
    getCurrentMenu,
    saveMenu,
    getWeekStart,
    getMenuHistory,
    updateMeal,
    analyzeIngredients,
    type Meal,
} from './service.js';
import { logger } from '../../utils/logger.js';

interface UpdateMealBody {
    day: number;
    meal: Meal;
}

interface SaveMenuBody {
    meals: Meal[];
    weekStart?: string;
}

interface RegenerateDaysBody {
    days: number[];
}

export async function menuRoutes(fastify: FastifyInstance): Promise<void> {
    // All routes require authentication
    fastify.addHook('onRequest', requireAuth);

    // GET /menu - Get current week's menu
    fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
        const familyId = request.family!.id;

        try {
            const menu = await getCurrentMenu(familyId);

            if (!menu) {
                return reply.status(404).send({
                    error: 'No menu found for current week',
                    message: 'Ingen meny finns för denna vecka',
                });
            }

            const reusedIngredients = analyzeIngredients(menu.meals);

            return {
                menu,
                reusedIngredients,
                weekStart: getWeekStart().toISOString().split('T')[0],
            };
        } catch (error) {
            logger.error('Failed to get menu', { error: (error as Error).message, familyId });
            return reply.status(500).send({ error: 'Failed to get menu' });
        }
    });

    // POST /menu/generate - Generate a new menu using AI
    fastify.post('/generate', async (request: FastifyRequest, reply: FastifyReply) => {
        const familyId = request.family!.id;
        const userId = request.user!.id;

        const { regenerate } = request.query as { regenerate?: string };

        try {
            const menu = await generateMenu({
                familyId,
                userId,
                regenerate: regenerate === 'true',
            });

            const reusedIngredients = analyzeIngredients(menu.meals);

            return {
                menu,
                reusedIngredients,
                generated: true,
            };
        } catch (error) {
            const message = (error as Error).message;
            logger.error('Failed to generate menu', { error: message, familyId });

            if (message.includes('API key')) {
                return reply.status(503).send({
                    error: 'AI service not configured',
                    message: 'AI-tjänsten är inte konfigurerad',
                });
            }

            return reply.status(500).send({
                error: 'Failed to generate menu',
                message: 'Kunde inte skapa meny. Försök igen.',
            });
        }
    });

    // POST /menu/regenerate-days - Regenerate specific days only
    fastify.post('/regenerate-days', async (request: FastifyRequest, reply: FastifyReply) => {
        const familyId = request.family!.id;
        const userId = request.user!.id;
        const body = request.body as RegenerateDaysBody;

        if (!body.days || !Array.isArray(body.days) || body.days.length === 0) {
            return reply.status(400).send({ error: 'days array is required' });
        }

        try {
            // Import the regenerate function
            const { regenerateDays } = await import('./service.js');
            const menu = await regenerateDays({
                familyId,
                userId,
                days: body.days,
            });

            const reusedIngredients = analyzeIngredients(menu.meals);

            return {
                menu,
                reusedIngredients,
                regenerated: true,
            };
        } catch (error) {
            const message = (error as Error).message;
            logger.error('Failed to regenerate days', { error: message, familyId, days: body.days });

            return reply.status(500).send({
                error: 'Failed to regenerate days',
                message: 'Kunde inte generera nya rätter. Försök igen.',
            });
        }
    });

    // PUT /menu - Save/update menu
    fastify.put('/', async (request: FastifyRequest, reply: FastifyReply) => {
        const familyId = request.family!.id;
        const body = request.body as SaveMenuBody;

        if (!body.meals || !Array.isArray(body.meals)) {
            return reply.status(400).send({ error: 'meals array is required' });
        }

        try {
            const weekStart = body.weekStart ? new Date(body.weekStart) : getWeekStart();
            const menu = await saveMenu(familyId, weekStart, body.meals);

            return { menu, saved: true };
        } catch (error) {
            logger.error('Failed to save menu', { error: (error as Error).message, familyId });
            return reply.status(500).send({ error: 'Failed to save menu' });
        }
    });

    // PATCH /menu/meal - Update a single meal
    fastify.patch('/meal', async (request: FastifyRequest, reply: FastifyReply) => {
        const familyId = request.family!.id;
        const body = request.body as UpdateMealBody;

        if (!body.day || !body.meal) {
            return reply.status(400).send({ error: 'day and meal are required' });
        }

        try {
            const weekStart = getWeekStart();
            const menu = await updateMeal(familyId, weekStart, body.day, body.meal);

            if (!menu) {
                return reply.status(404).send({ error: 'No menu found for current week' });
            }

            return { menu, updated: true };
        } catch (error) {
            logger.error('Failed to update meal', { error: (error as Error).message, familyId });
            return reply.status(500).send({ error: 'Failed to update meal' });
        }
    });

    // GET /menu/history - Get menu history
    fastify.get('/history', async (request: FastifyRequest, reply: FastifyReply) => {
        const familyId = request.family!.id;

        const { limit } = request.query as { limit?: string };

        try {
            const history = await getMenuHistory(familyId, limit ? parseInt(limit, 10) : 4);
            return { history };
        } catch (error) {
            logger.error('Failed to get menu history', { error: (error as Error).message, familyId });
            return reply.status(500).send({ error: 'Failed to get menu history' });
        }
    });

    // GET /menu/week/:date - Get menu for a specific week
    fastify.get('/week/:date', async (request: FastifyRequest, reply: FastifyReply) => {
        const familyId = request.family!.id;
        const { date } = request.params as { date: string };

        try {
            const weekStart = getWeekStart(new Date(date));
            const { getMenuByWeek } = await import('./repository.js');
            const menu = await getMenuByWeek(familyId, weekStart);

            if (!menu) {
                return reply.status(404).send({ error: 'No menu found for this week' });
            }

            const reusedIngredients = analyzeIngredients(menu.meals);
            return { menu, reusedIngredients };
        } catch (error) {
            logger.error('Failed to get menu by week', { error: (error as Error).message, familyId });
            return reply.status(500).send({ error: 'Failed to get menu' });
        }
    });
}
