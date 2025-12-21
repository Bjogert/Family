import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { LoginSchema } from '@family-hub/shared/schemas';
import { config } from '../../config.js';
import * as authService from './service.js';
import * as authRepo from './repository.js';
import { pool } from '../../db/index.js';

interface LoginBody {
  familyId: number;
  username: string;
  password: string;
}

interface FamilyLoginRequest extends FastifyRequest {
  family?: {
    id: number;
    name: string;
  };
}

export default async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/login
  app.post<{ Body: LoginBody }>(
    '/login',
    async (request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
      const { familyId, username, password } = request.body;

      if (!familyId || !username || !password) {
        return reply.status(400).send({
          success: false,
          message: 'Family ID, username and password required',
        });
      }

      const userAgent = request.headers['user-agent'];
      const result = await authService.loginUser(familyId, username, password, userAgent);

      if (!result) {
        return reply.status(401).send({
          success: false,
          message: 'Invalid username or password',
        });
      }

      // Get family name
      const familyResult = await pool.query('SELECT id, name FROM families WHERE id = $1', [familyId]);
      if (familyResult.rows.length > 0) {
        result.family.name = familyResult.rows[0].name;
      }

      reply.setCookie('sessionId', result.sessionId, {
        path: '/',
        httpOnly: true,
        secure: !config.isDev,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      });

      return reply.send({
        success: true,
        family: result.family,
        user: result.user,
      });
    }
  );

  // POST /api/auth/logout
  app.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const sessionId = request.cookies.sessionId;

    if (sessionId) {
      await authService.destroySession(sessionId);
    }

    reply.clearCookie('sessionId', { path: '/' });

    return reply.send({
      success: true,
    });
  });

  // GET /api/auth/status
  app.get('/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const sessionId = request.cookies.sessionId;

    if (!sessionId) {
      return reply.send({
        authenticated: false,
      });
    }

    const session = await authService.validateSession(sessionId);

    if (!session) {
      return reply.send({
        authenticated: false,
      });
    }

    const user = await authRepo.findUserById(session.userId);
    const familyResult = await pool.query('SELECT id, name FROM families WHERE id = $1', [session.familyId]);
    const family = familyResult.rows[0] || null;

    return reply.send({
      authenticated: true,
      family: family ? {
        id: family.id,
        name: family.name,
      } : null,
      user: user ? {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
      } : null,
    });
  });
}

