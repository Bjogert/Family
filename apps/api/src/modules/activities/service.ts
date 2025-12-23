import * as activityRepo from './repository.js';
import type { Activity, CreateActivityInput, UpdateActivityInput } from '@family-hub/shared/types';
import type { GoogleCalendarService } from '../googleCalendar/service.js';

// Calendar service will be injected
let calendarService: GoogleCalendarService | null = null;

export function setCalendarService(service: GoogleCalendarService) {
    calendarService = service;
}

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
        googleCalendarEventId: row.google_calendar_event_id,
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
    createdBy?: number,
    userId?: number
): Promise<Activity> {
    let googleCalendarEventId: string | undefined;

    // Sync to Google Calendar if requested and user has a family calendar configured
    if (input.syncToCalendar && userId && calendarService) {
        try {
            const connection = await calendarService.getConnection(userId);
            if (connection?.familyCalendarId) {
                const startTime = new Date(input.startTime);
                const endTime = input.endTime ? new Date(input.endTime) : new Date(startTime.getTime() + 60 * 60 * 1000); // Default 1 hour

                const calendarEvent = await calendarService.createEvent(userId, {
                    calendarId: connection.familyCalendarId,
                    summary: input.title,
                    description: input.description || undefined,
                    location: input.location || undefined,
                    start: { dateTime: startTime.toISOString() },
                    end: { dateTime: endTime.toISOString() },
                });
                googleCalendarEventId = calendarEvent.id;
            }
        } catch (err) {
            console.error('Failed to create Google Calendar event:', err);
            // Continue without syncing - don't fail the activity creation
        }
    }

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
        googleCalendarEventId,
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
    input: UpdateActivityInput,
    userId?: number
): Promise<Activity | null> {
    // Get existing activity to check for calendar event
    const existing = await activityRepo.findById(id, familyId);
    if (!existing) return null;

    // Update Google Calendar event if it exists
    if (existing.google_calendar_event_id && userId && calendarService) {
        try {
            const connection = await calendarService.getConnection(userId);
            if (connection?.familyCalendarId) {
                const startTime = input.startTime ? new Date(input.startTime) : existing.start_time;
                const endTime = input.endTime ? new Date(input.endTime) : (existing.end_time || new Date(startTime.getTime() + 60 * 60 * 1000));

                await calendarService.updateEvent(userId, connection.familyCalendarId, existing.google_calendar_event_id, {
                    summary: input.title || existing.title,
                    description: input.description !== undefined ? (input.description || undefined) : (existing.description || undefined),
                    location: input.location !== undefined ? (input.location || undefined) : (existing.location || undefined),
                    start: { dateTime: startTime.toISOString() },
                    end: { dateTime: endTime.toISOString() },
                });
            }
        } catch (err) {
            console.error('Failed to update Google Calendar event:', err);
            // Continue without syncing - don't fail the activity update
        }
    }

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

export async function deleteActivity(id: number, familyId: number, userId?: number): Promise<boolean> {
    // Get activity to check for calendar event
    const activity = await activityRepo.findById(id, familyId);
    
    // Delete Google Calendar event if it exists
    if (activity?.google_calendar_event_id && userId && calendarService) {
        try {
            const connection = await calendarService.getConnection(userId);
            if (connection?.familyCalendarId) {
                await calendarService.deleteEvent(userId, connection.familyCalendarId, activity.google_calendar_event_id);
            }
        } catch (err) {
            console.error('Failed to delete Google Calendar event:', err);
            // Continue without syncing - don't fail the activity deletion
        }
    }

    return activityRepo.remove(id, familyId);
}
