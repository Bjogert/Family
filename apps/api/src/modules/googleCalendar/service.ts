import type { GoogleCalendarRepository } from './repository.js';
import type {
    GoogleCalendar,
    GoogleCalendarEvent,
    CreateCalendarEventInput,
    CalendarSettings,
} from '@family-hub/shared/types';
import { config } from '../../config.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID || config.google.clientId;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET || config.google.clientSecret;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_CALENDAR_REDIRECT_URI || config.google.redirectUri;

const SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
];

export function createGoogleCalendarService(repository: GoogleCalendarRepository) {
    // Generate OAuth URL for connecting Google account
    function getAuthUrl(userId: number, familyId: number): string {
        const state = Buffer.from(JSON.stringify({ userId, familyId })).toString('base64');
        const params = new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            redirect_uri: GOOGLE_REDIRECT_URI,
            response_type: 'code',
            scope: SCOPES.join(' '),
            access_type: 'offline',
            prompt: 'consent',
            state,
        });
        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }

    // Exchange authorization code for tokens
    async function exchangeCodeForTokens(code: string): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        email: string;
    }> {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                code,
                grant_type: 'authorization_code',
                redirect_uri: GOOGLE_REDIRECT_URI,
            }),
        });

        if (!tokenResponse.ok) {
            const error = await tokenResponse.text();
            throw new Error(`Failed to exchange code: ${error}`);
        }

        const tokens = await tokenResponse.json();

        // Get user email
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        if (!userInfoResponse.ok) {
            throw new Error('Failed to get user info');
        }

        const userInfo = await userInfoResponse.json();

        return {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresIn: tokens.expires_in,
            email: userInfo.email,
        };
    }

    // Refresh access token if expired
    async function refreshAccessToken(userId: number): Promise<string> {
        const connection = await repository.getConnectionByUserId(userId);
        if (!connection) {
            throw new Error('No Google Calendar connection found');
        }

        // Check if token is still valid (with 5 min buffer)
        const expiresAt = new Date(connection.tokenExpiresAt);
        if (expiresAt.getTime() > Date.now() + 5 * 60 * 1000) {
            return connection.accessToken;
        }

        // Refresh the token
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                refresh_token: connection.refreshToken,
                grant_type: 'refresh_token',
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to refresh token: ${error}`);
        }

        const tokens = await response.json();
        const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

        await repository.updateTokens(userId, tokens.access_token, newExpiresAt);

        return tokens.access_token;
    }

    // Get list of user's calendars
    async function getCalendars(userId: number): Promise<GoogleCalendar[]> {
        const accessToken = await refreshAccessToken(userId);
        const connection = await repository.getConnectionByUserId(userId);

        const response = await fetch(
            'https://www.googleapis.com/calendar/v3/users/me/calendarList',
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );

        if (!response.ok) {
            throw new Error('Failed to fetch calendars');
        }

        const data = await response.json();
        const selectedIds = connection?.selectedCalendarIds || [];

        return data.items.map((cal: any) => ({
            id: cal.id,
            summary: cal.summary,
            description: cal.description,
            backgroundColor: cal.backgroundColor,
            foregroundColor: cal.foregroundColor,
            primary: cal.primary || false,
            accessRole: cal.accessRole,
            selected: selectedIds.includes(cal.id),
        }));
    }

    // Get events from selected calendars
    async function getEvents(
        userId: number,
        timeMin: Date,
        timeMax: Date
    ): Promise<GoogleCalendarEvent[]> {
        const accessToken = await refreshAccessToken(userId);
        const connection = await repository.getConnectionByUserId(userId);

        if (!connection || connection.selectedCalendarIds.length === 0) {
            return [];
        }

        const allEvents: GoogleCalendarEvent[] = [];

        for (const calendarId of connection.selectedCalendarIds) {
            try {
                const params = new URLSearchParams({
                    timeMin: timeMin.toISOString(),
                    timeMax: timeMax.toISOString(),
                    singleEvents: 'true',
                    orderBy: 'startTime',
                });

                const response = await fetch(
                    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
                    {
                        headers: { Authorization: `Bearer ${accessToken}` },
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    const events = data.items?.map((event: any) => ({
                        id: event.id,
                        calendarId,
                        summary: event.summary || '(Ingen titel)',
                        description: event.description,
                        location: event.location,
                        start: event.start,
                        end: event.end,
                        colorId: event.colorId,
                        backgroundColor: event.backgroundColor,
                        recurringEventId: event.recurringEventId,
                        status: event.status,
                        htmlLink: event.htmlLink,
                    })) || [];
                    allEvents.push(...events);
                }
            } catch (err) {
                console.error(`Failed to fetch events from calendar ${calendarId}:`, err);
            }
        }

        // Sort by start time
        allEvents.sort((a, b) => {
            const aTime = a.start.dateTime || a.start.date || '';
            const bTime = b.start.dateTime || b.start.date || '';
            return aTime.localeCompare(bTime);
        });

        return allEvents;
    }

    // Create an event in the family calendar
    async function createEvent(
        userId: number,
        event: CreateCalendarEventInput
    ): Promise<GoogleCalendarEvent> {
        const accessToken = await refreshAccessToken(userId);

        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(event.calendarId)}/events`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    summary: event.summary,
                    description: event.description,
                    location: event.location,
                    start: event.start,
                    end: event.end,
                    colorId: event.colorId,
                    recurrence: event.recurrence,
                }),
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to create event: ${error}`);
        }

        const created = await response.json();
        return {
            id: created.id,
            calendarId: event.calendarId,
            summary: created.summary,
            description: created.description,
            location: created.location,
            start: created.start,
            end: created.end,
            colorId: created.colorId,
            status: created.status,
            htmlLink: created.htmlLink,
        };
    }

    // Update an event
    async function updateEvent(
        userId: number,
        calendarId: string,
        eventId: string,
        event: Partial<CreateCalendarEventInput>
    ): Promise<GoogleCalendarEvent> {
        const accessToken = await refreshAccessToken(userId);

        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
            {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    summary: event.summary,
                    description: event.description,
                    location: event.location,
                    start: event.start,
                    end: event.end,
                }),
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to update event: ${error}`);
        }

        const updated = await response.json();
        return {
            id: updated.id,
            calendarId,
            summary: updated.summary,
            description: updated.description,
            location: updated.location,
            start: updated.start,
            end: updated.end,
            colorId: updated.colorId,
            status: updated.status,
            htmlLink: updated.htmlLink,
        };
    }

    // Delete an event
    async function deleteEvent(
        userId: number,
        calendarId: string,
        eventId: string
    ): Promise<void> {
        const accessToken = await refreshAccessToken(userId);

        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
            {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );

        if (!response.ok && response.status !== 404) {
            const error = await response.text();
            throw new Error(`Failed to delete event: ${error}`);
        }
    }

    return {
        getAuthUrl,
        exchangeCodeForTokens,
        refreshAccessToken,
        getCalendars,
        getEvents,
        createEvent,
        updateEvent,
        deleteEvent,
        getConnection: repository.getConnectionByUserId,
        saveConnection: repository.upsertConnection,
        updateSettings: repository.updateSettings,
        deleteConnection: repository.deleteConnection,
    };
}

export type GoogleCalendarService = ReturnType<typeof createGoogleCalendarService>;
