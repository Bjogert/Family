import { pool } from '../../db/index.js';

export interface Family {
    id: number;
    name: string;
    createdAt: Date;
}

// Get all families
export async function getAllFamilies(): Promise<Family[]> {
    const result = await pool.query(
        `SELECT id, name, created_at as "createdAt"
     FROM families
     ORDER BY name ASC`
    );
    return result.rows;
}

// Get family by ID
export async function getFamilyById(id: number): Promise<Family | null> {
    const result = await pool.query(
        `SELECT id, name, created_at as "createdAt"
     FROM families
     WHERE id = $1`,
        [id]
    );
    return result.rows[0] || null;
}

// Get family by name
export async function getFamilyByName(name: string): Promise<Family | null> {
    const result = await pool.query(
        `SELECT id, name, created_at as "createdAt"
     FROM families
     WHERE name = $1`,
        [name]
    );
    return result.rows[0] || null;
}

// Create new family
export async function createFamily(name: string, password: string): Promise<Family> {
    const bcrypt = (await import('bcrypt')).default;
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
        `INSERT INTO families (name, password_hash)
     VALUES ($1, $2)
     RETURNING id, name, created_at as "createdAt"`,
        [name, passwordHash]
    );
    return result.rows[0];
}

// Search families by name (partial match)
export async function searchFamilies(searchTerm: string): Promise<Family[]> {
    const result = await pool.query(
        `SELECT id, name, created_at as "createdAt"
     FROM families
     WHERE name ILIKE $1
     ORDER BY name ASC`,
        [`%${searchTerm}%`]
    );
    return result.rows;
}

// Get family members
export interface FamilyMember {
    id: number;
    username: string;
    displayName: string | null;
    role?: string | null;
    birthday?: string | null;
    gender?: string | null;
    avatarEmoji?: string | null;
    color?: string | null;
    hasPassword: boolean;
}

export async function getFamilyMembers(familyId: number): Promise<FamilyMember[]> {
    const result = await pool.query(
        `SELECT id, username, display_name as "displayName",
         role, birthday, gender, avatar_emoji as "avatarEmoji", color,
         (password_hash IS NOT NULL AND password_hash != '') as "hasPassword"
     FROM users
     WHERE family_id = $1
     ORDER BY display_name ASC`,
        [familyId]
    );
    return result.rows;
}

// Create family member
export async function createFamilyMember(
    familyId: number,
    username: string,
    password?: string,
    displayName?: string,
    role?: string,
    birthday?: string,
    gender?: string,
    avatarEmoji?: string,
    color?: string
): Promise<FamilyMember> {
    // Check if user already exists in this family
    const existingUser = await pool.query(
        'SELECT id FROM users WHERE family_id = $1 AND username = $2',
        [familyId, username]
    );

    if (existingUser.rows.length > 0) {
        throw new Error(`User with username "${username}" already exists in this family`);
    }

    // Hash password if provided, otherwise set to null
    let passwordHash: string | null = null;
    if (password && password.trim()) {
        const bcrypt = (await import('bcrypt')).default;
        passwordHash = await bcrypt.hash(password, 10);
    }

    const result = await pool.query(
        `INSERT INTO users (family_id, username, password_hash, display_name, role, birthday, gender, avatar_emoji, color)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, username, display_name as "displayName", role, birthday, gender, 
               avatar_emoji as "avatarEmoji", color,
               (password_hash IS NOT NULL AND password_hash != '') as "hasPassword"`,
        [familyId, username, passwordHash, displayName || username, role, birthday, gender, avatarEmoji, color]
    );

    return result.rows[0];
}

// Verify family password
export async function verifyFamilyPassword(familyId: number, password: string): Promise<boolean> {
    const result = await pool.query(
        'SELECT password_hash FROM families WHERE id = $1',
        [familyId]
    );

    if (result.rows.length === 0) {
        return false;
    }

    const bcrypt = (await import('bcrypt')).default;
    return bcrypt.compare(password, result.rows[0].password_hash);
}

// Update family password
export async function updateFamilyPassword(familyId: number, newPassword: string): Promise<boolean> {
    const bcrypt = (await import('bcrypt')).default;
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const result = await pool.query(
        'UPDATE families SET password_hash = $1 WHERE id = $2',
        [passwordHash, familyId]
    );

    return (result.rowCount ?? 0) > 0;
}
