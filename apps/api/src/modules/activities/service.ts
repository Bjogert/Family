import * as activityRepo from './repository.js';
import type { Activity, CreateActivityInput, UpdateActivityInput } from '@family-hub/shared/types';

function mapRowToActivity(row: activityRepo.ActivityRow): Activity {
    return {
        id: row.id,
        familyId: row.family_id,
        title: row.title,
        description: row.description,
        category: row.category as Activity['category'],
        location: row.location,
        startTime: row.start_time.toISOString(),
        endTime: row.end_time?.toISOString() || null,
        recurringPattern: row.recurring_pattern as Activity['recurringPattern'],
        transportUserId: row.transport_user_id,
        createdBy: row.created_by,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
    };
}

export async function getAllActivities(familyId: number): Promise<Activity[]> {
    const rows = await activityRepo.findAllByFamily(familyId);
    const activities: Activity[] = [];

    for (const row of rows) {
        const activity = mapRowToActivity(row);

        // Get participants
        const participants = await activityRepo.getParticipants(row.id);
        activity.participants = participants.map(p => ({
            id: p.id,
            activityId: p.activity_id,
            userId: p.user_id,
            user: {
                id: p.user_id,
                displayName: p.display_name,
                avatarEmoji: p.avatar_emoji,
                color: p.color,
            }
        }));

        // Get transport user if set
        if (row.transport_user_id) {
            const transportUser = await activityRepo.getTransportUser(row.transport_user_id);
            if (transportUser) {
                activity.transportUser = {
                    id: transportUser.id,
                    displayName: transportUser.display_name,
                    avatarEmoji: transportUser.avatar_emoji,
                };
            }
        }

        activities.push(activity);
    }

    return activities;
}

export async function getActivityById(id: number, familyId: number): Promise<Activity | null> {
    const row = await activityRepo.findById(id, familyId);
    if (!row) return null;

    const activity = mapRowToActivity(row);

    // Get participants
    const participants = await activityRepo.getParticipants(row.id);
    activity.participants = participants.map(p => ({
        id: p.id,
        activityId: p.activity_id,
        userId: p.user_id,
        user: {
            id: p.user_id,
            displayName: p.display_name,
            avatarEmoji: p.avatar_emoji,
            color: p.color,
        }
    }));

    // Get transport user
    if (row.transport_user_id) {
        const transportUser = await activityRepo.getTransportUser(row.transport_user_id);
        if (transportUser) {
            activity.transportUser = {
                id: transportUser.id,
                displayName: transportUser.display_name,
                avatarEmoji: transportUser.avatar_emoji,
            };
        }
    }

    return activity;
}

export async function createActivity(
    familyId: number,
    input: CreateActivityInput,
    createdBy?: number
): Promise<Activity> {
    const row = await activityRepo.create({
        familyId,
        title: input.title,
        description: input.description,
        category: input.category,
        location: input.location,
        startTime: new Date(input.startTime),
        endTime: input.endTime ? new Date(input.endTime) : undefined,
        recurringPattern: input.recurringPattern || undefined,
        transportUserId: input.transportUserId,
        createdBy,
    });

    // Set participants if provided
    if (input.participantIds && input.participantIds.length > 0) {
        await activityRepo.setParticipants(row.id, input.participantIds);
    }

    return getActivityById(row.id, familyId) as Promise<Activity>;
}

export async function updateActivity(
    id: number,
    familyId: number,
    input: UpdateActivityInput
): Promise<Activity | null> {
    const row = await activityRepo.update(id, familyId, {
        title: input.title,
        description: input.description,
        category: input.category,
        location: input.location,
        startTime: input.startTime ? new Date(input.startTime) : undefined,
        endTime: input.endTime ? new Date(input.endTime) : undefined,
        recurringPattern: input.recurringPattern,
        transportUserId: input.transportUserId,
    });

    if (!row) return null;

    // Update participants if provided
    if (input.participantIds) {
        await activityRepo.setParticipants(id, input.participantIds);
    }

    return getActivityById(id, familyId);
}

export async function deleteActivity(id: number, familyId: number): Promise<boolean> {
    return activityRepo.remove(id, familyId);
}
