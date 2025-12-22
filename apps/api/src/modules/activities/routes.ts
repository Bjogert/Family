import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as activityService from './service.js';
import type { CreateActivityInput, UpdateActivityInput } from '@family-hub/shared/types';

interface ActivityParams {
    id: string;
}

export default async function activityRoutes(app: FastifyInstance) {
    // GET /api/activities - Get all activities for family
    app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
        const familyId = request.headers['x-family-id'];
        if (!familyId) {
            return reply.status(400).send({ error: 'Family ID required' });
        }

        const activities = await activityService.getAllActivities(Number(familyId));
        return reply.send(activities);
    });

    // GET /api/activities/:id - Get single activity
    app.get<{ Params: ActivityParams }>(
        '/:id',
        async (request: FastifyRequest<{ Params: ActivityParams }>, reply: FastifyReply) => {
            const familyId = request.headers['x-family-id'];
            if (!familyId) {
                return reply.status(400).send({ error: 'Family ID required' });
            }

            const activity = await activityService.getActivityById(
                parseInt(request.params.id, 10),
                Number(familyId)
            );

            if (!activity) {
                return reply.status(404).send({ error: 'Activity not found' });
            }

            return reply.send(activity);
        }
    );

    // POST /api/activities - Create activity
    app.post<{ Body: CreateActivityInput }>(
        '/',
        async (request: FastifyRequest<{ Body: CreateActivityInput }>, reply: FastifyReply) => {
            const familyId = request.headers['x-family-id'];
            const userId = request.headers['x-user-id'];

            if (!familyId) {
                return reply.status(400).send({ error: 'Family ID required' });
            }

            const { title, startTime } = request.body;
            if (!title || !startTime) {
                return reply.status(400).send({ error: 'Title and start time are required' });
            }

            const activity = await activityService.createActivity(
                Number(familyId),
                request.body,
                userId ? Number(userId) : undefined
            );

            return reply.status(201).send(activity);
        }
    );

    // PUT /api/activities/:id - Update activity
    app.put<{ Params: ActivityParams; Body: UpdateActivityInput }>(
        '/:id',
        async (
            request: FastifyRequest<{ Params: ActivityParams; Body: UpdateActivityInput }>,
            reply: FastifyReply
        ) => {
            const familyId = request.headers['x-family-id'];
            if (!familyId) {
                return reply.status(400).send({ error: 'Family ID required' });
            }

            const activity = await activityService.updateActivity(
                parseInt(request.params.id, 10),
                Number(familyId),
                request.body
            );

            if (!activity) {
                return reply.status(404).send({ error: 'Activity not found' });
            }

            return reply.send(activity);
        }
    );

    // DELETE /api/activities/:id - Delete activity
    app.delete<{ Params: ActivityParams }>(
        '/:id',
        async (request: FastifyRequest<{ Params: ActivityParams }>, reply: FastifyReply) => {
            const familyId = request.headers['x-family-id'];
            if (!familyId) {
                return reply.status(400).send({ error: 'Family ID required' });
            }

            const deleted = await activityService.deleteActivity(
                parseInt(request.params.id, 10),
                Number(familyId)
            );

            if (!deleted) {
                return reply.status(404).send({ error: 'Activity not found' });
            }

            return reply.send({ success: true });
        }
    );
}
