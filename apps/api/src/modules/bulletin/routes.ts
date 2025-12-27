import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as bulletinService from './service.js';
import type { CreateBulletinNoteInput, UpdateBulletinNoteInput } from '@family-hub/shared/types';

interface NoteParams {
    id: string;
}

export default async function bulletinRoutes(app: FastifyInstance) {
    // GET /api/bulletin - Get all bulletin notes for family
    app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
        const familyId = request.headers['x-family-id'];
        if (!familyId) {
            return reply.status(400).send({ error: 'Family ID required' });
        }

        const notes = await bulletinService.getAllNotes(Number(familyId));
        return reply.send(notes);
    });

    // GET /api/bulletin/:id - Get single note
    app.get<{ Params: NoteParams }>(
        '/:id',
        async (request: FastifyRequest<{ Params: NoteParams }>, reply: FastifyReply) => {
            const familyId = request.headers['x-family-id'];
            if (!familyId) {
                return reply.status(400).send({ error: 'Family ID required' });
            }

            const note = await bulletinService.getNoteById(
                parseInt(request.params.id, 10),
                Number(familyId)
            );

            if (!note) {
                return reply.status(404).send({ error: 'Note not found' });
            }

            return reply.send(note);
        }
    );

    // POST /api/bulletin - Create note
    app.post<{ Body: CreateBulletinNoteInput }>(
        '/',
        async (request: FastifyRequest<{ Body: CreateBulletinNoteInput }>, reply: FastifyReply) => {
            const familyId = request.headers['x-family-id'];
            const userId = request.headers['x-user-id'];

            if (!familyId) {
                return reply.status(400).send({ error: 'Family ID required' });
            }
            if (!userId) {
                return reply.status(400).send({ error: 'User ID required' });
            }

            const note = await bulletinService.createNote({
                familyId: Number(familyId),
                title: request.body.title,
                content: request.body.content,
                listItems: request.body.listItems,
                color: request.body.color,
                isPinned: request.body.isPinned,
                expiresAt: request.body.expiresAt,
                assignedTo: request.body.assignedTo,
                createdBy: Number(userId),
            });

            return reply.status(201).send(note);
        }
    );

    // PUT /api/bulletin/:id - Update note
    app.put<{ Params: NoteParams; Body: UpdateBulletinNoteInput }>(
        '/:id',
        async (
            request: FastifyRequest<{ Params: NoteParams; Body: UpdateBulletinNoteInput }>,
            reply: FastifyReply
        ) => {
            const familyId = request.headers['x-family-id'];
            const userId = request.headers['x-user-id'];
            if (!familyId) {
                return reply.status(400).send({ error: 'Family ID required' });
            }

            const note = await bulletinService.updateNote(
                parseInt(request.params.id, 10),
                Number(familyId),
                request.body,
                userId ? Number(userId) : undefined
            );

            if (!note) {
                return reply.status(404).send({ error: 'Note not found' });
            }

            return reply.send(note);
        }
    );

    // DELETE /api/bulletin/:id - Delete note
    app.delete<{ Params: NoteParams }>(
        '/:id',
        async (request: FastifyRequest<{ Params: NoteParams }>, reply: FastifyReply) => {
            const familyId = request.headers['x-family-id'];
            if (!familyId) {
                return reply.status(400).send({ error: 'Family ID required' });
            }

            const deleted = await bulletinService.deleteNote(
                parseInt(request.params.id, 10),
                Number(familyId)
            );

            if (!deleted) {
                return reply.status(404).send({ error: 'Note not found' });
            }

            return reply.send({ success: true });
        }
    );
}
