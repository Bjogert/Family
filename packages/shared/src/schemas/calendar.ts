import { z } from 'zod';

// Calendar event
export const CalendarEventSchema = z.object({
  id: z.string(),
  calendarId: z.string(),
  summary: z.string().nullable(),
  description: z.string().nullable(),
  startTime: z.string(), // ISO 8601
  endTime: z.string(),
  allDay: z.boolean(),
  location: z.string().nullable(),
  color: z.string().nullable(),
});

// Query params for fetching events
export const CalendarQuerySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
});

// Events response
export const CalendarEventsResponseSchema = z.object({
  events: z.array(CalendarEventSchema),
  lastSynced: z.string().nullable(),
});

// Auth status for Google Calendar
export const CalendarAuthStatusSchema = z.object({
  connected: z.boolean(),
  email: z.string().optional(),
  expiresAt: z.string().optional(),
});
