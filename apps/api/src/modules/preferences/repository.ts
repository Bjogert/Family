import { pool } from '../../db/index.js';

export interface FoodPreferences {
    id: number;
    familyId: number;
    userId: number | null;
    spicy: number;
    asian: number;
    swedish: number;
    vegetarian: number;
    vegan: number;
    healthConscious: number;
    kidFriendly: number;
    quickMeals: number;
    budgetConscious: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface DietaryRestriction {
    id: number;
    familyId: number;
    userId: number | null;
    restriction: string;
    createdAt: Date;
}

export interface PreferencesInput {
    spicy?: number;
    asian?: number;
    swedish?: number;
    vegetarian?: number;
    vegan?: number;
    healthConscious?: number;
    kidFriendly?: number;
    quickMeals?: number;
    budgetConscious?: number;
}

// Get family-wide preferences (userId = null)
export async function getFamilyPreferences(familyId: number): Promise<FoodPreferences | null> {
    const result = await pool.query(
        `SELECT id, family_id as "familyId", user_id as "userId",
            spicy, asian, swedish, vegetarian, vegan,
            health_conscious as "healthConscious",
            kid_friendly as "kidFriendly",
            quick_meals as "quickMeals",
            budget_conscious as "budgetConscious",
            created_at as "createdAt", updated_at as "updatedAt"
     FROM food_preferences
     WHERE family_id = $1 AND user_id IS NULL`,
        [familyId]
    );
    return result.rows[0] || null;
}

// Get user-specific preferences
export async function getUserPreferences(familyId: number, userId: number): Promise<FoodPreferences | null> {
    const result = await pool.query(
        `SELECT id, family_id as "familyId", user_id as "userId",
            spicy, asian, swedish, vegetarian, vegan,
            health_conscious as "healthConscious",
            kid_friendly as "kidFriendly",
            quick_meals as "quickMeals",
            budget_conscious as "budgetConscious",
            created_at as "createdAt", updated_at as "updatedAt"
     FROM food_preferences
     WHERE family_id = $1 AND user_id = $2`,
        [familyId, userId]
    );
    return result.rows[0] || null;
}

// Create or update family-wide preferences
export async function upsertFamilyPreferences(
    familyId: number,
    preferences: PreferencesInput
): Promise<FoodPreferences> {
    const result = await pool.query(
        `INSERT INTO food_preferences (
      family_id, user_id, spicy, asian, swedish, vegetarian, vegan,
      health_conscious, kid_friendly, quick_meals, budget_conscious, updated_at
    ) VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    ON CONFLICT (family_id, user_id) WHERE user_id IS NULL
    DO UPDATE SET
      spicy = COALESCE($2, food_preferences.spicy),
      asian = COALESCE($3, food_preferences.asian),
      swedish = COALESCE($4, food_preferences.swedish),
      vegetarian = COALESCE($5, food_preferences.vegetarian),
      vegan = COALESCE($6, food_preferences.vegan),
      health_conscious = COALESCE($7, food_preferences.health_conscious),
      kid_friendly = COALESCE($8, food_preferences.kid_friendly),
      quick_meals = COALESCE($9, food_preferences.quick_meals),
      budget_conscious = COALESCE($10, food_preferences.budget_conscious),
      updated_at = NOW()
    RETURNING id, family_id as "familyId", user_id as "userId",
              spicy, asian, swedish, vegetarian, vegan,
              health_conscious as "healthConscious",
              kid_friendly as "kidFriendly",
              quick_meals as "quickMeals",
              budget_conscious as "budgetConscious",
              created_at as "createdAt", updated_at as "updatedAt"`,
        [
            familyId,
            preferences.spicy,
            preferences.asian,
            preferences.swedish,
            preferences.vegetarian,
            preferences.vegan,
            preferences.healthConscious,
            preferences.kidFriendly,
            preferences.quickMeals,
            preferences.budgetConscious,
        ]
    );
    return result.rows[0];
}

// Get dietary restrictions for family
export async function getFamilyRestrictions(familyId: number): Promise<DietaryRestriction[]> {
    const result = await pool.query(
        `SELECT id, family_id as "familyId", user_id as "userId",
            restriction, created_at as "createdAt"
     FROM dietary_restrictions
     WHERE family_id = $1 AND user_id IS NULL
     ORDER BY restriction`,
        [familyId]
    );
    return result.rows;
}

// Get dietary restrictions for user
export async function getUserRestrictions(familyId: number, userId: number): Promise<DietaryRestriction[]> {
    const result = await pool.query(
        `SELECT id, family_id as "familyId", user_id as "userId",
            restriction, created_at as "createdAt"
     FROM dietary_restrictions
     WHERE family_id = $1 AND user_id = $2
     ORDER BY restriction`,
        [familyId, userId]
    );
    return result.rows;
}

// Set dietary restrictions for family (replaces all)
export async function setFamilyRestrictions(familyId: number, restrictions: string[]): Promise<DietaryRestriction[]> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Delete existing family restrictions
        await client.query(
            'DELETE FROM dietary_restrictions WHERE family_id = $1 AND user_id IS NULL',
            [familyId]
        );

        // Insert new restrictions
        const results: DietaryRestriction[] = [];
        for (const restriction of restrictions) {
            const result = await client.query(
                `INSERT INTO dietary_restrictions (family_id, user_id, restriction)
         VALUES ($1, NULL, $2)
         RETURNING id, family_id as "familyId", user_id as "userId",
                   restriction, created_at as "createdAt"`,
                [familyId, restriction]
            );
            results.push(result.rows[0]);
        }

        await client.query('COMMIT');
        return results;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// Reset preferences to defaults
export async function resetFamilyPreferences(familyId: number): Promise<FoodPreferences> {
    const result = await pool.query(
        `UPDATE food_preferences SET
      spicy = 5, asian = 5, swedish = 5, vegetarian = 3, vegan = 1,
      health_conscious = 5, kid_friendly = 5, quick_meals = 5, budget_conscious = 5,
      updated_at = NOW()
     WHERE family_id = $1 AND user_id IS NULL
     RETURNING id, family_id as "familyId", user_id as "userId",
               spicy, asian, swedish, vegetarian, vegan,
               health_conscious as "healthConscious",
               kid_friendly as "kidFriendly",
               quick_meals as "quickMeals",
               budget_conscious as "budgetConscious",
               created_at as "createdAt", updated_at as "updatedAt"`,
        [familyId]
    );
    return result.rows[0];
}
