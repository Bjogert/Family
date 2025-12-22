// Activity categories
export type ActivityCategory =
    | 'sports'
    | 'music'
    | 'school'
    | 'hobbies'
    | 'social'
    | 'medical'
    | 'other';

// Recurring patterns
export type RecurringPattern =
    | 'daily'
    | 'weekly'
    | 'biweekly'
    | 'monthly'
    | null;

export interface Activity {
    id: number;
    familyId: number;
    title: string;
    description: string | null;
    category: ActivityCategory;
    location: string | null;
    startTime: string; // ISO timestamp
    endTime: string | null; // ISO timestamp
    recurringPattern: RecurringPattern;
    transportUserId: number | null;
    createdBy: number | null;
    createdAt: string;
    updatedAt: string;
    // Populated fields
    participants?: ActivityParticipant[];
    transportUser?: { id: number; displayName: string; avatarEmoji: string | null };
}

export interface ActivityParticipant {
    id: number;
    activityId: number;
    userId: number;
    // Populated user info
    user?: {
        id: number;
        displayName: string | null;
        avatarEmoji: string | null;
        color: string | null;
    };
}

export interface CreateActivityInput {
    title: string;
    description?: string;
    category?: ActivityCategory;
    location?: string;
    startTime: string;
    endTime?: string;
    recurringPattern?: RecurringPattern;
    transportUserId?: number;
    participantIds?: number[];
}

export interface UpdateActivityInput extends Partial<CreateActivityInput> {
    id: number;
}
