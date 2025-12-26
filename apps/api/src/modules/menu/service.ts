import OpenAI from 'openai';
import { config } from '../../config.js';
import { logger } from '../../utils/logger.js';
import { getPreferences } from '../preferences/service.js';
import {
    getCurrentMenu,
    saveMenu,
    getWeekStart,
    type Meal,
    type WeeklyMenu,
} from './repository.js';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: config.openai.apiKey,
});

// Day names in Swedish
const DAY_NAMES_SV = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];
const DAY_NAMES_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Map restriction IDs to Swedish descriptions
const RESTRICTION_LABELS: Record<string, string> = {
    lactose: 'laktosfri',
    gluten: 'glutenfri',
    nuts: 'nötfri',
    peanuts: 'jordnötsfri',
    eggs: 'äggfri',
    fish: 'fiskfri',
    shellfish: 'skaldjursfri',
    soy: 'sojafri',
    sesame: 'sesamfri',
    celery: 'sellerifri',
    mustard: 'senapsfri',
    sulfites: 'sulfitfri',
};

interface GenerateMenuOptions {
    familyId: number;
    userId?: number;
    weekStart?: Date;
    regenerate?: boolean;
}

interface RegenerateDaysOptions {
    familyId: number;
    userId?: number;
    days: number[];
}

// Build the AI prompt based on preferences
function buildPrompt(
    preferences: {
        spicy: number;
        asian: number;
        swedish: number;
        vegetarian: number;
        vegan: number;
        healthConscious: number;
        kidFriendly: number;
        quickMeals: number;
        budgetConscious: number;
    },
    restrictions: string[]
): string {
    const restrictionLabels = restrictions
        .map((r) => RESTRICTION_LABELS[r] || r)
        .join(', ');

    return `Du är en måltidsplanerare för en svensk familj. Skapa en veckomeny med middagar för 7 dagar (måndag till söndag).

Familjens preferenser (skala 1-10, där 10 är stark preferens):
- Kryddig mat: ${preferences.spicy}/10
- Asiatisk mat: ${preferences.asian}/10
- Svensk husmanskost: ${preferences.swedish}/10
- Vegetariskt: ${preferences.vegetarian}/10
- Veganskt: ${preferences.vegan}/10
- Hälsosamt: ${preferences.healthConscious}/10
- Barnvänligt: ${preferences.kidFriendly}/10
- Snabba måltider (<30 min): ${preferences.quickMeals}/10
- Budgetvänligt: ${preferences.budgetConscious}/10

${restrictions.length > 0 ? `Kostrestriktioner (MÅSTE respekteras): ${restrictionLabels}` : 'Inga kostrestriktioner.'}

Regler:
1. Skapa 7 unika middagsrätter, en för varje dag
2. Återanvänd ingredienser mellan rätter när det är möjligt för att minska matsvinn
3. Variera mellan olika proteintyper och matlagningsmetoder
4. Respektera preferenserna - högre värden betyder starkare preferens
5. Respektera ALLA kostrestriktioner strikt

Svara ENDAST med giltig JSON i följande format (ingen annan text):
{
  "meals": [
    {
      "day": 1,
      "name": "Rättens namn på svenska",
      "nameEn": "Dish name in English",
      "ingredients": ["ingrediens1", "ingrediens2", "ingrediens3"],
      "cookingTime": 30,
      "difficulty": "easy",
      "servings": 4
    }
  ]
}

Difficulty ska vara "easy", "medium" eller "hard".
cookingTime är i minuter.
day är 1-7 där 1=måndag, 7=söndag.`;
}

// Parse AI response to meals array
function parseAIResponse(content: string): Meal[] {
    try {
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*"meals"[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No valid JSON found in response');
        }

        const parsed = JSON.parse(jsonMatch[0]);
        const meals: Meal[] = [];

        for (const meal of parsed.meals) {
            meals.push({
                day: meal.day,
                dayName: DAY_NAMES_SV[meal.day - 1] || `Dag ${meal.day}`,
                name: meal.name,
                nameEn: meal.nameEn || meal.name,
                ingredients: meal.ingredients || [],
                cookingTime: meal.cookingTime || 30,
                difficulty: meal.difficulty || 'medium',
                servings: meal.servings || 4,
            });
        }

        // Sort by day
        meals.sort((a, b) => a.day - b.day);

        return meals;
    } catch (error) {
        logger.error('Failed to parse AI response', { error: (error as Error).message, content });
        throw new Error('Failed to parse menu from AI response');
    }
}

// Generate a new menu using AI
export async function generateMenu(options: GenerateMenuOptions): Promise<WeeklyMenu> {
    const { familyId, userId, weekStart = getWeekStart(), regenerate = false } = options;

    // Check if we already have a menu for this week
    if (!regenerate) {
        const existingMenu = await getCurrentMenu(familyId);
        if (existingMenu) {
            return existingMenu;
        }
    }

    // Check for OpenAI API key
    if (!config.openai.apiKey) {
        throw new Error('OpenAI API key is not configured');
    }

    // Get family preferences
    const { preferences, restrictions } = await getPreferences(familyId);

    // Build prompt
    const prompt = buildPrompt(
        {
            spicy: preferences.spicy,
            asian: preferences.asian,
            swedish: preferences.swedish,
            vegetarian: preferences.vegetarian,
            vegan: preferences.vegan,
            healthConscious: preferences.healthConscious,
            kidFriendly: preferences.kidFriendly,
            quickMeals: preferences.quickMeals,
            budgetConscious: preferences.budgetConscious,
        },
        restrictions.map((r) => r.restriction)
    );

    logger.info('Generating menu with OpenAI', { familyId, weekStart });

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Du är en hjälpsam måltidsplanerare som skapar veckomenyförslag för svenska familjer. Svara alltid med giltig JSON.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.8,
            max_tokens: 2000,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No content in AI response');
        }

        const meals = parseAIResponse(content);

        // Ensure we have 7 meals
        if (meals.length < 7) {
            logger.warn('AI returned fewer than 7 meals', { count: meals.length });
        }

        // Save the menu
        const menu = await saveMenu(familyId, weekStart, meals, userId);

        logger.info('Menu generated successfully', { familyId, mealCount: meals.length });

        return menu;
    } catch (error) {
        logger.error('OpenAI API error', { error: (error as Error).message });
        throw error;
    }
}

// Regenerate specific days in an existing menu
export async function regenerateDays(options: RegenerateDaysOptions): Promise<WeeklyMenu> {
    const { familyId, userId, days } = options;
    const weekStart = getWeekStart();

    // Get existing menu
    const existingMenu = await getCurrentMenu(familyId);
    if (!existingMenu) {
        throw new Error('No existing menu to regenerate');
    }

    // Check for OpenAI API key
    if (!config.openai.apiKey) {
        throw new Error('OpenAI API key is not configured');
    }

    // Get family preferences
    const { preferences, restrictions } = await getPreferences(familyId);

    // Get existing meals for context
    const existingMeals = existingMenu.meals.filter(m => !days.includes(m.day));
    const existingMealNames = existingMeals.map(m => m.name).join(', ');

    const restrictionLabels = restrictions
        .map((r) => RESTRICTION_LABELS[r.restriction] || r.restriction)
        .join(', ');

    const daysToRegenerate = days.map(d => DAY_NAMES_SV[d - 1]).join(', ');

    const prompt = `Du är en måltidsplanerare för en svensk familj. Skapa NYA middagsrätter för följande dagar: ${daysToRegenerate}.

Familjens preferenser (skala 1-10, där 10 är stark preferens):
- Kryddig mat: ${preferences.spicy}/10
- Asiatisk mat: ${preferences.asian}/10
- Svensk husmanskost: ${preferences.swedish}/10
- Vegetariskt: ${preferences.vegetarian}/10
- Veganskt: ${preferences.vegan}/10
- Hälsosamt: ${preferences.healthConscious}/10
- Barnvänligt: ${preferences.kidFriendly}/10
- Snabba måltider (<30 min): ${preferences.quickMeals}/10
- Budgetvänligt: ${preferences.budgetConscious}/10

${restrictions.length > 0 ? `Kostrestriktioner (MÅSTE respekteras): ${restrictionLabels}` : 'Inga kostrestriktioner.'}

${existingMealNames ? `Andra rätter denna vecka (undvik liknande): ${existingMealNames}` : ''}

Regler:
1. Skapa ENDAST rätter för de angivna dagarna
2. Gör rätterna ANNORLUNDA från de existerande veckans rätter
3. Respektera preferenserna och kostrestriktionerna

Svara ENDAST med giltig JSON i följande format (ingen annan text):
{
  "meals": [
    {
      "day": 1,
      "name": "Rättens namn på svenska",
      "nameEn": "Dish name in English",
      "ingredients": ["ingrediens1", "ingrediens2", "ingrediens3"],
      "cookingTime": 30,
      "difficulty": "easy",
      "servings": 4
    }
  ]
}

day ska vara ${days.join(' eller ')}.
Difficulty ska vara "easy", "medium" eller "hard".`;

    logger.info('Regenerating specific days with OpenAI', { familyId, days });

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Du är en hjälpsam måltidsplanerare som skapar veckomenyförslag för svenska familjer. Svara alltid med giltig JSON.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.9, // Higher temp for more variety
            max_tokens: 1000,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No content in AI response');
        }

        const newMeals = parseAIResponse(content);

        // Merge new meals with existing ones
        const mergedMeals = [...existingMeals];
        for (const newMeal of newMeals) {
            newMeal.dayName = DAY_NAMES_SV[newMeal.day - 1] || `Dag ${newMeal.day}`;
            mergedMeals.push(newMeal);
        }

        // Sort by day
        mergedMeals.sort((a, b) => a.day - b.day);

        // Save the menu
        const menu = await saveMenu(familyId, weekStart, mergedMeals, userId);

        logger.info('Days regenerated successfully', { familyId, days, newMealCount: newMeals.length });

        return menu;
    } catch (error) {
        logger.error('OpenAI API error during regeneration', { error: (error as Error).message });
        throw error;
    }
}

// Get ingredient overlap analysis
export function analyzeIngredients(meals: Meal[]): {
    ingredient: string;
    count: number;
    days: string[];
}[] {
    const ingredientMap = new Map<string, { count: number; days: string[] }>();

    for (const meal of meals) {
        for (const ingredient of meal.ingredients) {
            const normalized = ingredient.toLowerCase().trim();
            const existing = ingredientMap.get(normalized);
            if (existing) {
                existing.count++;
                existing.days.push(meal.dayName);
            } else {
                ingredientMap.set(normalized, { count: 1, days: [meal.dayName] });
            }
        }
    }

    // Return ingredients used more than once
    return Array.from(ingredientMap.entries())
        .filter(([, data]) => data.count > 1)
        .map(([ingredient, data]) => ({
            ingredient,
            count: data.count,
            days: data.days,
        }))
        .sort((a, b) => b.count - a.count);
}

// Re-export repository functions
export { getCurrentMenu, saveMenu, getWeekStart, getMenuHistory, updateMeal, deleteMenu } from './repository.js';
export type { Meal, WeeklyMenu } from './repository.js';
