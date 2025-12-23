// Google Calendar integration types

export interface GoogleCalendarConnection {
  id: number;
  userId: number;
  googleEmail: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: string;
  selectedCalendarIds: string[];
  familyCalendarId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  primary?: boolean;
  accessRole: 'owner' | 'writer' | 'reader' | 'freeBusyReader';
  selected?: boolean;
}

export interface GoogleCalendarEvent {
  id: string;
  calendarId: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  colorId?: string;
  backgroundColor?: string;
  recurringEventId?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  htmlLink?: string;
}

export interface CreateCalendarEventInput {
  calendarId: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  colorId?: string;
  recurrence?: string[];
}

export interface CalendarSettings {
  selectedCalendarIds: string[];
  familyCalendarId: string | null;
}
