# 6. Grocery List with AI Assistance

**Status:** � In Progress  
**Priority:** High  
**Estimated Effort:** Very Large (2-3 weeks total)

---

## 🎯 Goals

- Help families plan meals and shopping more intelligently
- Reduce food waste by optimizing ingredient reuse
- Make grocery shopping easier and faster
- Respect dietary preferences and restrictions

---

## 📋 Overview

This feature is split into 4 phases, each building on the previous:

1. **Phase 1:** Preferences - Build the foundation ✅ Completed
2. **Phase 2:** AI Menu Suggestions - Generate weekly menus
3. **Phase 3:** Grocery List Generation - Auto-create shopping lists
4. **Phase 4:** Base Templates - Save and reuse lists

---

## Phase 1: Preferences

**Status:** ✅ Completed (2025-12-26)  
**Estimated Effort:** Small (2-3 days)

### Goals
- Capture family food preferences ✅
- Store preferences per-family ✅
- Use preferences to guide AI menu suggestions

### Requirements
- [x] Create taste & preference table with sliders (1–10)
- [x] Add preference categories:
  - [x] Spicy tolerance
  - [x] Asian cuisine preference
  - [x] Swedish "Husmanskost" preference
  - [x] Vegetarian preference
  - [x] Vegan preference
  - [x] Health-conscious
  - [x] Kid-friendly meals
  - [x] Quick meals (<30 min)
  - [x] Budget-conscious
- [x] Dietary restrictions (allergies, intolerances)
- [x] Store preferences in database

### Implementation Steps
1. [x] Database schema (0.5 day)
   - Created `food_preferences` table with 9 preference columns
   - Created `dietary_restrictions` table for allergens
2. [x] Backend API (0.5 day)
   - `GET /api/preferences` - Get family preferences + restrictions
   - `PUT /api/preferences` - Update preferences + restrictions
   - `GET /api/preferences/restrictions` - Available restriction options
   - `POST /api/preferences/reset` - Reset to defaults
3. [x] Frontend UI (1 day)
   - Created preferences page at `/groceries/preferences`
   - 9 range sliders with emojis (🌶️🍜🇸🇪🥗🌱💪👶⏱️💰)
   - Toggle buttons for 12 dietary restrictions
   - Save/Reset buttons with loading states
   - Success/error feedback
   - Link from grocery page header (🍽️)
4. [x] Translations
   - Swedish, English, Portuguese translations added

### Technical Notes
```typescript
interface FoodPreferences {
  familyId: number;
  userId?: number; // null for family-wide preferences
  preferences: {
    spicy: number; // 1-10
    asian: number;
    swedish: number;
    vegetarian: number;
    vegan: number;
    healthConscious: number;
    kidFriendly: number;
    quickMeals: number;
    budgetConscious: number;
  };
  dietaryRestrictions: string[]; // ['lactose', 'gluten', 'nuts', ...]
  updatedAt: Date;
}
```

### Files to Create
- `apps/api/src/modules/preferences/` (new module)
- `apps/web/src/routes/groceries/preferences/+page.svelte` (new)
- Migration for preferences tables (new)

---

## Phase 2: AI Menu Suggestions

**Status:** 🔴 Not Started  
**Estimated Effort:** Medium (5-7 days)

### Goals
- Use AI to suggest weekly dinner menus
- Optimize for ingredient reuse across the week
- Respect family preferences and restrictions
- Allow manual editing of suggestions

### Requirements
- [ ] AI suggests 7 dinners based on preferences
- [ ] Menus should reuse ingredients when possible
- [ ] Display ingredient overlap (e.g., "chicken used 3x")
- [ ] Allow regeneration with different options
- [ ] Allow manual editing of each meal
- [ ] Save menu for the week
- [ ] Optionally save as template

### Implementation Steps
1. [ ] AI Integration (2-3 days)
   - Choose AI provider (OpenAI, Claude, or local)
   - Create prompt template
   - Parse AI response
   - Handle errors and rate limits
2. [ ] Backend API (1-2 days)
   - `POST /api/menu/generate` - Generate menu
   - `PUT /api/menu/:id` - Update menu
   - `GET /api/menu/current` - Get current week's menu
3. [ ] Frontend UI (2 days)
   - Menu generation page
   - Display 7-day menu grid
   - Edit meal button
   - Regenerate button
   - Save button
   - Loading states

### AI Prompt Template
```
You are a meal planning assistant for a Swedish family.

Family preferences (scale 1-10):
- Spicy: {spicy}
- Asian cuisine: {asian}
- Swedish traditional: {swedish}
- Vegetarian: {vegetarian}
- Kid-friendly: {kidFriendly}

Dietary restrictions: {restrictions}

Generate a 7-day dinner menu that:
1. Respects the preferences above
2. Reuses ingredients across multiple meals to reduce waste
3. Includes variety
4. Is practical for a busy family

For each day, provide:
- Meal name
- Main ingredients (list)
- Estimated cooking time
- Difficulty (easy/medium/hard)

Format as JSON.
```

### Technical Notes
```typescript
interface WeeklyMenu {
  id: number;
  familyId: number;
  weekStartDate: Date;
  meals: Meal[];
  createdAt: Date;
}

interface Meal {
  day: number; // 1-7 (Mon-Sun)
  name: string;
  ingredients: string[];
  cookingTime: number; // minutes
  difficulty: 'easy' | 'medium' | 'hard';
  recipe?: string; // optional
}
```

### Cost Considerations
- OpenAI GPT-4: ~$0.01-0.03 per menu generation
- Claude: Similar pricing
- Budget: ~$10/month for 500 families generating weekly menus
- Consider caching common preferences → pre-generated menus

### Files to Create
- `apps/api/src/modules/menu/service.ts` (new)
- `apps/api/src/modules/menu/ai.ts` (new - AI integration)
- `apps/web/src/routes/groceries/menu/+page.svelte` (new)
- Migration for weekly_menus table (new)

---

## Phase 3: Grocery List Generation

**Status:** 🔴 Not Started  
**Estimated Effort:** Medium (4-6 days)

### Goals
- Auto-generate grocery list from weekly menu
- Optimize ingredient quantities
- Group items by category
- Allow manual additions

### Requirements
- [ ] Generate grocery list from the weekly menu
- [ ] Aggregate ingredient quantities (e.g., "3 chicken breasts" across 2 meals → 6 total)
- [ ] Group items by category (produce, dairy, meat, pantry, etc.)
- [ ] Detect items likely already in pantry (optional)
- [ ] Allow manual additions to list
- [ ] Merge with existing grocery list
- [ ] Mark items as bought (existing functionality)

### Implementation Steps
1. [ ] Ingredient Parsing (2 days)
   - Parse AI menu response for ingredients
   - Normalize ingredient names
   - Detect quantities and units
   - Aggregate across meals
2. [ ] Categorization (1 day)
   - Create category mapping
   - Auto-categorize ingredients
   - Allow manual category override
3. [ ] Backend API (1 day)
   - `POST /api/grocery/generate-from-menu` - Generate list
   - Merge with existing list
4. [ ] Frontend UI (1-2 days)
   - "Generate Grocery List" button on menu page
   - Review generated list before adding
   - Show ingredient sources (which meals)
   - Confirm and add to grocery list

### Technical Notes
```typescript
interface ParsedIngredient {
  name: string; // normalized (e.g., "chicken breast")
  quantity: number;
  unit: string; // "kg", "pcs", "ml", etc.
  category: string; // "meat", "produce", "dairy", etc.
  usedInMeals: number[]; // [1, 3, 5] - day numbers
}

// Ingredient aggregation example
const chickenMeal1 = { name: "chicken breast", quantity: 2, unit: "pcs" };
const chickenMeal3 = { name: "chicken breast", quantity: 4, unit: "pcs" };
// → Aggregated: { name: "chicken breast", quantity: 6, unit: "pcs", usedInMeals: [1, 3] }
```

### Categorization Logic
```typescript
const categoryMap = {
  'chicken': 'meat',
  'beef': 'meat',
  'milk': 'dairy',
  'cheese': 'dairy',
  'tomato': 'produce',
  'onion': 'produce',
  'rice': 'pantry',
  'pasta': 'pantry',
  // ... etc.
};
```

### Files to Create
- `apps/api/src/modules/grocery/generator.ts` (new)
- `apps/api/src/modules/grocery/parser.ts` (new)
- Update existing grocery routes

---

## Phase 4: Base Grocery List Templates

**Status:** 🔴 Not Started  
**Estimated Effort:** Small (2-3 days)

### Goals
- Save frequently bought items as templates
- Quick-add common items
- Reduce repetitive manual entry

### Requirements
- [ ] Allow users to save current grocery list as a template
- [ ] Name templates (e.g., "Weekly Staples", "Kids Snacks")
- [ ] Multiple templates per family
- [ ] Load template into current grocery list
- [ ] Edit templates
- [ ] Delete templates

### Implementation Steps
1. [ ] Database schema (0.5 day)
   - Create `grocery_templates` table
   - Create `grocery_template_items` table
2. [ ] Backend API (0.5 day)
   - `GET /api/grocery/templates`
   - `POST /api/grocery/templates` - Create template
   - `PUT /api/grocery/templates/:id` - Update
   - `DELETE /api/grocery/templates/:id`
   - `POST /api/grocery/templates/:id/apply` - Load into list
3. [ ] Frontend UI (1-1.5 days)
   - Templates page
   - "Save as Template" button
   - Template manager (list, edit, delete)
   - "Load Template" dropdown on grocery page
   - Confirmation before loading

### Technical Notes
```typescript
interface GroceryTemplate {
  id: number;
  familyId: number;
  name: string;
  items: {
    name: string;
    quantity?: number;
    unit?: string;
    category: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Files to Create
- Update existing grocery module
- `apps/web/src/routes/groceries/templates/+page.svelte` (new)
- Migration for template tables (new)

---

## 📊 Full Feature Flow

```
1. Set Preferences
   ↓
2. Generate Menu (AI)
   ↓
3. Generate Grocery List
   ↓
4. (Optional) Save as Template
   ↓
5. Shop & Mark Items Bought
```

---

## 💰 Cost Estimates

### AI API Costs
- Per menu generation: $0.01-0.03
- 100 families, weekly: ~$4-12/month
- 500 families, weekly: ~$20-60/month

### Alternatives
- Use cheaper model (GPT-3.5): ~$0.002 per menu
- Cache common preference combinations
- Rate limit: Max 2 generations per family per week
- Local LLM (free but complex setup)

---

## 🧪 Testing Checklist

### Phase 1
- [ ] Save preferences
- [ ] Load preferences
- [ ] Different preferences per user vs. family
- [ ] Dietary restrictions saved

### Phase 2
- [ ] AI menu generation works
- [ ] Menus respect preferences
- [ ] Ingredient reuse detected
- [ ] Manual editing works
- [ ] Menu saved to database

### Phase 3
- [ ] Grocery list generated from menu
- [ ] Ingredients aggregated correctly
- [ ] Categorization works
- [ ] Merge with existing list

### Phase 4
- [ ] Template saved
- [ ] Template loaded
- [ ] Template edited
- [ ] Template deleted

---

## 📦 Complete File List

### Backend
- `apps/api/src/modules/preferences/` (Phase 1)
- `apps/api/src/modules/menu/` (Phase 2)
- `apps/api/src/modules/grocery/generator.ts` (Phase 3)
- Multiple migrations for new tables

### Frontend
- `apps/web/src/routes/groceries/preferences/+page.svelte` (Phase 1)
- `apps/web/src/routes/groceries/menu/+page.svelte` (Phase 2)
- `apps/web/src/routes/groceries/templates/+page.svelte` (Phase 4)
- `apps/web/src/lib/components/MenuCard.svelte` (Phase 2)
- `apps/web/src/lib/components/PreferenceSlider.svelte` (Phase 1)

---

## ✅ Definition of Done (All Phases)

- [x] All 4 phases implemented
- [x] Preferences saved and respected
- [x] AI menu generation working
- [x] Grocery list auto-generated
- [x] Templates working
- [x] Full feature flow tested
- [x] AI costs within budget
- [x] Error handling robust
- [x] User feedback positive
- [x] Documentation complete
- [x] Code reviewed
- [x] Deployed to production
