import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { config } from '../../config.js';
import * as sessionRepo from './repository.js';

const SESSION_DURATION_DAYS = 30;

export interface LoginResult {
  sessionId: string;
  family: {
    id: number;
    name: string;
  };
  user: {
    id: number;
    username: string;
    displayName: string | null;
  };
}

export async function loginUser(
  familyId: number,
  username: string,
  password: string,
  userAgent?: string
): Promise<LoginResult | null> {
  const user = await sessionRepo.findUserByUsername(familyId, username);
  if (!user) {
    return null;
  }

  const passwordHash = await sessionRepo.getUserPasswordHash(familyId, username);

  // If user has a password, validate it. If not, allow login without password.
  if (passwordHash) {
    const isPasswordValid = await bcrypt.compare(password, passwordHash);
    if (!isPasswordValid) {
      return null;
    }
  }

  // Update last login
  await sessionRepo.updateLastLogin(user.id);

  // Create session
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  await sessionRepo.createSession(sessionId, familyId, user.id, expiresAt, userAgent);

  return {
    sessionId,
    family: {
      id: familyId,
      name: '', // Will be filled in routes
    },
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
    },
  };
}

export async function validateSession(sessionId: string): Promise<{ userId: number; familyId: number } | null> {
  const session = await sessionRepo.findSession(sessionId);
  if (!session) {
    return null;
  }
  return { userId: session.userId, familyId: session.familyId };
}

export async function destroySession(sessionId: string): Promise<boolean> {
  return sessionRepo.deleteSession(sessionId);
}

export async function cleanupExpiredSessions(): Promise<number> {
  return sessionRepo.deleteExpiredSessions();
}