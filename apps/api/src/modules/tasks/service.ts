import * as taskRepo from './repository.js';
import type { Task, CreateTaskInput, UpdateTaskInput } from '@family-hub/shared/types';
import * as pushService from '../push/service.js';
import * as authRepo from '../auth/repository.js';

function mapRowToTask(row: taskRepo.TaskRow): Task {
    return {
        id: row.id,
        familyId: row.family_id,
        title: row.title,
        description: row.description,
        category: row.category as Task['category'],
        difficulty: row.difficulty as Task['difficulty'],
        points: row.points,
        assignedTo: row.assigned_to,
        dueDate: row.due_date,
        dueTime: row.due_time,
        recurringPattern: row.recurring_pattern as Task['recurringPattern'],
        status: row.status as Task['status'],
        completedAt: row.completed_at?.toISOString() || null,
        verifiedBy: row.verified_by,
        verifiedAt: row.verified_at?.toISOString() || null,
        createdBy: row.created_by,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
        assignee: row.assigned_to ? {
            id: row.assigned_to,
            displayName: row.assignee_name || null,
            avatarEmoji: row.assignee_emoji || null,
            color: row.assignee_color || null,
        } : undefined,
        creator: row.created_by ? {
            id: row.created_by,
            displayName: row.creator_name || null,
        } : undefined,
        verifier: row.verified_by ? {
            id: row.verified_by,
            displayName: row.verifier_name || null,
        } : undefined,
    };
}

export async function getAllTasks(familyId: number): Promise<Task[]> {
    const rows = await taskRepo.findAllByFamily(familyId);
    return rows.map(mapRowToTask);
}

export async function getTaskById(id: number, familyId: number): Promise<Task | null> {
    const row = await taskRepo.findById(id, familyId);
    if (!row) return null;
    return mapRowToTask(row);
}

export async function getTasksByAssignee(familyId: number, userId: number): Promise<Task[]> {
    const rows = await taskRepo.findByAssignee(familyId, userId);
    return rows.map(mapRowToTask);
}

export async function createTask(
    familyId: number,
    input: CreateTaskInput,
    createdBy?: number
): Promise<Task> {
    const row = await taskRepo.create({
        familyId,
        title: input.title,
        description: input.description,
        category: input.category,
        difficulty: input.difficulty,
        points: input.points,
        assignedTo: input.assignedTo,
        dueDate: input.dueDate,
        dueTime: input.dueTime,
        recurringPattern: input.recurringPattern || undefined,
        createdBy,
    });

    // Send push notification if task is assigned to someone (not self-assigned)
    if (input.assignedTo && createdBy && input.assignedTo !== createdBy) {
        try {
            const creator = await authRepo.findUserById(createdBy);
            const creatorName = creator?.displayName || creator?.username || 'Någon';
            await pushService.notifyTaskAssigned(input.assignedTo, input.title, creatorName);
        } catch (error) {
            console.error('Failed to send task assignment notification:', error);
        }
    }

    // Fetch with joined data
    return getTaskById(row.id, familyId) as Promise<Task>;
}

export async function updateTask(
    id: number,
    familyId: number,
    input: UpdateTaskInput,
    updatedBy?: number
): Promise<Task | null> {
    // Get the current task to check if assignment changed
    const currentTask = await getTaskById(id, familyId);
    const previousAssignedTo = currentTask?.assignedTo;

    const row = await taskRepo.update(id, familyId, {
        title: input.title,
        description: input.description,
        category: input.category,
        difficulty: input.difficulty,
        points: input.points,
        assignedTo: input.assignedTo,
        dueDate: input.dueDate,
        dueTime: input.dueTime,
        recurringPattern: input.recurringPattern,
        status: input.status,
    });

    if (!row) return null;

    // Send push notification if task assignment changed (not self-assigned)
    if (input.assignedTo && input.assignedTo !== previousAssignedTo && updatedBy && input.assignedTo !== updatedBy) {
        try {
            const updater = await authRepo.findUserById(updatedBy);
            const updaterName = updater?.displayName || updater?.username || 'Någon';
            const taskTitle = input.title || currentTask?.title || 'En uppgift';
            await pushService.notifyTaskAssigned(input.assignedTo, taskTitle, updaterName);
        } catch (error) {
            console.error('Failed to send task assignment notification:', error);
        }
    }

    return getTaskById(id, familyId);
}

export async function verifyTask(
    id: number,
    familyId: number,
    verifiedBy: number
): Promise<Task | null> {
    const row = await taskRepo.verifyTask(id, familyId, verifiedBy);
    if (!row) return null;
    return getTaskById(id, familyId);
}

export async function deleteTask(id: number, familyId: number): Promise<boolean> {
    return taskRepo.remove(id, familyId);
}
