import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as familyService from './service.js';

interface CreateFamilyBody {
    name: string;
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
            const { name } = request.body;

            if (!name || name.trim().length === 0) {
                return reply.status(400).send({
                    success: false,
                    message: 'Family name is required',
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
                const family = await familyService.createFamily(name);
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
}
