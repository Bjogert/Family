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
export async function createFamily(name: string): Promise<Family> {
    const result = await pool.query(
        `INSERT INTO families (name)
     VALUES ($1)
     RETURNING id, name, created_at as "createdAt"`,
        [name]
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
}

export async function getFamilyMembers(familyId: number): Promise<FamilyMember[]> {
    const result = await pool.query(
        `SELECT id, username, display_name as "displayName"
     FROM users
     WHERE family_id = $1
     ORDER BY display_name ASC`,
        [familyId]
    );
    return result.rows;
}
