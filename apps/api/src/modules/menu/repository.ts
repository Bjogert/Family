import { pool } from '../../db/index.js';

export interface Meal {
    day: number; // 1-7 (Mon-Sun)
    dayName: string;
    name: string;
    nameEn: string;
    ingredients: string[];
    cookingTime: number; // minutes
    difficulty: 'easy' | 'medium' | 'hard';
    servings: number;
}

export interface WeeklyMenu {
    id: number;
    familyId: number;
    weekStart: Date;
    meals: Meal[];
    createdBy: number | null;
    createdAt: Date;
    updatedAt: Date;
}

// Get current week's start date (Monday)
export function getWeekStart(date: Date = new Date()): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Get menu for a specific week
export async function getMenuByWeek(
    familyId: number,
    weekStart: Date
): Promise<WeeklyMenu | null> {
    const result = await pool.query(
        `SELECT id, family_id, week_start, meals, created_by, created_at, updated_at
     FROM weekly_menus
     WHERE family_id = $1 AND week_start = $2`,
        [familyId, weekStart]
    );

    if (result.rows.length === 0) {
        return null;
    }

    const row = result.rows[0];
    return {
        id: row.id,
        familyId: row.family_id,
        weekStart: row.week_start,
        meals: row.meals,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// Get current week's menu
export async function getCurrentMenu(familyId: number): Promise<WeeklyMenu | null> {
    const weekStart = getWeekStart();
    return getMenuByWeek(familyId, weekStart);
}

// Save or update menu for a week
export async function saveMenu(
    familyId: number,
    weekStart: Date,
    meals: Meal[],
    createdBy?: number
): Promise<WeeklyMenu> {
    const result = await pool.query(
        `INSERT INTO weekly_menus (family_id, week_start, meals, created_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (family_id, week_start)
     DO UPDATE SET meals = $3, updated_at = NOW()
     RETURNING id, family_id, week_start, meals, created_by, created_at, updated_at`,
        [familyId, weekStart, JSON.stringify(meals), createdBy || null]
    );

    const row = result.rows[0];
    return {
        id: row.id,
        familyId: row.family_id,
        weekStart: row.week_start,
        meals: row.meals,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// Update a single meal in the menu
export async function updateMeal(
    familyId: number,
    weekStart: Date,
    dayIndex: number,
    meal: Meal
): Promise<WeeklyMenu | null> {
    const menu = await getMenuByWeek(familyId, weekStart);
    if (!menu) {
        return null;
    }

    const meals = [...menu.meals];
    const existingIndex = meals.findIndex((m) => m.day === dayIndex);
    if (existingIndex >= 0) {
        meals[existingIndex] = meal;
    } else {
        meals.push(meal);
    }

    return saveMenu(familyId, weekStart, meals);
}

// Get menu history (last N weeks)
export async function getMenuHistory(
    familyId: number,
    limit: number = 4
): Promise<WeeklyMenu[]> {
    const result = await pool.query(
        `SELECT id, family_id, week_start, meals, created_by, created_at, updated_at
     FROM weekly_menus
     WHERE family_id = $1
     ORDER BY week_start DESC
     LIMIT $2`,
        [familyId, limit]
    );

    return result.rows.map((row) => ({
        id: row.id,
        familyId: row.family_id,
        weekStart: row.week_start,
        meals: row.meals,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }));
}

// Delete menu for a week
export async function deleteMenu(familyId: number, weekStart: Date): Promise<boolean> {
    const result = await pool.query(
        `DELETE FROM weekly_menus WHERE family_id = $1 AND week_start = $2`,
        [familyId, weekStart]
    );
    return (result.rowCount ?? 0) > 0;
}
