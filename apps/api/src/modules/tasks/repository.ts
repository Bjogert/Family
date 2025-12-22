import { pool } from '../../db/index.js';

export interface TaskRow {
    id: number;
    family_id: number;
    title: string;
    description: string | null;
    category: string;
    difficulty: string;
    points: number;
    assigned_to: number | null;
    due_date: string | null;
    due_time: string | null;
    recurring_pattern: string | null;
    status: string;
    completed_at: Date | null;
    verified_by: number | null;
    verified_at: Date | null;
    created_by: number | null;
    created_at: Date;
    updated_at: Date;
    // Joined fields
    assignee_name?: string | null;
    assignee_emoji?: string | null;
    assignee_color?: string | null;
    creator_name?: string | null;
    verifier_name?: string | null;
}

export interface CreateTaskData {
    familyId: number;
    title: string;
    description?: string;
    category?: string;
    difficulty?: string;
    points?: number;
    assignedTo?: number;
    dueDate?: string;
    dueTime?: string;
    recurringPattern?: string;
    createdBy?: number;
}

export interface UpdateTaskData {
    title?: string;
    description?: string | null;
    category?: string;
    difficulty?: string;
    points?: number;
    assignedTo?: number | null;
    dueDate?: string | null;
    dueTime?: string | null;
    recurringPattern?: string | null;
    status?: string;
}

const SELECT_TASK = `
  SELECT t.id, t.family_id, t.title, t.description, t.category, t.difficulty,
         t.points, t.assigned_to, t.due_date, t.due_time, t.recurring_pattern,
         t.status, t.completed_at, t.verified_by, t.verified_at, t.created_by,
         t.created_at, t.updated_at,
         ua.display_name as assignee_name, ua.avatar_emoji as assignee_emoji, ua.color as assignee_color,
         uc.display_name as creator_name,
         uv.display_name as verifier_name
  FROM tasks t
  LEFT JOIN users ua ON t.assigned_to = ua.id
  LEFT JOIN users uc ON t.created_by = uc.id
  LEFT JOIN users uv ON t.verified_by = uv.id
`;

export async function findAllByFamily(familyId: number): Promise<TaskRow[]> {
    const result = await pool.query<TaskRow>(
        `${SELECT_TASK}
     WHERE t.family_id = $1
     ORDER BY 
       CASE t.status 
         WHEN 'open' THEN 1 
         WHEN 'in_progress' THEN 2 
         WHEN 'done' THEN 3 
         WHEN 'verified' THEN 4 
       END,
       t.due_date ASC NULLS LAST,
       t.created_at DESC`,
        [familyId]
    );
    return result.rows;
}

export async function findById(id: number, familyId: number): Promise<TaskRow | null> {
    const result = await pool.query<TaskRow>(
        `${SELECT_TASK}
     WHERE t.id = $1 AND t.family_id = $2`,
        [id, familyId]
    );
    return result.rows[0] || null;
}

export async function create(data: CreateTaskData): Promise<TaskRow> {
    const result = await pool.query<TaskRow>(
        `INSERT INTO tasks (family_id, title, description, category, difficulty, points,
                        assigned_to, due_date, due_time, recurring_pattern, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
        [
            data.familyId,
            data.title,
            data.description || null,
            data.category || 'other',
            data.difficulty || 'medium',
            data.points || 0,
            data.assignedTo || null,
            data.dueDate || null,
            data.dueTime || null,
            data.recurringPattern || null,
            data.createdBy || null
        ]
    );
    return result.rows[0];
}

export async function update(id: number, familyId: number, data: UpdateTaskData): Promise<TaskRow | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (data.title !== undefined) {
        fields.push(`title = $${paramCount++}`);
        values.push(data.title);
    }
    if (data.description !== undefined) {
        fields.push(`description = $${paramCount++}`);
        values.push(data.description);
    }
    if (data.category !== undefined) {
        fields.push(`category = $${paramCount++}`);
        values.push(data.category);
    }
    if (data.difficulty !== undefined) {
        fields.push(`difficulty = $${paramCount++}`);
        values.push(data.difficulty);
    }
    if (data.points !== undefined) {
        fields.push(`points = $${paramCount++}`);
        values.push(data.points);
    }
    if (data.assignedTo !== undefined) {
        fields.push(`assigned_to = $${paramCount++}`);
        values.push(data.assignedTo);
    }
    if (data.dueDate !== undefined) {
        fields.push(`due_date = $${paramCount++}`);
        values.push(data.dueDate);
    }
    if (data.dueTime !== undefined) {
        fields.push(`due_time = $${paramCount++}`);
        values.push(data.dueTime);
    }
    if (data.recurringPattern !== undefined) {
        fields.push(`recurring_pattern = $${paramCount++}`);
        values.push(data.recurringPattern);
    }
    if (data.status !== undefined) {
        fields.push(`status = $${paramCount++}`);
        values.push(data.status);

        // Set completed_at when status changes to done
        if (data.status === 'done') {
            fields.push(`completed_at = NOW()`);
        } else if (data.status === 'open' || data.status === 'in_progress') {
            fields.push(`completed_at = NULL`);
        }
    }

    if (fields.length === 0) return findById(id, familyId);

    fields.push(`updated_at = NOW()`);
    values.push(id, familyId);

    const result = await pool.query<TaskRow>(
        `UPDATE tasks SET ${fields.join(', ')}
     WHERE id = $${paramCount++} AND family_id = $${paramCount}
     RETURNING *`,
        values
    );
    return result.rows[0] || null;
}

export async function verifyTask(id: number, familyId: number, verifiedBy: number): Promise<TaskRow | null> {
    const result = await pool.query<TaskRow>(
        `UPDATE tasks 
     SET status = 'verified', verified_by = $3, verified_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND family_id = $2 AND status = 'done'
     RETURNING *`,
        [id, familyId, verifiedBy]
    );
    return result.rows[0] || null;
}

export async function remove(id: number, familyId: number): Promise<boolean> {
    const result = await pool.query(
        `DELETE FROM tasks WHERE id = $1 AND family_id = $2`,
        [id, familyId]
    );
    return (result.rowCount ?? 0) > 0;
}

export async function findByAssignee(familyId: number, userId: number): Promise<TaskRow[]> {
    const result = await pool.query<TaskRow>(
        `${SELECT_TASK}
     WHERE t.family_id = $1 AND t.assigned_to = $2
     ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC`,
        [familyId, userId]
    );
    return result.rows;
}
