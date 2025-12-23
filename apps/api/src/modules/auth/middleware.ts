import type { FastifyRequest, FastifyReply } from 'fastify';
import * as authService from './service.js';
import * as authRepo from './repository.js';
import { pool } from '../../db/index.js';

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const sessionId = request.cookies.sessionId;

  if (!sessionId) {
    reply.status(401).send({
      error: 'Unauthorized',
      statusCode: 401,
    });
    return;
  }

  const session = await authService.validateSession(sessionId);

  if (!session) {
    reply.clearCookie('sessionId', { path: '/' });
    reply.status(401).send({
      error: 'Session expired',
      statusCode: 401,
    });
    return;
  }

  // Attach user info and family info to request
  const user = await authRepo.findUserById(session.userId);
  const familyResult = await pool.query('SELECT id, name FROM families WHERE id = $1', [session.familyId]);
  const family = familyResult.rows[0] || null;

  if (user && family) {
    request.user = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
    };
    request.family = {
      id: family.id,
      name: family.name,
    };
  }
}
