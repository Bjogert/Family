// Task categories
export type TaskCategory =
    | 'cleaning'
    | 'outdoor'
    | 'pets'
    | 'kitchen'
    | 'laundry'
    | 'shopping'
    | 'other';

// Task difficulty levels
export type TaskDifficulty = 'easy' | 'medium' | 'hard';

// Task status
export type TaskStatus = 'open' | 'in_progress' | 'done' | 'verified';

// Recurring patterns (same as activity)
export type TaskRecurringPattern =
    | 'daily'
    | 'weekly'
    | 'biweekly'
    | 'monthly'
    | null;

export interface Task {
    id: number;
    familyId: number;
    title: string;
    description: string | null;
    category: TaskCategory;
    difficulty: TaskDifficulty;
    points: number;
    assignedTo: number | null;
    dueDate: string | null; // ISO date (YYYY-MM-DD)
    dueTime: string | null; // Time (HH:MM)
    recurringPattern: TaskRecurringPattern;
    status: TaskStatus;
    requiresValidation: boolean; // If true, parent must approve before points awarded
    completedAt: string | null;
    verifiedBy: number | null;
    verifiedAt: string | null;
    createdBy: number | null;
    createdAt: string;
    updatedAt: string;
    reminderMinutes: number | null; // Minutes before due to send reminder
    // Populated fields
    assignee?: {
        id: number;
        displayName: string | null;
        avatarEmoji: string | null;
        color: string | null;
    };
    creator?: {
        id: number;
        displayName: string | null;
    };
    verifier?: {
        id: number;
        displayName: string | null;
    };
}

export interface CreateTaskInput {
    title: string;
    description?: string;
    category?: TaskCategory;
    difficulty?: TaskDifficulty;
    points?: number;
    assignedTo?: number;
    dueDate?: string;
    dueTime?: string;
    recurringPattern?: TaskRecurringPattern;
    reminderMinutes?: number;
    requiresValidation?: boolean;
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
    id: number;
    status?: TaskStatus;
}
