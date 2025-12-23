import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { LoginSchema } from '@family-hub/shared/schemas';
import { config } from '../../config.js';
import * as authService from './service.js';
import * as authRepo from './repository.js';
import { pool } from '../../db/index.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../services/email.js';
import { generateSecureToken, getTokenExpiry } from '../../utils/tokens.js';

interface LoginBody {
  familyId: number;
  username: string;
  password?: string;
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

      if (!familyId || !username) {
        return reply.status(400).send({
          success: false,
          message: 'Family ID and username required',
        });
      }

      const userAgent = request.headers['user-agent'];
      const result = await authService.loginUser(familyId, username, password || '', userAgent);

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
        secure: false, // Set to true when using HTTPS
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
        role: user.role || null,
        birthday: user.birthday || null,
        gender: user.gender || null,
        avatarEmoji: user.avatarEmoji || null,
        color: user.color || null,
      } : null,
    });
  });

  // DELETE /api/users/:id - Delete user account
  app.delete<{ Params: { id: string } }>(
    '/users/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const sessionId = request.cookies.sessionId;
      const userIdToDelete = parseInt(request.params.id, 10);

      if (!sessionId) {
        return reply.status(401).send({
          success: false,
          error: 'Not authenticated',
        });
      }

      const session = await authService.validateSession(sessionId);
      if (!session) {
        return reply.status(401).send({
          success: false,
          error: 'Invalid session',
        });
      }

      // Users can only delete their own account
      if (session.userId !== userIdToDelete) {
        return reply.status(403).send({
          success: false,
          error: 'You can only delete your own account',
        });
      }

      const deleted = await authRepo.deleteUser(userIdToDelete);

      if (!deleted) {
        return reply.status(404).send({
          success: false,
          error: 'User not found',
        });
      }

      // Clear the session cookie
      reply.clearCookie('sessionId', { path: '/' });

      return reply.send({
        success: true,
        message: 'Account deleted successfully',
      });
    }
  );

  // POST /api/auth/forgot-password - Request password reset
  app.post<{ Body: { email: string } }>(
    '/forgot-password',
    async (request: FastifyRequest<{ Body: { email: string } }>, reply: FastifyReply) => {
      const { email } = request.body;

      if (!email) {
        return reply.status(400).send({
          success: false,
          message: 'E-postadress krävs',
        });
      }

      // Find user by email
      const user = await authRepo.findUserByEmail(email);

      // Always return success to prevent email enumeration
      if (!user) {
        return reply.send({
          success: true,
          message: 'Om e-postadressen finns i vårt system kommer ett återställningsmail att skickas',
        });
      }

      // Generate reset token (valid for 1 hour)
      const token = generateSecureToken();
      const expiresAt = getTokenExpiry(1); // 1 hour

      await authRepo.setPasswordResetToken(user.id, token, expiresAt);

      // Send reset email
      await sendPasswordResetEmail(email, token, user.displayName || user.username);

      return reply.send({
        success: true,
        message: 'Om e-postadressen finns i vårt system kommer ett återställningsmail att skickas',
      });
    }
  );

  // POST /api/auth/reset-password - Reset password with token
  app.post<{ Body: { token: string; newPassword: string } }>(
    '/reset-password',
    async (request: FastifyRequest<{ Body: { token: string; newPassword: string } }>, reply: FastifyReply) => {
      const { token, newPassword } = request.body;

      if (!token || !newPassword) {
        return reply.status(400).send({
          success: false,
          message: 'Token och nytt lösenord krävs',
        });
      }

      if (newPassword.length < 4) {
        return reply.status(400).send({
          success: false,
          message: 'Lösenordet måste vara minst 4 tecken',
        });
      }

      // Find user by reset token
      const user = await authRepo.findUserByPasswordResetToken(token);

      if (!user) {
        return reply.status(400).send({
          success: false,
          message: 'Ogiltig eller utgången länk. Begär en ny återställningslänk.',
        });
      }

      // Hash new password and update
      const bcrypt = (await import('bcrypt')).default;
      const passwordHash = await bcrypt.hash(newPassword, 10);

      await authRepo.updatePasswordAndClearResetToken(user.id, passwordHash);

      return reply.send({
        success: true,
        message: 'Lösenordet har återställts. Du kan nu logga in med ditt nya lösenord.',
      });
    }
  );

  // POST /api/auth/verify-email - Verify email with token
  app.post<{ Body: { token: string } }>(
    '/verify-email',
    async (request: FastifyRequest<{ Body: { token: string } }>, reply: FastifyReply) => {
      const { token } = request.body;

      if (!token) {
        return reply.status(400).send({
          success: false,
          message: 'Verifieringstoken krävs',
        });
      }

      // Find user by verification token
      const user = await authRepo.findUserByEmailVerificationToken(token);

      if (!user) {
        return reply.status(400).send({
          success: false,
          message: 'Ogiltig eller utgången verifieringslänk',
        });
      }

      // Mark email as verified
      await authRepo.markEmailVerified(user.id);

      return reply.send({
        success: true,
        message: 'Din e-postadress har bekräftats!',
      });
    }
  );

  // POST /api/auth/resend-verification - Resend verification email
  app.post(
    '/resend-verification',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const sessionId = request.cookies.sessionId;

      if (!sessionId) {
        return reply.status(401).send({
          success: false,
          message: 'Du måste vara inloggad',
        });
      }

      const session = await authService.validateSession(sessionId);
      if (!session) {
        return reply.status(401).send({
          success: false,
          message: 'Ogiltig session',
        });
      }

      const user = await authRepo.findUserById(session.userId);
      if (!user || !user.email) {
        return reply.status(400).send({
          success: false,
          message: 'Ingen e-postadress registrerad',
        });
      }

      if (user.emailVerified) {
        return reply.status(400).send({
          success: false,
          message: 'E-postadressen är redan bekräftad',
        });
      }

      // Generate new verification token (valid for 24 hours)
      const token = generateSecureToken();
      const expiresAt = getTokenExpiry(24);

      await authRepo.setEmailVerificationToken(user.id, token, expiresAt);

      // Send verification email
      await sendVerificationEmail(user.email, token, user.displayName || user.username);

      return reply.send({
        success: true,
        message: 'Ett nytt bekräftelsemail har skickats',
      });
    }
  );
}

