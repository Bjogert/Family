import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as familyService from './service.js';

interface CreateFamilyBody {
    name: string;
    password: string;
}

interface CreateUserBody {
    username: string;
    password?: string;
    displayName?: string;
}

interface SearchFamiliesQuery {
    search?: string;
}

export default async function familyRoutes(app: FastifyInstance) {
    // GET /api/families - Get all families
    app.get(
        '/',
        async (request: FastifyRequest, reply: FastifyReply) => {
            const families = await familyService.getAllFamilies();
            return reply.send({ families });
        }
    );

    // GET /api/families/search - Search families by name
    app.get<{ Querystring: SearchFamiliesQuery }>(
        '/search',
        async (request: FastifyRequest<{ Querystring: SearchFamiliesQuery }>, reply: FastifyReply) => {
            const { search } = request.query;

            if (!search || search.trim().length === 0) {
                const families = await familyService.getAllFamilies();
                return reply.send({ families });
            }

            const families = await familyService.searchFamilies(search);
            return reply.send({ families });
        }
    );

    // POST /api/families - Create new family
    app.post<{ Body: CreateFamilyBody }>(
        '/',
        async (request: FastifyRequest<{ Body: CreateFamilyBody }>, reply: FastifyReply) => {
            const { name, password } = request.body;

            if (!name || name.trim().length === 0) {
                return reply.status(400).send({
                    success: false,
                    message: 'Family name is required',
                });
            }

            if (!password || password.trim().length === 0) {
                return reply.status(400).send({
                    success: false,
                    message: 'Family password is required',
                });
            }

            const exists = await familyService.familyExists(name);
            if (exists) {
                return reply.status(409).send({
                    success: false,
                    message: 'A family with this name already exists',
                });
            }

            try {
                const family = await familyService.createFamily(name, password);
                return reply.status(201).send({
                    success: true,
                    family,
                });
            } catch (error) {
                return reply.status(500).send({
                    success: false,
                    message: 'Failed to create family',
                });
            }
        }
    );

    // GET /api/families/:id - Get family by ID
    app.get<{ Params: { id: string } }>(
        '/:id',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const { id } = request.params;
            const familyId = parseInt(id, 10);

            if (isNaN(familyId)) {
                return reply.status(400).send({
                    success: false,
                    message: 'Invalid family ID',
                });
            }

            const family = await familyService.getFamilyById(familyId);

            if (!family) {
                return reply.status(404).send({
                    success: false,
                    message: 'Family not found',
                });
            }

            return reply.send({
                success: true,
                family,
            });
        }
    );

    // GET /api/families/:id/users - Get family members
    app.get<{ Params: { id: string } }>(
        '/:id/users',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const { id } = request.params;
            const familyId = parseInt(id, 10);

            if (isNaN(familyId)) {
                return reply.status(400).send({
                    success: false,
                    message: 'Invalid family ID',
                });
            }

            try {
                const users = await familyService.getFamilyMembers(familyId);
                return reply.send({
                    success: true,
                    users,
                });
            } catch (error) {
                return reply.status(500).send({
                    success: false,
                    message: 'Failed to get family members',
                });
            }
        }
    );

    // POST /api/families/:id/users - Create new family member
    app.post<{ Params: { id: string }; Body: CreateUserBody }>(
        '/:id/users',
        async (request: FastifyRequest<{ Params: { id: string }; Body: CreateUserBody }>, reply: FastifyReply) => {
            const { id } = request.params;
            const { username, password, displayName } = request.body;
            const familyId = parseInt(id, 10);

            if (isNaN(familyId)) {
                return reply.status(400).send({
                    success: false,
                    message: 'Invalid family ID',
                });
            }

            if (!username) {
                return reply.status(400).send({
                    success: false,
                    message: 'Username is required',
                });
            }

            try {
                const user = await familyService.createFamilyMember(familyId, username, password, displayName);
                return reply.status(201).send({
                    success: true,
                    user,
                });
            } catch (error) {
                const err = error as Error;
                if (err.message.includes('already exists')) {
                    return reply.status(409).send({
                        success: false,
                        message: err.message,
                    });
                }
                return reply.status(500).send({
                    success: false,
                    message: 'Failed to create family member',
                });
            }
        }
    );

    // POST /api/families/:id/verify-password - Verify family password
    app.post<{ Params: { id: string }; Body: { password: string } }>(
        '/:id/verify-password',
        async (request: FastifyRequest<{ Params: { id: string }; Body: { password: string } }>, reply: FastifyReply) => {
            const { id } = request.params;
            const { password } = request.body;
            const familyId = parseInt(id, 10);

            if (isNaN(familyId)) {
                return reply.status(400).send({
                    success: false,
                    message: 'Invalid family ID',
                });
            }

            if (!password) {
                return reply.status(400).send({
                    success: false,
                    message: 'Password is required',
                });
            }

            try {
                const isValid = await familyService.verifyFamilyPassword(familyId, password);
                return reply.send({
                    success: true,
                    valid: isValid,
                });
            } catch (error) {
                return reply.status(500).send({
                    success: false,
                    message: 'Failed to verify password',
                });
            }
        }
    );

    // PATCH /api/families/:id/password - Update family password
    app.patch<{ Params: { id: string }; Body: { newPassword: string } }>(
        '/:id/password',
        async (request: FastifyRequest<{ Params: { id: string }; Body: { newPassword: string } }>, reply: FastifyReply) => {
            const { id } = request.params;
            const { newPassword } = request.body;
            const familyId = parseInt(id, 10);

            if (isNaN(familyId)) {
                return reply.status(400).send({
                    success: false,
                    message: 'Invalid family ID',
                });
            }

            if (!newPassword || newPassword.trim().length === 0) {
                return reply.status(400).send({
                    success: false,
                    message: 'New password is required',
                });
            }

            try {
                const updated = await familyService.updateFamilyPassword(familyId, newPassword);
                if (updated) {
                    return reply.send({
                        success: true,
                        message: 'Password updated successfully',
                    });
                } else {
                    return reply.status(404).send({
                        success: false,
                        message: 'Family not found',
                    });
                }
            } catch (error) {
                console.error('Failed to update password:', error);
                return reply.status(500).send({
                    success: false,
                    message: 'Failed to update password',
                });
            }
        }
    );
}
