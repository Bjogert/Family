import * as repository from './repository.js';
import type { GroceryRow, CreateGroceryData, UpdateGroceryData } from './repository.js';
import { connectionManager } from '../../websocket/connectionManager.js';
import * as pushService from '../push/service.js';
import * as authRepo from '../auth/repository.js';
import { logger } from '../../utils/logger.js';

export interface GroceryItem {
    id: number;
    name: string;
    category: string;
    quantity: number;
    unit: string | null;
    isBought: boolean;
    addedBy: { id: number; name: string } | null;
    boughtBy: { id: number; name: string } | null;
    createdAt: string;
    updatedAt: string;
    boughtAt: string | null;
}

function toGroceryItem(row: GroceryRow): GroceryItem {
    return {
        id: row.id,
        name: row.name,
        category: row.category,
        quantity: row.quantity,
        unit: row.unit,
        isBought: row.is_bought,
        addedBy: row.added_by ? { id: row.added_by, name: row.added_by_name || 'Unknown' } : null,
        boughtBy: row.bought_by ? { id: row.bought_by, name: row.bought_by_name || 'Unknown' } : null,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
        boughtAt: row.bought_at?.toISOString() || null,
    };
}

export async function getAllGroceries(familyId: number): Promise<GroceryItem[]> {
    const rows = await repository.findAllByFamily(familyId);
    return rows.map(toGroceryItem);
}

export async function getGroceryById(id: number, familyId: number): Promise<GroceryItem | null> {
    const row = await repository.findById(id, familyId);
    return row ? toGroceryItem(row) : null;
}

export async function createGrocery(data: CreateGroceryData): Promise<GroceryItem> {
    const row = await repository.create(data);
    const item = toGroceryItem(row);

    // Broadcast to all family members
    connectionManager.broadcastToFamily(data.familyId, {
        type: 'grocery:added',
        payload: { item },
    });

    return item;
}

export async function updateGrocery(
    id: number,
    familyId: number,
    data: UpdateGroceryData
): Promise<GroceryItem | null> {
    const row = await repository.update(id, familyId, data);
    if (!row) return null;

    const item = toGroceryItem(row);

    // Broadcast to all family members
    connectionManager.broadcastToFamily(familyId, {
        type: 'grocery:updated',
        payload: { item },
    });

    return item;
}

export async function deleteGrocery(id: number, familyId: number): Promise<boolean> {
    const success = await repository.remove(id, familyId);

    if (success) {
        // Broadcast to all family members
        connectionManager.broadcastToFamily(familyId, {
            type: 'grocery:deleted',
            payload: { id },
        });
    }

    return success;
}

export async function clearBoughtGroceries(familyId: number): Promise<number> {
    const count = await repository.clearBought(familyId);

    if (count > 0) {
        // Broadcast to all family members
        connectionManager.broadcastToFamily(familyId, {
            type: 'grocery:cleared',
            payload: { count },
        });
    }

    return count;
}

export interface CategoryInfo {
    name: string;
    icon: string;
    sortOrder: number;
}

export async function getCategories(): Promise<CategoryInfo[]> {
    const rows = await repository.getCategories();
    return rows.map((row) => ({
        name: row.name,
        icon: row.icon,
        sortOrder: row.sort_order,
    }));
}

// Grocery assignments
export interface GroceryAssignmentInfo {
    id: number;
    familyId: number;
    userId: number;
    assignedBy: number | null;
    createdAt: Date;
    userDisplayName: string | null;
    userAvatarEmoji: string | null;
    userColor: string | null;
}

function mapAssignment(row: repository.GroceryAssignment): GroceryAssignmentInfo {
    return {
        id: row.id,
        familyId: row.family_id,
        userId: row.user_id,
        assignedBy: row.assigned_by,
        createdAt: row.created_at,
        userDisplayName: row.user_display_name,
        userAvatarEmoji: row.user_avatar_emoji,
        userColor: row.user_color,
    };
}

export async function getGroceryAssignments(familyId: number): Promise<GroceryAssignmentInfo[]> {
    const rows = await repository.getAssignments(familyId);
    return rows.map(mapAssignment);
}

export async function assignGroceryList(familyId: number, userId: number, assignedBy: number): Promise<GroceryAssignmentInfo | null> {
    const assignment = await repository.addAssignment(familyId, userId, assignedBy);
    if (!assignment) return null;

    // Broadcast assignment to all family members
    connectionManager.broadcastToFamily(familyId, {
        type: 'grocery:assigned',
        payload: { userId, assignedBy },
    });

    // Send push notification if assigned to someone else (not self)
    if (userId !== assignedBy) {
        try {
            const assigner = await authRepo.findUserById(assignedBy);
            const assignerName = assigner?.displayName || assigner?.username || 'Någon';
            await pushService.notifyGroceryAssigned(userId, 'inköpslistan', assignerName);
        } catch (error) {
            logger.error('Failed to send grocery assignment notification', { error });
        }
    }

    return mapAssignment(assignment);
}

export async function unassignGroceryList(familyId: number, userId: number): Promise<boolean> {
    const success = await repository.removeAssignment(familyId, userId);

    if (success) {
        // Broadcast unassignment to all family members
        connectionManager.broadcastToFamily(familyId, {
            type: 'grocery:unassigned',
            payload: { userId },
        });
    }

    return success;
}
