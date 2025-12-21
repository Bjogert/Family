import { z } from 'zod';
import {
  CalendarEventSchema,
  CalendarQuerySchema,
  CalendarEventsResponseSchema,
  CalendarAuthStatusSchema,
} from '../schemas/calendar.js';

export type CalendarEvent = z.infer<typeof CalendarEventSchema>;
export type CalendarQuery = z.infer<typeof CalendarQuerySchema>;
export type CalendarEventsResponse = z.infer<typeof CalendarEventsResponseSchema>;
export type CalendarAuthStatus = z.infer<typeof CalendarAuthStatusSchema>;
