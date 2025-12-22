import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CreateGrocerySchema, UpdateGrocerySchema } from '@family-hub/shared/schemas';
import * as groceryService from './service.js';
import * as authService from '../auth/service.js';

interface AuthenticatedRequest extends FastifyRequest {
    session: {
        userId: number;
        familyId: number;
    };
}

// Authentication middleware
async function requireAuth(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const sessionId = request.cookies.sessionId;

    if (!sessionId) {
        reply.status(401).send({
            success: false,
            message: 'Authentication required',
        });
        return;
    }

    const session = await authService.validateSession(sessionId);

    if (!session) {
        reply.status(401).send({
            success: false,
            message: 'Invalid or expired session',
        });
        return;
    }

    (request as AuthenticatedRequest).session = {
        userId: session.userId,
        familyId: session.familyId,
    };
}

export default async function groceryRoutes(app: FastifyInstance) {
    // All grocery routes require authentication
    app.addHook('preHandler', requireAuth);

    // GET /api/groceries - List all groceries for the family
    app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
        const { familyId } = (request as AuthenticatedRequest).session;

        const items = await groceryService.getAllGroceries(familyId);

        return reply.send({
            success: true,
            items,
        });
    });

    // GET /api/groceries/categories - Get all categories
    app.get('/categories', async (_request: FastifyRequest, reply: FastifyReply) => {
        const categories = await groceryService.getCategories();

        return reply.send({
            success: true,
            categories,
        });
    });

    // GET /api/groceries/:id - Get a specific grocery item
    app.get<{ Params: { id: string } }>(
        '/:id',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const { familyId } = (request as AuthenticatedRequest).session;
            const id = parseInt(request.params.id, 10);

            if (isNaN(id)) {
                return reply.status(400).send({
                    success: false,
                    message: 'Invalid grocery ID',
                });
            }

            const item = await groceryService.getGroceryById(id, familyId);

            if (!item) {
                return reply.status(404).send({
                    success: false,
                    message: 'Grocery item not found',
                });
            }

            return reply.send({
                success: true,
                item,
            });
        }
    );

    // POST /api/groceries - Create a new grocery item
    app.post<{ Body: { name: string; category?: string; quantity?: number; unit?: string } }>(
        '/',
        async (
            request: FastifyRequest<{ Body: { name: string; category?: string; quantity?: number; unit?: string } }>,
            reply: FastifyReply
        ) => {
            const { userId, familyId } = (request as AuthenticatedRequest).session;

            // Validate request body
            const validation = CreateGrocerySchema.safeParse(request.body);
            if (!validation.success) {
                return reply.status(400).send({
                    success: false,
                    message: 'Validation failed',
                    errors: validation.error.errors,
                });
            }

            const { name, category, quantity, unit } = validation.data;

            const item = await groceryService.createGrocery({
                familyId,
                name,
                category,
                quantity,
                unit,
                addedBy: userId,
            });

            return reply.status(201).send({
                success: true,
                item,
            });
        }
    );

    // PATCH /api/groceries/:id - Update a grocery item
    app.patch<{
        Params: { id: string };
        Body: { name?: string; category?: string; quantity?: number; unit?: string; isBought?: boolean };
    }>(
        '/:id',
        async (
            request: FastifyRequest<{
                Params: { id: string };
                Body: { name?: string; category?: string; quantity?: number; unit?: string; isBought?: boolean };
            }>,
            reply: FastifyReply
        ) => {
            const { userId, familyId } = (request as AuthenticatedRequest).session;
            const id = parseInt(request.params.id, 10);

            if (isNaN(id)) {
                return reply.status(400).send({
                    success: false,
                    message: 'Invalid grocery ID',
                });
            }

            // Validate request body
            const validation = UpdateGrocerySchema.safeParse(request.body);
            if (!validation.success) {
                return reply.status(400).send({
                    success: false,
                    message: 'Validation failed',
                    errors: validation.error.errors,
                });
            }

            const { name, category, quantity, unit, isBought } = validation.data;
            const updateData: {
                name?: string;
                category?: string;
                quantity?: number;
                unit?: string | null;
                isBought?: boolean;
                boughtBy?: number;
            } = {};

            // Only include defined fields
            if (name !== undefined) updateData.name = name;
            if (category !== undefined) updateData.category = category;
            if (quantity !== undefined) updateData.quantity = quantity;
            if (unit !== undefined) updateData.unit = unit;
            if (isBought !== undefined) updateData.isBought = isBought;

            // If marking as bought, record who bought it
            if (updateData.isBought === true) {
                updateData.boughtBy = userId;
            }

            const item = await groceryService.updateGrocery(id, familyId, updateData);

            if (!item) {
                return reply.status(404).send({
                    success: false,
                    message: 'Grocery item not found',
                });
            }

            return reply.send({
                success: true,
                item,
            });
        }
    );

    // DELETE /api/groceries/:id - Delete a grocery item
    app.delete<{ Params: { id: string } }>(
        '/:id',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const { familyId } = (request as AuthenticatedRequest).session;
            const id = parseInt(request.params.id, 10);

            if (isNaN(id)) {
                return reply.status(400).send({
                    success: false,
                    message: 'Invalid grocery ID',
                });
            }

            const deleted = await groceryService.deleteGrocery(id, familyId);

            if (!deleted) {
                return reply.status(404).send({
                    success: false,
                    message: 'Grocery item not found',
                });
            }

            return reply.send({
                success: true,
                message: 'Grocery item deleted',
            });
        }
    );

    // POST /api/groceries/clear-bought - Clear all bought items
    app.post('/clear-bought', async (request: FastifyRequest, reply: FastifyReply) => {
        const { familyId } = (request as AuthenticatedRequest).session;

        const count = await groceryService.clearBoughtGroceries(familyId);

        return reply.send({
            success: true,
            message: `Cleared ${count} bought items`,
            count,
        });
    });

    // GET /api/groceries/assignments - Get grocery list assignments
    app.get('/assignments', async (request: FastifyRequest, reply: FastifyReply) => {
        const { familyId } = (request as AuthenticatedRequest).session;

        const assignments = await groceryService.getGroceryAssignments(familyId);

        return reply.send({
            success: true,
            assignments,
        });
    });

    // POST /api/groceries/assignments - Assign grocery list to a user
    app.post<{ Body: { userId: number } }>(
        '/assignments',
        async (request: FastifyRequest<{ Body: { userId: number } }>, reply: FastifyReply) => {
            const { familyId, userId: assignedBy } = (request as AuthenticatedRequest).session;
            const { userId } = request.body;

            if (!userId || typeof userId !== 'number') {
                return reply.status(400).send({
                    success: false,
                    message: 'userId is required',
                });
            }

            const assignment = await groceryService.assignGroceryList(familyId, userId, assignedBy);

            if (!assignment) {
                return reply.status(409).send({
                    success: false,
                    message: 'User is already assigned',
                });
            }

            return reply.send({
                success: true,
                assignment,
            });
        }
    );

    // DELETE /api/groceries/assignments/:userId - Unassign grocery list from a user
    app.delete<{ Params: { userId: string } }>(
        '/assignments/:userId',
        async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
            const { familyId } = (request as AuthenticatedRequest).session;
            const userId = parseInt(request.params.userId, 10);

            if (isNaN(userId)) {
                return reply.status(400).send({
                    success: false,
                    message: 'Invalid user ID',
                });
            }

            const success = await groceryService.unassignGroceryList(familyId, userId);

            if (!success) {
                return reply.status(404).send({
                    success: false,
                    message: 'Assignment not found',
                });
            }

            return reply.send({
                success: true,
                message: 'Assignment removed',
            });
        }
    );
}
