import { pool } from '../../db/index.js';

export interface User {
  id: number;
  familyId: number;
  username: string;
  displayName: string | null;
  role?: string | null;
  birthday?: string | null;
  gender?: string | null;
  avatarEmoji?: string | null;
  color?: string | null;
}

export interface Session {
  id: string;
  familyId: number;
  userId: number;
  createdAt: Date;
  expiresAt: Date;
  userAgent: string | null;
}

// User operations
export async function findUserByUsername(familyId: number, username: string): Promise<User | null> {
  const result = await pool.query(
    `SELECT id, family_id, username, display_name, role, birthday, gender, avatar_emoji, color
     FROM users
     WHERE family_id = $1 AND username = $2`,
    [familyId, username]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    familyId: row.family_id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    birthday: row.birthday,
    gender: row.gender,
    avatarEmoji: row.avatar_emoji,
    color: row.color,
  };
}

export async function findUserById(id: number): Promise<User | null> {
  const result = await pool.query(
    `SELECT id, family_id, username, display_name, role, birthday, gender, avatar_emoji, color
     FROM users
     WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    familyId: row.family_id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    birthday: row.birthday,
    gender: row.gender,
    avatarEmoji: row.avatar_emoji,
    color: row.color,
  };
}

export async function getUserPasswordHash(familyId: number, username: string): Promise<string | null> {
  const result = await pool.query(
    `SELECT password_hash FROM users WHERE family_id = $1 AND username = $2`,
    [familyId, username]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].password_hash;
}

export async function updateLastLogin(userId: number): Promise<void> {
  await pool.query(
    `UPDATE users SET last_login = NOW() WHERE id = $1`,
    [userId]
  );
}

// Session operations
export async function createSession(
  id: string,
  familyId: number,
  userId: number,
  expiresAt: Date,
  userAgent?: string
): Promise<Session> {
  const result = await pool.query(
    `INSERT INTO sessions (id, family_id, user_id, expires_at, user_agent)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, family_id, user_id, created_at, expires_at, user_agent`,
    [id, familyId, userId, expiresAt, userAgent || null]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    familyId: row.family_id,
    userId: row.user_id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    userAgent: row.user_agent,
  };
}

export async function findSession(id: string): Promise<Session | null> {
  const result = await pool.query(
    `SELECT id, family_id, user_id, created_at, expires_at, user_agent
     FROM sessions
     WHERE id = $1 AND expires_at > NOW()`,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    familyId: row.family_id,
    userId: row.user_id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    userAgent: row.user_agent,
  };
}

export async function deleteSession(id: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM sessions WHERE id = $1`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function deleteExpiredSessions(): Promise<number> {
  const result = await pool.query(
    `DELETE FROM sessions WHERE expires_at <= NOW()`
  );
  return result.rowCount ?? 0;
}
