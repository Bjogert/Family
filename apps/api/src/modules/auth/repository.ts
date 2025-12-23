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
  email?: string | null;
  emailVerified?: boolean;
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
    `SELECT id, family_id, username, display_name, role, birthday, gender, avatar_emoji, color, email, email_verified
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
    email: row.email,
    emailVerified: row.email_verified,
  };
}

export async function findUserById(id: number): Promise<User & { createdAt?: string; lastLogin?: string } | null> {
  const result = await pool.query(
    `SELECT id, family_id, username, display_name, role, birthday, gender, avatar_emoji, color, email, email_verified, created_at, last_login
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
    email: row.email,
    emailVerified: row.email_verified,
    createdAt: row.created_at,
    lastLogin: row.last_login,
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

// Email operations
export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await pool.query(
    `SELECT id, family_id, username, display_name, role, birthday, gender, avatar_emoji, color, email, email_verified
     FROM users
     WHERE email = $1`,
    [email]
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
    email: row.email,
    emailVerified: row.email_verified,
  };
}

export async function updateUserEmail(userId: number, email: string | null): Promise<void> {
  await pool.query(
    `UPDATE users SET email = $1, email_verified = FALSE WHERE id = $2`,
    [email, userId]
  );
}

export async function setEmailVerificationToken(userId: number, token: string, expiresAt: Date): Promise<void> {
  await pool.query(
    `UPDATE users SET email_verification_token = $1, email_verification_expires = $2 WHERE id = $3`,
    [token, expiresAt, userId]
  );
}

export async function findUserByEmailVerificationToken(token: string): Promise<User | null> {
  const result = await pool.query(
    `SELECT id, family_id, username, display_name, role, birthday, gender, avatar_emoji, color, email, email_verified
     FROM users
     WHERE email_verification_token = $1 AND email_verification_expires > NOW()`,
    [token]
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
    email: row.email,
    emailVerified: row.email_verified,
  };
}

export async function markEmailVerified(userId: number): Promise<void> {
  await pool.query(
    `UPDATE users SET email_verified = TRUE, email_verification_token = NULL, email_verification_expires = NULL WHERE id = $1`,
    [userId]
  );
}

export async function setPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<void> {
  await pool.query(
    `UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3`,
    [token, expiresAt, userId]
  );
}

export async function findUserByPasswordResetToken(token: string): Promise<User | null> {
  const result = await pool.query(
    `SELECT id, family_id, username, display_name, role, birthday, gender, avatar_emoji, color, email, email_verified
     FROM users
     WHERE password_reset_token = $1 AND password_reset_expires > NOW()`,
    [token]
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
    email: row.email,
    emailVerified: row.email_verified,
  };
}

export async function updatePasswordAndClearResetToken(userId: number, passwordHash: string): Promise<void> {
  await pool.query(
    `UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2`,
    [passwordHash, userId]
  );
}

export async function setPrivacyConsent(userId: number): Promise<void> {
  await pool.query(
    `UPDATE users SET privacy_consent_at = NOW() WHERE id = $1`,
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

// Delete user and related data
export async function deleteUser(userId: number): Promise<boolean> {
  // Start transaction to delete user and related data
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete user sessions
    await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);

    // Delete user's grocery assignments
    await client.query('DELETE FROM grocery_assignments WHERE user_id = $1', [userId]);

    // Delete user preferences
    await client.query('DELETE FROM user_preferences WHERE user_id = $1', [userId]);

    // Delete the user
    const result = await client.query('DELETE FROM users WHERE id = $1', [userId]);

    await client.query('COMMIT');
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Extended user profile with timestamps
export interface UserProfile extends User {
  createdAt: string;
  lastLogin: string | null;
}

export async function findUserProfileById(id: number): Promise<UserProfile | null> {
  const result = await pool.query(
    `SELECT id, family_id, username, display_name, role, birthday, gender, avatar_emoji, color, email, email_verified, created_at, last_login
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
    email: row.email,
    emailVerified: row.email_verified,
    createdAt: row.created_at,
    lastLogin: row.last_login,
  };
}

// Update user profile
export async function updateUserProfile(
  userId: number,
  profile: {
    displayName?: string;
    role?: string;
    birthday?: string;
    gender?: string;
    avatarEmoji?: string;
    color?: string;
  }
): Promise<void> {
  const updates: string[] = [];
  const values: (string | number)[] = [];
  let paramIndex = 1;

  if (profile.displayName !== undefined) {
    updates.push(`display_name = $${paramIndex++}`);
    values.push(profile.displayName);
  }
  if (profile.role !== undefined) {
    updates.push(`role = $${paramIndex++}`);
    values.push(profile.role);
  }
  if (profile.birthday !== undefined) {
    updates.push(`birthday = $${paramIndex++}`);
    values.push(profile.birthday || null as any);
  }
  if (profile.gender !== undefined) {
    updates.push(`gender = $${paramIndex++}`);
    values.push(profile.gender);
  }
  if (profile.avatarEmoji !== undefined) {
    updates.push(`avatar_emoji = $${paramIndex++}`);
    values.push(profile.avatarEmoji);
  }
  if (profile.color !== undefined) {
    updates.push(`color = $${paramIndex++}`);
    values.push(profile.color);
  }

  if (updates.length > 0) {
    values.push(userId);
    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
  }
}

// User preferences
export interface UserPreferences {
  theme: string;
  notifications: {
    groceryAssigned: boolean;
    groceryListUpdated: boolean;
    calendarEventCreated: boolean;
    calendarEventReminder: boolean;
  };
}

export async function getUserPreferences(userId: number): Promise<UserPreferences | null> {
  const result = await pool.query(
    `SELECT theme, notify_grocery_assigned, notify_grocery_updated, notify_calendar_created, notify_calendar_reminder
     FROM user_preferences
     WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    theme: row.theme,
    notifications: {
      groceryAssigned: row.notify_grocery_assigned,
      groceryListUpdated: row.notify_grocery_updated,
      calendarEventCreated: row.notify_calendar_created,
      calendarEventReminder: row.notify_calendar_reminder,
    },
  };
}

export async function updateUserPreferences(
  userId: number,
  prefs: {
    theme?: string;
    notifyGroceryAssigned?: boolean;
    notifyGroceryUpdated?: boolean;
    notifyCalendarCreated?: boolean;
    notifyCalendarReminder?: boolean;
  }
): Promise<void> {
  // Use upsert to create or update preferences
  await pool.query(
    `INSERT INTO user_preferences (user_id, theme, notify_grocery_assigned, notify_grocery_updated, notify_calendar_created, notify_calendar_reminder, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       theme = COALESCE($2, user_preferences.theme),
       notify_grocery_assigned = COALESCE($3, user_preferences.notify_grocery_assigned),
       notify_grocery_updated = COALESCE($4, user_preferences.notify_grocery_updated),
       notify_calendar_created = COALESCE($5, user_preferences.notify_calendar_created),
       notify_calendar_reminder = COALESCE($6, user_preferences.notify_calendar_reminder),
       updated_at = NOW()`,
    [
      userId,
      prefs.theme ?? null,
      prefs.notifyGroceryAssigned ?? null,
      prefs.notifyGroceryUpdated ?? null,
      prefs.notifyCalendarCreated ?? null,
      prefs.notifyCalendarReminder ?? null,
    ]
  );
}

