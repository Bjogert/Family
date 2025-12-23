import { pool } from '../../db/index.js';

export interface ActivityRow {
    id: number;
    family_id: number;
    title: string;
    description: string | null;
    category: string;
    location: string | null;
    start_time: Date;
    end_time: Date | null;
    recurring_pattern: string | null;
    transport_user_id: number | null;
    created_by: number | null;
    created_at: Date;
    updated_at: Date;
    google_calendar_event_id: string | null;
}

export interface ActivityParticipantRow {
    id: number;
    activity_id: number;
    user_id: number;
    display_name: string | null;
    avatar_emoji: string | null;
    color: string | null;
}

export interface CreateActivityData {
    familyId: number;
    title: string;
    description?: string;
    category?: string;
    location?: string;
    startTime: Date;
    endTime?: Date;
    recurringPattern?: string;
    transportUserId?: number;
    createdBy?: number;
    googleCalendarEventId?: string;
}

export interface UpdateActivityData {
    title?: string;
    description?: string | null;
    category?: string;
    location?: string | null;
    startTime?: Date;
    endTime?: Date | null;
    recurringPattern?: string | null;
    transportUserId?: number | null;
    googleCalendarEventId?: string | null;
}

export async function findAllByFamily(familyId: number): Promise<ActivityRow[]> {
    const result = await pool.query<ActivityRow>(
        `SELECT id, family_id, title, description, category, location,
            start_time, end_time, recurring_pattern, transport_user_id,
            created_by, created_at, updated_at, google_calendar_event_id
     FROM activities
     WHERE family_id = $1
     ORDER BY start_time ASC`,
        [familyId]
    );
    return result.rows;
}

export async function findById(id: number, familyId: number): Promise<ActivityRow | null> {
    const result = await pool.query<ActivityRow>(
        `SELECT id, family_id, title, description, category, location,
            start_time, end_time, recurring_pattern, transport_user_id,
            created_by, created_at, updated_at, google_calendar_event_id
     FROM activities
     WHERE id = $1 AND family_id = $2`,
        [id, familyId]
    );
    return result.rows[0] || null;
}

export async function create(data: CreateActivityData): Promise<ActivityRow> {
    const result = await pool.query<ActivityRow>(
        `INSERT INTO activities (family_id, title, description, category, location,
                             start_time, end_time, recurring_pattern, transport_user_id, created_by, google_calendar_event_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
        [
            data.familyId,
            data.title,
            data.description || null,
            data.category || 'other',
            data.location || null,
            data.startTime,
            data.endTime || null,
            data.recurringPattern || null,
            data.transportUserId || null,
            data.createdBy || null,
            data.googleCalendarEventId || null
        ]
    );
    return result.rows[0];
}

export async function update(id: number, familyId: number, data: UpdateActivityData): Promise<ActivityRow | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (data.title !== undefined) {
        fields.push(`title = $${paramCount++}`);
        values.push(data.title);
    }
    if (data.description !== undefined) {
        fields.push(`description = $${paramCount++}`);
        values.push(data.description);
    }
    if (data.category !== undefined) {
        fields.push(`category = $${paramCount++}`);
        values.push(data.category);
    }
    if (data.location !== undefined) {
        fields.push(`location = $${paramCount++}`);
        values.push(data.location);
    }
    if (data.startTime !== undefined) {
        fields.push(`start_time = $${paramCount++}`);
        values.push(data.startTime);
    }
    if (data.endTime !== undefined) {
        fields.push(`end_time = $${paramCount++}`);
        values.push(data.endTime);
    }
    if (data.recurringPattern !== undefined) {
        fields.push(`recurring_pattern = $${paramCount++}`);
        values.push(data.recurringPattern);
    }
    if (data.transportUserId !== undefined) {
        fields.push(`transport_user_id = $${paramCount++}`);
        values.push(data.transportUserId);
    }
    if (data.googleCalendarEventId !== undefined) {
        fields.push(`google_calendar_event_id = $${paramCount++}`);
        values.push(data.googleCalendarEventId);
    }

    if (fields.length === 0) return findById(id, familyId);

    fields.push(`updated_at = NOW()`);
    values.push(id, familyId);

    const result = await pool.query<ActivityRow>(
        `UPDATE activities SET ${fields.join(', ')}
     WHERE id = $${paramCount++} AND family_id = $${paramCount}
     RETURNING *`,
        values
    );
    return result.rows[0] || null;
}

export async function remove(id: number, familyId: number): Promise<boolean> {
    const result = await pool.query(
        `DELETE FROM activities WHERE id = $1 AND family_id = $2`,
        [id, familyId]
    );
    return (result.rowCount ?? 0) > 0;
}

// Participant management
export async function getParticipants(activityId: number): Promise<ActivityParticipantRow[]> {
    const result = await pool.query<ActivityParticipantRow>(
        `SELECT ap.id, ap.activity_id, ap.user_id,
            u.display_name, u.avatar_emoji, u.color
     FROM activity_participants ap
     JOIN users u ON ap.user_id = u.id
     WHERE ap.activity_id = $1`,
        [activityId]
    );
    return result.rows;
}

export async function addParticipant(activityId: number, userId: number): Promise<void> {
    await pool.query(
        `INSERT INTO activity_participants (activity_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (activity_id, user_id) DO NOTHING`,
        [activityId, userId]
    );
}

export async function removeParticipant(activityId: number, userId: number): Promise<boolean> {
    const result = await pool.query(
        `DELETE FROM activity_participants WHERE activity_id = $1 AND user_id = $2`,
        [activityId, userId]
    );
    return (result.rowCount ?? 0) > 0;
}

export async function setParticipants(activityId: number, userIds: number[]): Promise<void> {
    // Remove all existing participants
    await pool.query(`DELETE FROM activity_participants WHERE activity_id = $1`, [activityId]);

    // Add new participants
    for (const userId of userIds) {
        await addParticipant(activityId, userId);
    }
}

export async function getTransportUser(userId: number): Promise<{ id: number; display_name: string; avatar_emoji: string | null } | null> {
    const result = await pool.query(
        `SELECT id, display_name, avatar_emoji FROM users WHERE id = $1`,
        [userId]
    );
    return result.rows[0] || null;
}
