import { pool } from '../../db/index.js';

export interface GroceryRow {
    id: number;
    family_id: number;
    name: string;
    category: string;
    quantity: number;
    unit: string | null;
    is_bought: boolean;
    is_favorite: boolean;
    added_by: number | null;
    added_by_name: string | null;
    bought_by: number | null;
    bought_by_name: string | null;
    created_at: Date;
    updated_at: Date;
    bought_at: Date | null;
}

export interface CreateGroceryData {
    familyId: number;
    name: string;
    category?: string;
    quantity?: number;
    unit?: string;
    addedBy?: number;
}

export interface UpdateGroceryData {
    name?: string;
    category?: string;
    quantity?: number;
    unit?: string | null;
    isBought?: boolean;
    isFavorite?: boolean;
    boughtBy?: number | null;
}

export async function findAllByFamily(familyId: number): Promise<GroceryRow[]> {
    const result = await pool.query<GroceryRow>(
        `SELECT 
      g.id,
      g.family_id,
      g.name,
      g.category,
      g.quantity,
      g.unit,
      g.is_bought,
      g.is_favorite,
      g.added_by,
      ua.display_name as added_by_name,
      g.bought_by,
      ub.display_name as bought_by_name,
      g.created_at,
      g.updated_at,
      g.bought_at
    FROM groceries g
    LEFT JOIN users ua ON g.added_by = ua.id
    LEFT JOIN users ub ON g.bought_by = ub.id
    WHERE g.family_id = $1
    ORDER BY g.is_bought ASC, g.created_at DESC`,
        [familyId]
    );
    return result.rows;
}

export async function findById(id: number, familyId: number): Promise<GroceryRow | null> {
    const result = await pool.query<GroceryRow>(
        `SELECT 
      g.id,
      g.family_id,
      g.name,
      g.category,
      g.quantity,
      g.unit,
      g.is_bought,
      g.is_favorite,
      g.added_by,
      ua.display_name as added_by_name,
      g.bought_by,
      ub.display_name as bought_by_name,
      g.created_at,
      g.updated_at,
      g.bought_at
    FROM groceries g
    LEFT JOIN users ua ON g.added_by = ua.id
    LEFT JOIN users ub ON g.bought_by = ub.id
    WHERE g.id = $1 AND g.family_id = $2`,
        [id, familyId]
    );
    return result.rows[0] || null;
}

export async function create(data: CreateGroceryData): Promise<GroceryRow> {
    const result = await pool.query<GroceryRow>(
        `INSERT INTO groceries (family_id, name, category, quantity, unit, added_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
        [
            data.familyId,
            data.name,
            data.category || 'other',
            data.quantity || 1,
            data.unit || null,
            data.addedBy || null,
        ]
    );

    // Fetch with user names
    return findById(result.rows[0].id, data.familyId) as Promise<GroceryRow>;
}

export async function update(
    id: number,
    familyId: number,
    data: UpdateGroceryData
): Promise<GroceryRow | null> {
    const fields: string[] = [];
    const values: (string | number | boolean | null)[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
        fields.push(`name = $${paramIndex++}`);
        values.push(data.name);
    }
    if (data.category !== undefined) {
        fields.push(`category = $${paramIndex++}`);
        values.push(data.category);
    }
    if (data.quantity !== undefined) {
        fields.push(`quantity = $${paramIndex++}`);
        values.push(data.quantity);
    }
    if (data.unit !== undefined) {
        fields.push(`unit = $${paramIndex++}`);
        values.push(data.unit);
    }
    if (data.isBought !== undefined) {
        fields.push(`is_bought = $${paramIndex++}`);
        values.push(data.isBought);

        if (data.isBought) {
            fields.push(`bought_at = NOW()`);
            if (data.boughtBy !== undefined) {
                fields.push(`bought_by = $${paramIndex++}`);
                values.push(data.boughtBy);
            }
        } else {
            fields.push(`bought_at = NULL`);
            fields.push(`bought_by = NULL`);
        }
    }
    if (data.isFavorite !== undefined) {
        fields.push(`is_favorite = $${paramIndex++}`);
        values.push(data.isFavorite);
    }

    if (fields.length === 0) {
        return findById(id, familyId);
    }

    fields.push('updated_at = NOW()');
    values.push(id, familyId);

    const query = `UPDATE groceries SET ${fields.join(', ')}
    WHERE id = $${paramIndex++} AND family_id = $${paramIndex}
    RETURNING id`;
    
    console.log('UPDATE query:', query);
    console.log('UPDATE values:', values);
    console.log('UPDATE paramIndex after:', paramIndex);

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        return null;
    }

    return findById(id, familyId);
}

export async function remove(id: number, familyId: number): Promise<boolean> {
    const result = await pool.query(
        'DELETE FROM groceries WHERE id = $1 AND family_id = $2',
        [id, familyId]
    );
    return (result.rowCount ?? 0) > 0;
}

export async function clearBought(familyId: number): Promise<number> {
    // Delete bought items that are NOT favorites
    const deleteResult = await pool.query(
        'DELETE FROM groceries WHERE family_id = $1 AND is_bought = true AND is_favorite = false',
        [familyId]
    );

    // Reset bought status for favorites (keep them in DB as "staples")
    await pool.query(
        'UPDATE groceries SET is_bought = false, bought_by = NULL, bought_at = NULL WHERE family_id = $1 AND is_bought = true AND is_favorite = true',
        [familyId]
    );

    return deleteResult.rowCount ?? 0;
}

// Get all favorite items for the family (for "Basvaror" feature)
export async function getFavorites(familyId: number): Promise<GroceryRow[]> {
    const result = await pool.query<GroceryRow>(
        `SELECT 
      g.id,
      g.family_id,
      g.name,
      g.category,
      g.quantity,
      g.unit,
      g.is_bought,
      g.is_favorite,
      g.added_by,
      u_added.display_name as added_by_name,
      g.bought_by,
      u_bought.display_name as bought_by_name,
      g.created_at,
      g.updated_at,
      g.bought_at
    FROM groceries g
    LEFT JOIN users u_added ON g.added_by = u_added.id
    LEFT JOIN users u_bought ON g.bought_by = u_bought.id
    WHERE g.family_id = $1 AND g.is_favorite = true
    ORDER BY g.category, g.name`,
        [familyId]
    );
    return result.rows;
}

export async function getCategories(): Promise<Array<{ name: string; icon: string; sort_order: number }>> {
    const result = await pool.query(
        'SELECT name, icon, sort_order FROM grocery_categories ORDER BY sort_order'
    );
    return result.rows;
}

// Grocery assignments
export interface GroceryAssignment {
    id: number;
    family_id: number;
    user_id: number;
    assigned_by: number | null;
    created_at: Date;
    user_display_name: string | null;
    user_avatar_emoji: string | null;
    user_color: string | null;
}

export async function getAssignments(familyId: number): Promise<GroceryAssignment[]> {
    const result = await pool.query<GroceryAssignment>(
        `SELECT 
            ga.id, ga.family_id, ga.user_id, ga.assigned_by, ga.created_at,
            u.display_name as user_display_name,
            u.avatar_emoji as user_avatar_emoji,
            u.color as user_color
        FROM grocery_assignments ga
        JOIN users u ON ga.user_id = u.id
        WHERE ga.family_id = $1
        ORDER BY ga.created_at DESC`,
        [familyId]
    );
    return result.rows;
}

export async function addAssignment(familyId: number, userId: number, assignedBy: number): Promise<GroceryAssignment | null> {
    const result = await pool.query(
        `INSERT INTO grocery_assignments (family_id, user_id, assigned_by)
        VALUES ($1, $2, $3)
        ON CONFLICT (family_id, user_id) DO NOTHING
        RETURNING id`,
        [familyId, userId, assignedBy]
    );

    if (result.rows.length === 0) {
        return null; // Already assigned
    }

    const assignments = await getAssignments(familyId);
    return assignments.find(a => a.user_id === userId) || null;
}

export async function removeAssignment(familyId: number, userId: number): Promise<boolean> {
    const result = await pool.query(
        'DELETE FROM grocery_assignments WHERE family_id = $1 AND user_id = $2',
        [familyId, userId]
    );
    return (result.rowCount ?? 0) > 0;
}

export async function clearAssignments(familyId: number): Promise<number> {
    const result = await pool.query(
        'DELETE FROM grocery_assignments WHERE family_id = $1',
        [familyId]
    );
    return result.rowCount ?? 0;
}
