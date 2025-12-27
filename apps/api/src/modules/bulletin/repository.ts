import { pool } from '../../db/index.js';
import type { BulletinListItem } from '@family-hub/shared/types';

export interface BulletinNoteRow {
    id: number;
    family_id: number;
    title: string;
    content: string | null;
    list_items: BulletinListItem[] | null;
    color: string;
    is_pinned: boolean;
    expires_at: Date | null;
    created_by: number;
    created_at: Date;
    updated_at: Date;
    // Joined
    creator_name?: string | null;
    creator_emoji?: string | null;
}

export interface AssignmentRow {
    user_id: number;
    display_name: string | null;
    avatar_emoji: string | null;
}

export interface CreateBulletinData {
    familyId: number;
    title?: string;
    content?: string;
    listItems?: BulletinListItem[];
    color?: string;
    isPinned?: boolean;
    expiresAt?: string | null;
    createdBy: number;
}

export interface UpdateBulletinData {
    title?: string;
    content?: string | null;
    listItems?: BulletinListItem[] | null;
    color?: string;
    isPinned?: boolean;
    expiresAt?: string | null;
}

const SELECT_NOTE = `
  SELECT bn.id, bn.family_id, bn.title, bn.content, bn.list_items,
         bn.color, bn.is_pinned, bn.expires_at, bn.created_by,
         bn.created_at, bn.updated_at,
         u.display_name as creator_name, u.avatar_emoji as creator_emoji
  FROM bulletin_notes bn
  LEFT JOIN users u ON bn.created_by = u.id
`;

export async function findAllByFamily(familyId: number): Promise<BulletinNoteRow[]> {
    // Get non-expired notes, pinned first, then newest first
    const result = await pool.query<BulletinNoteRow>(
        `${SELECT_NOTE}
         WHERE bn.family_id = $1
           AND (bn.expires_at IS NULL OR bn.expires_at > NOW())
         ORDER BY bn.is_pinned DESC, bn.created_at DESC`,
        [familyId]
    );
    return result.rows;
}

export async function findById(id: number, familyId: number): Promise<BulletinNoteRow | null> {
    const result = await pool.query<BulletinNoteRow>(
        `${SELECT_NOTE}
         WHERE bn.id = $1 AND bn.family_id = $2`,
        [id, familyId]
    );
    return result.rows[0] || null;
}

export async function create(data: CreateBulletinData): Promise<BulletinNoteRow> {
    const result = await pool.query<{ id: number }>(
        `INSERT INTO bulletin_notes (family_id, title, content, list_items, color, is_pinned, expires_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
            data.familyId,
            data.title,
            data.content || null,
            data.listItems ? JSON.stringify(data.listItems) : null,
            data.color || 'yellow',
            data.isPinned || false,
            data.expiresAt || null,
            data.createdBy,
        ]
    );

    const note = await findById(result.rows[0].id, data.familyId);
    return note!;
}

export async function update(id: number, familyId: number, data: UpdateBulletinData): Promise<BulletinNoteRow | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
        setClauses.push(`title = $${paramIndex++}`);
        values.push(data.title);
    }
    if (data.content !== undefined) {
        setClauses.push(`content = $${paramIndex++}`);
        values.push(data.content);
    }
    if (data.listItems !== undefined) {
        setClauses.push(`list_items = $${paramIndex++}`);
        values.push(data.listItems ? JSON.stringify(data.listItems) : null);
    }
    if (data.color !== undefined) {
        setClauses.push(`color = $${paramIndex++}`);
        values.push(data.color);
    }
    if (data.isPinned !== undefined) {
        setClauses.push(`is_pinned = $${paramIndex++}`);
        values.push(data.isPinned);
    }
    if (data.expiresAt !== undefined) {
        setClauses.push(`expires_at = $${paramIndex++}`);
        values.push(data.expiresAt);
    }

    setClauses.push(`updated_at = NOW()`);

    if (setClauses.length === 1) {
        // Only updated_at, nothing to update
        return findById(id, familyId);
    }

    values.push(id, familyId);
    await pool.query(
        `UPDATE bulletin_notes SET ${setClauses.join(', ')}
         WHERE id = $${paramIndex++} AND family_id = $${paramIndex}`,
        values
    );

    return findById(id, familyId);
}

export async function remove(id: number, familyId: number): Promise<boolean> {
    const result = await pool.query(
        'DELETE FROM bulletin_notes WHERE id = $1 AND family_id = $2',
        [id, familyId]
    );
    return result.rowCount ? result.rowCount > 0 : false;
}

// Assignments
export async function getAssignments(noteId: number): Promise<AssignmentRow[]> {
    const result = await pool.query<AssignmentRow>(
        `SELECT bna.user_id, u.display_name, u.avatar_emoji
         FROM bulletin_note_assignments bna
         JOIN users u ON bna.user_id = u.id
         WHERE bna.note_id = $1`,
        [noteId]
    );
    return result.rows;
}

export async function setAssignments(noteId: number, userIds: number[]): Promise<void> {
    // Clear existing
    await pool.query('DELETE FROM bulletin_note_assignments WHERE note_id = $1', [noteId]);

    // Add new
    if (userIds.length > 0) {
        const values = userIds.map((_, i) => `($1, $${i + 2})`).join(', ');
        await pool.query(
            `INSERT INTO bulletin_note_assignments (note_id, user_id) VALUES ${values}`,
            [noteId, ...userIds]
        );
    }
}

export async function getAssignmentUserIds(noteId: number): Promise<number[]> {
    const result = await pool.query<{ user_id: number }>(
        'SELECT user_id FROM bulletin_note_assignments WHERE note_id = $1',
        [noteId]
    );
    return result.rows.map(r => r.user_id);
}

// Clean up expired notes (optional, can be run periodically)
export async function deleteExpired(): Promise<number> {
    const result = await pool.query(
        'DELETE FROM bulletin_notes WHERE expires_at IS NOT NULL AND expires_at < NOW()'
    );
    return result.rowCount || 0;
}
