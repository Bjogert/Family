import { pool } from '../../db/index.js';

export interface GroceryRow {
    id: number;
    family_id: number;
    name: string;
    category: string;
    quantity: number;
    unit: string | null;
    is_bought: boolean;
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

    if (fields.length === 0) {
        return findById(id, familyId);
    }

    fields.push('updated_at = NOW()');
    values.push(id, familyId);

    const result = await pool.query(
        `UPDATE groceries SET ${fields.join(', ')}
    WHERE id = $${paramIndex++} AND family_id = $${paramIndex}
    RETURNING id`,
        values
    );

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
    const result = await pool.query(
        'DELETE FROM groceries WHERE family_id = $1 AND is_bought = true',
        [familyId]
    );
    return result.rowCount ?? 0;
}

export async function getCategories(): Promise<Array<{ name: string; icon: string; sort_order: number }>> {
    const result = await pool.query(
        'SELECT name, icon, sort_order FROM grocery_categories ORDER BY sort_order'
    );
    return result.rows;
}
