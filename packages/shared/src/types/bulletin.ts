// Bulletin note types

export interface BulletinNote {
    id: number;
    familyId: number;
    title: string;
    content: string | null;
    listItems: BulletinListItem[] | null;
    color: BulletinColor;
    isPinned: boolean;
    recipientId: number | null; // For private messages to a specific user
    expiresAt: string | null; // ISO date
    createdBy: number;
    createdAt: string;
    updatedAt: string;
    // Populated
    creator?: {
        id: number;
        displayName: string | null;
        avatarEmoji: string | null;
    };
    assignedTo?: {
        id: number;
        displayName: string | null;
        avatarEmoji: string | null;
    }[];
    recipient?: {
        id: number;
        displayName: string | null;
        avatarEmoji: string | null;
    };
}

export interface BulletinListItem {
    id: string; // UUID for client-side tracking
    text: string;
    isChecked: boolean;
}

export type BulletinColor = 'yellow' | 'pink' | 'blue' | 'green' | 'purple' | 'orange';

export interface CreateBulletinNoteInput {
    title: string;
    content?: string;
    listItems?: BulletinListItem[];
    color?: BulletinColor;
    isPinned?: boolean;
    recipientId?: number; // For private message to a specific user's wall
    expiresAt?: string | null;
    assignedTo?: number[]; // User IDs to notify
}

export interface UpdateBulletinNoteInput {
    title?: string;
    content?: string | null;
    listItems?: BulletinListItem[] | null;
    color?: BulletinColor;
    isPinned?: boolean;
    recipientId?: number | null;
    expiresAt?: string | null;
    assignedTo?: number[];
}
