import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as taskService from './service.js';
import type { CreateTaskInput, UpdateTaskInput } from '@family-hub/shared/types';

interface TaskParams {
    id: string;
}

export default async function taskRoutes(app: FastifyInstance) {
    // GET /api/tasks - Get all tasks for family
    app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
        const familyId = request.headers['x-family-id'];
        if (!familyId) {
            return reply.status(400).send({ error: 'Family ID required' });
        }

        const tasks = await taskService.getAllTasks(Number(familyId));
        return reply.send(tasks);
    });

    // GET /api/tasks/my - Get tasks assigned to current user
    app.get('/my', async (request: FastifyRequest, reply: FastifyReply) => {
        const familyId = request.headers['x-family-id'];
        const userId = request.headers['x-user-id'];

        if (!familyId || !userId) {
            return reply.status(400).send({ error: 'Family ID and User ID required' });
        }

        const tasks = await taskService.getTasksByAssignee(Number(familyId), Number(userId));
        return reply.send(tasks);
    });

    // GET /api/tasks/:id - Get single task
    app.get<{ Params: TaskParams }>(
        '/:id',
        async (request: FastifyRequest<{ Params: TaskParams }>, reply: FastifyReply) => {
            const familyId = request.headers['x-family-id'];
            if (!familyId) {
                return reply.status(400).send({ error: 'Family ID required' });
            }

            const task = await taskService.getTaskById(
                parseInt(request.params.id, 10),
                Number(familyId)
            );

            if (!task) {
                return reply.status(404).send({ error: 'Task not found' });
            }

            return reply.send(task);
        }
    );

    // POST /api/tasks - Create task
    app.post<{ Body: CreateTaskInput }>(
        '/',
        async (request: FastifyRequest<{ Body: CreateTaskInput }>, reply: FastifyReply) => {
            const familyId = request.headers['x-family-id'];
            const userId = request.headers['x-user-id'];

            if (!familyId) {
                return reply.status(400).send({ error: 'Family ID required' });
            }

            const { title } = request.body;
            if (!title) {
                return reply.status(400).send({ error: 'Title is required' });
            }

            const task = await taskService.createTask(
                Number(familyId),
                request.body,
                userId ? Number(userId) : undefined
            );

            return reply.status(201).send(task);
        }
    );

    // PUT /api/tasks/:id - Update task
    app.put<{ Params: TaskParams; Body: UpdateTaskInput }>(
        '/:id',
        async (
            request: FastifyRequest<{ Params: TaskParams; Body: UpdateTaskInput }>,
            reply: FastifyReply
        ) => {
            const familyId = request.headers['x-family-id'];
            const userId = request.headers['x-user-id'];
            if (!familyId) {
                return reply.status(400).send({ error: 'Family ID required' });
            }

            const task = await taskService.updateTask(
                parseInt(request.params.id, 10),
                Number(familyId),
                request.body,
                userId ? Number(userId) : undefined
            );

            if (!task) {
                return reply.status(404).send({ error: 'Task not found' });
            }

            return reply.send(task);
        }
    );

    // POST /api/tasks/:id/verify - Verify completed task (parent approval)
    app.post<{ Params: TaskParams }>(
        '/:id/verify',
        async (request: FastifyRequest<{ Params: TaskParams }>, reply: FastifyReply) => {
            const familyId = request.headers['x-family-id'];
            const userId = request.headers['x-user-id'];

            if (!familyId || !userId) {
                return reply.status(400).send({ error: 'Family ID and User ID required' });
            }

            const task = await taskService.verifyTask(
                parseInt(request.params.id, 10),
                Number(familyId),
                Number(userId)
            );

            if (!task) {
                return reply.status(404).send({ error: 'Task not found or not in done status' });
            }

            return reply.send(task);
        }
    );

    // DELETE /api/tasks/:id - Delete task
    app.delete<{ Params: TaskParams }>(
        '/:id',
        async (request: FastifyRequest<{ Params: TaskParams }>, reply: FastifyReply) => {
            const familyId = request.headers['x-family-id'];
            if (!familyId) {
                return reply.status(400).send({ error: 'Family ID required' });
            }

            const deleted = await taskService.deleteTask(
                parseInt(request.params.id, 10),
                Number(familyId)
            );

            if (!deleted) {
                return reply.status(404).send({ error: 'Task not found' });
            }

            return reply.send({ success: true });
        }
    );
}
