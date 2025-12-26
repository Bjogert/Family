import {
    getFamilyPreferences,
    getFamilyRestrictions,
    upsertFamilyPreferences,
    setFamilyRestrictions,
    resetFamilyPreferences,
    type FoodPreferences,
    type DietaryRestriction,
    type PreferencesInput,
} from './repository.js';

export interface PreferencesResponse {
    preferences: FoodPreferences;
    restrictions: DietaryRestriction[];
}

export interface UpdatePreferencesInput {
    preferences?: PreferencesInput;
    restrictions?: string[];
}

// Get all preferences and restrictions for a family
export async function getPreferences(familyId: number): Promise<PreferencesResponse> {
    let preferences = await getFamilyPreferences(familyId);

    // If no preferences exist, create defaults
    if (!preferences) {
        preferences = await upsertFamilyPreferences(familyId, {
            spicy: 5,
            asian: 5,
            swedish: 5,
            vegetarian: 3,
            vegan: 1,
            healthConscious: 5,
            kidFriendly: 5,
            quickMeals: 5,
            budgetConscious: 5,
        });
    }

    const restrictions = await getFamilyRestrictions(familyId);

    return { preferences, restrictions };
}

// Update preferences and/or restrictions
export async function updatePreferences(
    familyId: number,
    input: UpdatePreferencesInput
): Promise<PreferencesResponse> {
    let preferences: FoodPreferences;
    let restrictions: DietaryRestriction[];

    if (input.preferences) {
        preferences = await upsertFamilyPreferences(familyId, input.preferences);
    } else {
        const existing = await getFamilyPreferences(familyId);
        if (!existing) {
            preferences = await upsertFamilyPreferences(familyId, {});
        } else {
            preferences = existing;
        }
    }

    if (input.restrictions !== undefined) {
        restrictions = await setFamilyRestrictions(familyId, input.restrictions);
    } else {
        restrictions = await getFamilyRestrictions(familyId);
    }

    return { preferences, restrictions };
}

// Reset preferences to defaults
export async function resetPreferences(familyId: number): Promise<PreferencesResponse> {
    // First ensure preferences exist
    await upsertFamilyPreferences(familyId, {});

    const preferences = await resetFamilyPreferences(familyId);
    const restrictions = await setFamilyRestrictions(familyId, []);

    return { preferences, restrictions };
}

// Predefined list of common dietary restrictions
export const DIETARY_RESTRICTIONS = [
    { id: 'lactose', label: 'Laktos', labelEn: 'Lactose' },
    { id: 'gluten', label: 'Gluten', labelEn: 'Gluten' },
    { id: 'nuts', label: 'Nötter', labelEn: 'Nuts' },
    { id: 'peanuts', label: 'Jordnötter', labelEn: 'Peanuts' },
    { id: 'eggs', label: 'Ägg', labelEn: 'Eggs' },
    { id: 'fish', label: 'Fisk', labelEn: 'Fish' },
    { id: 'shellfish', label: 'Skaldjur', labelEn: 'Shellfish' },
    { id: 'soy', label: 'Soja', labelEn: 'Soy' },
    { id: 'sesame', label: 'Sesam', labelEn: 'Sesame' },
    { id: 'celery', label: 'Selleri', labelEn: 'Celery' },
    { id: 'mustard', label: 'Senap', labelEn: 'Mustard' },
    { id: 'sulfites', label: 'Sulfiter', labelEn: 'Sulfites' },
];
