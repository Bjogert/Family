import type { BulletinNote, BulletinListItem, BulletinColor } from '@family-hub/shared/types';
import * as bulletinRepo from './repository.js';
import * as pushService from '../push/service.js';
import { pool } from '../../db/index.js';

function mapRowToNote(row: bulletinRepo.BulletinNoteRow): BulletinNote {
    return {
        id: row.id,
        familyId: row.family_id,
        title: row.title,
        content: row.content,
        listItems: row.list_items,
        color: row.color as BulletinColor,
        isPinned: row.is_pinned,
        recipientId: row.recipient_id,
        expiresAt: row.expires_at?.toISOString() || null,
        createdBy: row.created_by,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
        creator: row.creator_name ? {
            id: row.created_by,
            displayName: row.creator_name,
            avatarEmoji: row.creator_emoji || null,
        } : undefined,
        recipient: row.recipient_id && row.recipient_name ? {
            id: row.recipient_id,
            displayName: row.recipient_name,
            avatarEmoji: row.recipient_emoji || null,
        } : undefined,
    };
}

export async function getAllNotes(familyId: number): Promise<BulletinNote[]> {
    const rows = await bulletinRepo.findAllByFamily(familyId);
    const notes = rows.map(mapRowToNote);

    // Fetch assignments for all notes
    for (const note of notes) {
        const assignments = await bulletinRepo.getAssignments(note.id);
        if (assignments.length > 0) {
            note.assignedTo = assignments.map(a => ({
                id: a.user_id,
                displayName: a.display_name,
                avatarEmoji: a.avatar_emoji,
            }));
        }
    }

    return notes;
}

export async function getNoteById(id: number, familyId: number): Promise<BulletinNote | null> {
    const row = await bulletinRepo.findById(id, familyId);
    if (!row) return null;

    const note = mapRowToNote(row);

    const assignments = await bulletinRepo.getAssignments(id);
    if (assignments.length > 0) {
        note.assignedTo = assignments.map(a => ({
            id: a.user_id,
            displayName: a.display_name,
            avatarEmoji: a.avatar_emoji,
        }));
    }

    return note;
}

interface CreateNoteParams {
    familyId: number;
    title?: string;
    content?: string;
    listItems?: BulletinListItem[];
    color?: BulletinColor;
    isPinned?: boolean;
    recipientId?: number;
    expiresAt?: string | null;
    assignedTo?: number[];
    createdBy: number;
}

export async function createNote(params: CreateNoteParams): Promise<BulletinNote> {
    const row = await bulletinRepo.create({
        familyId: params.familyId,
        title: params.title,
        content: params.content,
        listItems: params.listItems,
        color: params.color,
        isPinned: params.isPinned,
        recipientId: params.recipientId,
        expiresAt: params.expiresAt,
        createdBy: params.createdBy,
    });

    const note = mapRowToNote(row);

    // Set assignments and send notifications
    if (params.assignedTo && params.assignedTo.length > 0) {
        await bulletinRepo.setAssignments(note.id, params.assignedTo);

        // Send push notifications to assigned users (except creator)
        const notifyUserIds = params.assignedTo.filter(id => id !== params.createdBy);
        if (notifyUserIds.length > 0) {
            const creatorName = await getCreatorName(params.createdBy);
            const pushBody = params.title 
                ? `${creatorName} la upp: "${params.title}"`
                : `${creatorName} la upp en notis`;
            await pushService.sendToUsers(notifyUserIds, {
                title: '📌 Ny notis',
                body: pushBody,
                url: '/',
                tag: `bulletin-${note.id}`,
            });
        }

        // Reload assignments
        const assignments = await bulletinRepo.getAssignments(note.id);
        note.assignedTo = assignments.map(a => ({
            id: a.user_id,
            displayName: a.display_name,
            avatarEmoji: a.avatar_emoji,
        }));
    }

    return note;
}

interface UpdateNoteParams {
    title?: string;
    content?: string | null;
    listItems?: BulletinListItem[] | null;
    color?: BulletinColor;
    isPinned?: boolean;
    expiresAt?: string | null;
    assignedTo?: number[];
}

export async function updateNote(
    id: number,
    familyId: number,
    params: UpdateNoteParams,
    updatedBy?: number
): Promise<BulletinNote | null> {
    const existingNote = await bulletinRepo.findById(id, familyId);
    if (!existingNote) return null;

    const row = await bulletinRepo.update(id, familyId, {
        title: params.title,
        content: params.content,
        listItems: params.listItems,
        color: params.color,
        isPinned: params.isPinned,
        expiresAt: params.expiresAt,
    });

    if (!row) return null;

    // Handle assignment changes
    if (params.assignedTo !== undefined) {
        const previousAssignments = await bulletinRepo.getAssignmentUserIds(id);
        await bulletinRepo.setAssignments(id, params.assignedTo);

        // Notify newly assigned users
        const newlyAssigned = params.assignedTo.filter(
            userId => !previousAssignments.includes(userId) && userId !== updatedBy
        );

        if (newlyAssigned.length > 0 && updatedBy) {
            const updaterName = await getCreatorName(updatedBy);
            await pushService.sendToUsers(newlyAssigned, {
                title: '📌 Notis tilldelad',
                body: `${updaterName} tillade dig på: "${row.title}"`,
                url: '/',
                tag: `bulletin-${id}`,
            });
        }
    }

    return getNoteById(id, familyId);
}

export async function deleteNote(id: number, familyId: number): Promise<boolean> {
    return bulletinRepo.remove(id, familyId);
}

// Get private messages for a specific user's wall
export async function getNotesForRecipient(familyId: number, recipientId: number): Promise<BulletinNote[]> {
    const rows = await bulletinRepo.findByRecipient(familyId, recipientId);
    const notes = rows.map(mapRowToNote);

    // Fetch assignments for all notes
    for (const note of notes) {
        const assignments = await bulletinRepo.getAssignments(note.id);
        if (assignments.length > 0) {
            note.assignedTo = assignments.map(a => ({
                id: a.user_id,
                displayName: a.display_name,
                avatarEmoji: a.avatar_emoji,
            }));
        }
    }

    return notes;
}

async function getCreatorName(userId: number): Promise<string> {
    const result = await pool.query<{ display_name: string | null; username: string }>(
        'SELECT display_name, username FROM users WHERE id = $1',
        [userId]
    );
    const user = result.rows[0];
    return user?.display_name || user?.username || 'Någon';
}
