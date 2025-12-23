import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { GoogleCalendarService } from './service.js';
import type { CalendarSettings, CreateCalendarEventInput } from '@family-hub/shared/types';

export function registerGoogleCalendarRoutes(
    app: FastifyInstance,
    calendarService: GoogleCalendarService
) {
    // GET /api/calendar/google/status - Check if user has connected Google Calendar
    app.get(
        '/google/status',
        async (request: FastifyRequest, reply: FastifyReply) => {
            const userId = parseInt(request.headers['x-user-id'] as string, 10);

            if (!userId || isNaN(userId)) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }

            try {
                const connection = await calendarService.getConnection(userId);
                return reply.send({
                    connected: !!connection,
                    email: connection?.googleEmail || null,
                    familyCalendarId: connection?.familyCalendarId || null,
                    selectedCalendarIds: connection?.selectedCalendarIds || [],
                });
            } catch (error) {
                console.error('Failed to get calendar status:', error);
                return reply.status(500).send({ error: 'Failed to get calendar status' });
            }
        }
    );

    // GET /api/calendar/google/auth - Get OAuth URL
    app.get(
        '/google/auth',
        async (request: FastifyRequest, reply: FastifyReply) => {
            const userId = parseInt(request.headers['x-user-id'] as string, 10);
            const familyId = parseInt(request.headers['x-family-id'] as string, 10);

            if (!userId || isNaN(userId)) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }

            const authUrl = calendarService.getAuthUrl(userId, familyId);
            return reply.send({ authUrl });
        }
    );

    // GET /api/calendar/auth/callback - OAuth callback
    app.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
        '/auth/callback',
        async (request, reply) => {
            const { code, state, error } = request.query;

            if (error) {
                return reply.redirect('/?calendar_error=' + encodeURIComponent(error));
            }

            if (!code || !state) {
                return reply.redirect('/?calendar_error=missing_params');
            }

            try {
                const { userId, familyId } = JSON.parse(Buffer.from(state, 'base64').toString());

                const tokens = await calendarService.exchangeCodeForTokens(code);
                const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

                await calendarService.saveConnection(
                    userId,
                    tokens.email,
                    tokens.accessToken,
                    tokens.refreshToken,
                    expiresAt
                );

                // Redirect to calendar page with success
                return reply.redirect('/calendar?connected=true');
            } catch (err) {
                console.error('OAuth callback error:', err);
                return reply.redirect('/?calendar_error=auth_failed');
            }
        }
    );

    // GET /api/calendar/google/calendars - Get user's calendars
    app.get(
        '/google/calendars',
        async (request: FastifyRequest, reply: FastifyReply) => {
            const userId = parseInt(request.headers['x-user-id'] as string, 10);

            if (!userId || isNaN(userId)) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }

            try {
                const calendars = await calendarService.getCalendars(userId);
                return reply.send(calendars);
            } catch (error) {
                console.error('Failed to get calendars:', error);
                return reply.status(500).send({ error: 'Failed to get calendars' });
            }
        }
    );

    // PUT /api/calendar/google/settings - Update calendar settings
    app.put<{ Body: CalendarSettings }>(
        '/google/settings',
        async (request: FastifyRequest<{ Body: CalendarSettings }>, reply: FastifyReply) => {
            const userId = parseInt(request.headers['x-user-id'] as string, 10);

            if (!userId || isNaN(userId)) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }

            try {
                await calendarService.updateSettings(userId, request.body);
                return reply.send({ success: true });
            } catch (error) {
                console.error('Failed to update settings:', error);
                return reply.status(500).send({ error: 'Failed to update settings' });
            }
        }
    );

    // GET /api/calendar/google/events - Get events from selected calendars
    app.get<{ Querystring: { timeMin?: string; timeMax?: string } }>(
        '/google/events',
        async (request, reply) => {
            const userId = parseInt(request.headers['x-user-id'] as string, 10);

            if (!userId || isNaN(userId)) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }

            try {
                const { timeMin, timeMax } = request.query;
                const start = timeMin ? new Date(timeMin) : new Date();
                const end = timeMax
                    ? new Date(timeMax)
                    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

                const events = await calendarService.getEvents(userId, start, end);
                return reply.send(events);
            } catch (error) {
                console.error('Failed to get events:', error);
                return reply.status(500).send({ error: 'Failed to get events' });
            }
        }
    );

    // POST /api/calendar/google/events - Create an event
    app.post<{ Body: CreateCalendarEventInput }>(
        '/google/events',
        async (request: FastifyRequest<{ Body: CreateCalendarEventInput }>, reply: FastifyReply) => {
            const userId = parseInt(request.headers['x-user-id'] as string, 10);

            if (!userId || isNaN(userId)) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }

            try {
                const event = await calendarService.createEvent(userId, request.body);
                return reply.send(event);
            } catch (error) {
                console.error('Failed to create event:', error);
                return reply.status(500).send({ error: 'Failed to create event' });
            }
        }
    );

    // DELETE /api/calendar/google/events/:calendarId/:eventId - Delete an event
    app.delete<{ Params: { calendarId: string; eventId: string } }>(
        '/google/events/:calendarId/:eventId',
        async (request, reply) => {
            const userId = parseInt(request.headers['x-user-id'] as string, 10);

            if (!userId || isNaN(userId)) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }

            try {
                const { calendarId, eventId } = request.params;
                await calendarService.deleteEvent(userId, calendarId, eventId);
                return reply.send({ success: true });
            } catch (error) {
                console.error('Failed to delete event:', error);
                return reply.status(500).send({ error: 'Failed to delete event' });
            }
        }
    );

    // DELETE /api/calendar/google/disconnect - Disconnect Google Calendar
    app.delete(
        '/google/disconnect',
        async (request: FastifyRequest, reply: FastifyReply) => {
            const userId = parseInt(request.headers['x-user-id'] as string, 10);

            if (!userId || isNaN(userId)) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }

            try {
                await calendarService.deleteConnection(userId);
                return reply.send({ success: true });
            } catch (error) {
                console.error('Failed to disconnect:', error);
                return reply.status(500).send({ error: 'Failed to disconnect' });
            }
        }
    );
}
