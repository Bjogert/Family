<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '$lib/i18n';
  import { get, post } from '$lib/api/client';

  interface Meal {
    day: number;
    dayName: string;
    name: string;
    nameEn: string;
    ingredients: string[];
    cookingTime: number;
    difficulty: 'easy' | 'medium' | 'hard';
    servings: number;
  }

  interface WeeklyMenu {
    id: number;
    familyId: number;
    weekStart: string;
    meals: Meal[];
    createdAt: string;
    updatedAt: string;
  }

  interface ReusedIngredient {
    ingredient: string;
    count: number;
    days: string[];
  }

  let menu: WeeklyMenu | null = null;
  let reusedIngredients: ReusedIngredient[] = [];
  let weekStart: string = '';
  let loading = true;
  let generating = false;
  let regeneratingDays = false;
  let error: string | null = null;
  let success: string | null = null;
  let expandedDay: number | null = null;
  let selectedDays: Set<number> = new Set();

  const difficultyColors = {
    easy: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    hard: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  };

  const dayEmojis = ['🌙', '🔥', '💧', '🌳', '⚡', '🌟', '☀️'];

  // Ingredient to category mapping (common Swedish grocery items)
  // Valid categories: produce, dairy, meat, bakery, frozen, beverages, snacks, household, pet, other
  const categoryMap: Record<string, string> = {
    // Proteins (meat category)
    kyckling: 'meat',
    kycklingfilé: 'meat',
    fläsk: 'meat',
    fläskkotlett: 'meat',
    köttfärs: 'meat',
    nötfärs: 'meat',
    bacon: 'meat',
    korv: 'meat',
    skinka: 'meat',
    lax: 'meat',
    fisk: 'meat',
    räkor: 'meat',
    torsk: 'meat',
    tonfisk: 'meat',
    // Dairy
    mjölk: 'dairy',
    grädde: 'dairy',
    ost: 'dairy',
    smör: 'dairy',
    cremefraiche: 'dairy',
    yoghurt: 'dairy',
    ägg: 'dairy',
    parmesan: 'dairy',
    mozzarella: 'dairy',
    fetaost: 'dairy',
    // Produce (vegetables & fruits)
    lök: 'produce',
    vitlök: 'produce',
    tomat: 'produce',
    tomater: 'produce',
    paprika: 'produce',
    gurka: 'produce',
    sallad: 'produce',
    morot: 'produce',
    morötter: 'produce',
    broccoli: 'produce',
    potatis: 'produce',
    spenat: 'produce',
    zucchini: 'produce',
    champinjoner: 'produce',
    svamp: 'produce',
    purjolök: 'produce',
    selleri: 'produce',
    majs: 'produce',
    bönor: 'produce',
    ärtor: 'produce',
    kål: 'produce',
    blomkål: 'produce',
    // Fruits (also produce)
    citron: 'produce',
    lime: 'produce',
    äpple: 'produce',
    banan: 'produce',
    apelsin: 'produce',
    avokado: 'produce',
    // Pantry items (other category - pantry isn't a valid category)
    ris: 'other',
    pasta: 'other',
    spaghetti: 'other',
    nudlar: 'other',
    mjöl: 'other',
    socker: 'other',
    salt: 'other',
    peppar: 'other',
    olja: 'other',
    olivolja: 'other',
    sojasås: 'other',
    vinäger: 'other',
    buljong: 'other',
    'krossade tomater': 'other',
    tomatpuré: 'other',
    kokosmjölk: 'other',
    currypasta: 'other',
    tacokrydda: 'other',
    tortillas: 'bakery',
    bröd: 'bakery',
  };

  // Default units for common ingredients (when AI doesn't specify)
  // Items sold by weight should use kg/g, liquids use l/dl/ml
  const defaultUnitMap: Record<string, { unit: string; quantity: number }> = {
    // Produce - sold by weight
    potatis: { unit: 'kg', quantity: 1 },
    lök: { unit: 'st', quantity: 2 },
    vitlök: { unit: 'st', quantity: 1 },
    morot: { unit: 'st', quantity: 3 },
    morötter: { unit: 'st', quantity: 3 },
    tomat: { unit: 'st', quantity: 2 },
    tomater: { unit: 'st', quantity: 4 },
    paprika: { unit: 'st', quantity: 1 },
    gurka: { unit: 'st', quantity: 1 },
    broccoli: { unit: 'st', quantity: 1 },
    blomkål: { unit: 'st', quantity: 1 },
    vitkål: { unit: 'st', quantity: 1 },
    spenat: { unit: 'g', quantity: 200 },
    sallad: { unit: 'st', quantity: 1 },
    champinjoner: { unit: 'g', quantity: 250 },
    svamp: { unit: 'g', quantity: 200 },
    zucchini: { unit: 'st', quantity: 1 },
    aubergine: { unit: 'st', quantity: 1 },
    purjolök: { unit: 'st', quantity: 1 },
    selleri: { unit: 'st', quantity: 1 },
    // Fruits
    citron: { unit: 'st', quantity: 2 },
    lime: { unit: 'st', quantity: 2 },
    äpple: { unit: 'st', quantity: 4 },
    banan: { unit: 'st', quantity: 6 },
    apelsin: { unit: 'st', quantity: 3 },
    avokado: { unit: 'st', quantity: 2 },
    // Meat - sold by weight
    köttfärs: { unit: 'g', quantity: 500 },
    nötfärs: { unit: 'g', quantity: 500 },
    fläskfärs: { unit: 'g', quantity: 500 },
    blandfärs: { unit: 'g', quantity: 500 },
    kyckling: { unit: 'g', quantity: 500 },
    kycklingfilé: { unit: 'g', quantity: 400 },
    kycklingbröst: { unit: 'g', quantity: 400 },
    kycklinglårfilé: { unit: 'g', quantity: 500 },
    fläskkotlett: { unit: 'g', quantity: 400 },
    fläskfilé: { unit: 'g', quantity: 400 },
    karré: { unit: 'g', quantity: 500 },
    bacon: { unit: 'g', quantity: 200 },
    skinka: { unit: 'g', quantity: 200 },
    korv: { unit: 'st', quantity: 4 },
    falukorv: { unit: 'st', quantity: 1 },
    prinskorv: { unit: 'förp', quantity: 1 },
    // Fish - sold by weight
    lax: { unit: 'g', quantity: 400 },
    laxfilé: { unit: 'g', quantity: 400 },
    torsk: { unit: 'g', quantity: 400 },
    torskfilé: { unit: 'g', quantity: 400 },
    fisk: { unit: 'g', quantity: 400 },
    räkor: { unit: 'g', quantity: 300 },
    // Dairy - liquids in volume, cheese by weight
    mjölk: { unit: 'l', quantity: 1 },
    grädde: { unit: 'dl', quantity: 2 },
    vispgrädde: { unit: 'dl', quantity: 2 },
    matlagningsgrädde: { unit: 'dl', quantity: 2 },
    cremefraiche: { unit: 'dl', quantity: 2 },
    gräddfil: { unit: 'dl', quantity: 2 },
    yoghurt: { unit: 'dl', quantity: 5 },
    filmjölk: { unit: 'l', quantity: 1 },
    ost: { unit: 'g', quantity: 200 },
    'riven ost': { unit: 'g', quantity: 150 },
    parmesan: { unit: 'g', quantity: 100 },
    mozzarella: { unit: 'st', quantity: 1 },
    fetaost: { unit: 'g', quantity: 150 },
    halloumi: { unit: 'st', quantity: 1 },
    smör: { unit: 'g', quantity: 250 },
    ägg: { unit: 'st', quantity: 6 },
    // Pantry - by weight or package
    ris: { unit: 'g', quantity: 300 },
    pasta: { unit: 'g', quantity: 400 },
    spaghetti: { unit: 'g', quantity: 400 },
    penne: { unit: 'g', quantity: 400 },
    nudlar: { unit: 'st', quantity: 2 },
    'krossade tomater': { unit: 'burk', quantity: 1 },
    'passerade tomater': { unit: 'burk', quantity: 1 },
    tomatpuré: { unit: 'st', quantity: 1 },
    kokosmjölk: { unit: 'burk', quantity: 1 },
    bönor: { unit: 'burk', quantity: 1 },
    kikärtor: { unit: 'burk', quantity: 1 },
    linser: { unit: 'g', quantity: 200 },
    mjöl: { unit: 'g', quantity: 400 },
    socker: { unit: 'g', quantity: 200 },
    // Liquids and sauces
    olja: { unit: 'msk', quantity: 2 },
    olivolja: { unit: 'msk', quantity: 2 },
    sojasås: { unit: 'msk', quantity: 2 },
    soja: { unit: 'msk', quantity: 2 },
    vinäger: { unit: 'msk', quantity: 1 },
    buljong: { unit: 'st', quantity: 1 },
    // Spices - small amounts
    salt: { unit: 'krm', quantity: 1 },
    peppar: { unit: 'krm', quantity: 1 },
    vitpeppar: { unit: 'krm', quantity: 1 },
    paprikapulver: { unit: 'tsk', quantity: 1 },
    curry: { unit: 'tsk', quantity: 1 },
    spiskummin: { unit: 'tsk', quantity: 1 },
    kanel: { unit: 'tsk', quantity: 1 },
    ingefära: { unit: 'tsk', quantity: 1 },
    chili: { unit: 'st', quantity: 1 },
    basilika: { unit: 'kruka', quantity: 1 },
    persilja: { unit: 'kruka', quantity: 1 },
    dill: { unit: 'kruka', quantity: 1 },
    koriander: { unit: 'kruka', quantity: 1 },
    rosmarin: { unit: 'kvist', quantity: 2 },
    timjan: { unit: 'kvist', quantity: 2 },
    // Bakery
    bröd: { unit: 'st', quantity: 1 },
    tortillas: { unit: 'förp', quantity: 1 },
    tortillabröd: { unit: 'förp', quantity: 1 },
    pitabröd: { unit: 'förp', quantity: 1 },
  };

  // Get default unit for an ingredient
  function getDefaultUnit(name: string): { unit: string; quantity: number } {
    const lower = name.toLowerCase();
    // Check exact match first
    if (defaultUnitMap[lower]) {
      return defaultUnitMap[lower];
    }
    // Check if name contains any key
    for (const [key, value] of Object.entries(defaultUnitMap)) {
      if (lower.includes(key) || key.includes(lower)) {
        return value;
      }
    }
    // Default fallback
    return { unit: 'st', quantity: 1 };
  }

  function getCategoryForIngredient(name: string): string {
    const lower = name.toLowerCase();
    for (const [key, category] of Object.entries(categoryMap)) {
      if (lower.includes(key)) {
        return category;
      }
    }
    return 'other';
  }

  onMount(async () => {
    await loadMenu();
  });

  async function loadMenu() {
    try {
      loading = true;
      error = null;
      const response = await get<{
        menu: WeeklyMenu;
        reusedIngredients: ReusedIngredient[];
        weekStart: string;
      }>('/menu');

      menu = response.menu;
      reusedIngredients = response.reusedIngredients || [];
      weekStart = response.weekStart;
    } catch (err: unknown) {
      const errorObj = err as { message?: string; statusCode?: number };
      if (errorObj.statusCode === 404) {
        // No menu yet, that's OK
        menu = null;
      } else {
        error = errorObj.message || 'Failed to load menu';
      }
    } finally {
      loading = false;
    }
  }

  async function generateMenu(regenerate: boolean = false) {
    try {
      generating = true;
      error = null;
      success = null;

      const url = regenerate ? '/menu/generate?regenerate=true' : '/menu/generate';
      const response = await post<{
        menu: WeeklyMenu;
        reusedIngredients: ReusedIngredient[];
        generated: boolean;
      }>(url, {});

      menu = response.menu;
      reusedIngredients = response.reusedIngredients || [];
      selectedDays.clear();
      selectedDays = selectedDays;
      success = $t('menu.saved');
      setTimeout(() => (success = null), 3000);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      if (errorObj.message?.includes('not configured')) {
        error = $t('menu.configError');
      } else {
        error = $t('menu.error');
      }
    } finally {
      generating = false;
    }
  }

  async function regenerateSelectedDays() {
    if (selectedDays.size === 0) return;

    try {
      regeneratingDays = true;
      error = null;
      success = null;

      const response = await post<{
        menu: WeeklyMenu;
        reusedIngredients: ReusedIngredient[];
        regenerated: boolean;
      }>('/menu/regenerate-days', { days: Array.from(selectedDays) });

      menu = response.menu;
      reusedIngredients = response.reusedIngredients || [];
      selectedDays.clear();
      selectedDays = selectedDays;
      success = $t('menu.daysRegenerated');
      setTimeout(() => (success = null), 3000);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      error = errorObj.message || $t('menu.error');
    } finally {
      regeneratingDays = false;
    }
  }

  function toggleDaySelection(day: number, event: Event) {
    event.stopPropagation();
    if (selectedDays.has(day)) {
      selectedDays.delete(day);
    } else {
      selectedDays.add(day);
    }
    selectedDays = selectedDays; // Trigger reactivity
  }

  function parseIngredient(ingredient: string): { quantity: number; unit: string; name: string } {
    // Try to match patterns like "2 st Citron", "500 g Kyckling", "1 Gurka"
    const match = ingredient.match(
      /^(\d+(?:[.,]\d+)?)\s*(st|g|kg|ml|l|dl|msk|tsk|krm|burk|förp|kruka|kvist)?\s*(.+)$/i
    );
    if (match) {
      const qty = parseFloat(match[1].replace(',', '.'));
      const unitFromMatch = match[2]?.toLowerCase();
      const name = match[3].trim();

      // If AI provided a unit, use it; otherwise look up the default
      if (unitFromMatch) {
        return { quantity: qty, unit: unitFromMatch, name };
      }

      // No unit specified, use smart defaults based on ingredient
      const defaults = getDefaultUnit(name);
      return { quantity: qty, unit: defaults.unit, name };
    }

    // No quantity found - use smart defaults for both quantity and unit
    const name = ingredient.trim();
    const defaults = getDefaultUnit(name);
    return { quantity: defaults.quantity, unit: defaults.unit, name };
  }

  async function addToGroceries() {
    if (!menu) return;

    try {
      // Collect and combine ingredients
      const ingredientMap = new Map<string, { quantity: number; unit: string }>();

      for (const meal of menu.meals) {
        for (const ingredient of meal.ingredients) {
          const parsed = parseIngredient(ingredient);
          const key = parsed.name.toLowerCase();

          if (ingredientMap.has(key)) {
            const existing = ingredientMap.get(key)!;
            // Only combine if same unit
            if (existing.unit === parsed.unit) {
              existing.quantity += parsed.quantity;
            } else {
              // Different units, add as separate entry with unit suffix
              const keyWithUnit = `${key}_${parsed.unit}`;
              if (ingredientMap.has(keyWithUnit)) {
                ingredientMap.get(keyWithUnit)!.quantity += parsed.quantity;
              } else {
                ingredientMap.set(keyWithUnit, { quantity: parsed.quantity, unit: parsed.unit });
              }
            }
          } else {
            ingredientMap.set(key, { quantity: parsed.quantity, unit: parsed.unit });
          }
        }
      }

      // Add each combined ingredient to groceries with proper fields
      for (const [key, { quantity, unit }] of ingredientMap) {
        // Get the original casing from the first occurrence
        const name = key.replace(/_\w+$/, ''); // Remove unit suffix if present
        const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
        const category = getCategoryForIngredient(name);

        await post('/groceries', {
          name: capitalizedName,
          category: category,
          quantity: quantity,
          unit: unit,
        });
      }

      success = $t('menu.addedToGroceries');
      setTimeout(() => (success = null), 3000);
    } catch (err) {
      error = (err as Error).message;
    }
  }

  function toggleDay(day: number) {
    expandedDay = expandedDay === day ? null : day;
  }

  function getWeekNumber(dateStr: string): number {
    const date = new Date(dateStr);
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  function getDifficultyLabel(difficulty: string): string {
    const key = `menu.${difficulty}` as const;
    return $t(key);
  }
</script>

<svelte:head>
  <title>{$t('menu.title')} - Family Hub</title>
</svelte:head>

<div class="max-w-3xl mx-auto p-4">
  <!-- Header -->
  <div class="flex items-center gap-3 mb-6">
    <a
      href="/groceries"
      class="text-stone-500 hover:text-orange-500 transition-colors"
      aria-label="Back to groceries"
    >
      ← {$t('nav.back')}
    </a>
  </div>

  <div class="flex items-center justify-between mb-2">
    <h1
      class="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent"
    >
      🍽️ {$t('menu.title')}
    </h1>
    {#if menu && weekStart}
      <span class="text-sm text-stone-500 dark:text-stone-400">
        {$t('menu.week')}
        {getWeekNumber(weekStart)}
      </span>
    {/if}
  </div>
  <p class="text-stone-600 dark:text-stone-400 mb-6">
    {$t('menu.subtitle')}
  </p>

  {#if loading}
    <div class="flex justify-center py-12">
      <div
        class="animate-spin rounded-full h-8 w-8 border-2 border-orange-200 border-t-orange-500"
      ></div>
    </div>
  {:else}
    <!-- Success message -->
    {#if success}
      <div
        class="mb-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg text-green-700 dark:text-green-300"
      >
        ✅ {success}
      </div>
    {/if}

    <!-- Error message -->
    {#if error}
      <div
        class="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300"
      >
        ❌ {error}
      </div>
    {/if}

    {#if !menu}
      <!-- No menu state -->
      <div
        class="bg-white dark:bg-stone-800 rounded-xl shadow-lg border border-orange-200 dark:border-stone-700 p-8 text-center"
      >
        <div class="text-6xl mb-4">🍳</div>
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-2">
          {$t('menu.noMenu')}
        </h2>
        <p class="text-stone-600 dark:text-stone-400 mb-6">
          {$t('menu.noMenuDesc')}
        </p>
        <button
          on:click={() => generateMenu(false)}
          disabled={generating}
          class="px-6 py-3 bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-500 hover:to-amber-500 text-white font-semibold rounded-lg shadow-md transition-all disabled:opacity-50"
        >
          {#if generating}
            <span class="animate-pulse">🤖 {$t('menu.generating')}</span>
          {:else}
            ✨ {$t('menu.generate')}
          {/if}
        </button>
      </div>
    {:else}
      <!-- Regenerate selected days button -->
      {#if selectedDays.size > 0}
        <div
          class="mb-4 p-3 bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 rounded-lg flex items-center justify-between"
        >
          <span class="text-purple-700 dark:text-purple-300">
            🔄 {selectedDays.size}
            {selectedDays.size === 1 ? $t('menu.daySelected') : $t('menu.daysSelected')}
          </span>
          <button
            on:click={regenerateSelectedDays}
            disabled={regeneratingDays}
            class="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-all disabled:opacity-50"
          >
            {#if regeneratingDays}
              <span class="animate-pulse">⏳</span>
            {:else}
              🔄 {$t('menu.regenerateSelected')}
            {/if}
          </button>
        </div>
      {/if}

      <!-- Menu display -->
      <div class="space-y-4 mb-6">
        {#each menu.meals.sort((a, b) => a.day - b.day) as meal}
          <div
            class="bg-white dark:bg-stone-800 rounded-xl shadow-md border border-orange-200 dark:border-stone-700 overflow-hidden {selectedDays.has(
              meal.day
            )
              ? 'ring-2 ring-purple-500'
              : ''}"
          >
            <div class="flex items-center">
              <!-- Checkbox for selection -->
              <button
                on:click={(e) => toggleDaySelection(meal.day, e)}
                class="p-4 hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors"
                title={$t('menu.selectToRegenerate')}
              >
                <div
                  class="w-5 h-5 rounded border-2 {selectedDays.has(meal.day)
                    ? 'bg-purple-500 border-purple-500'
                    : 'border-stone-300 dark:border-stone-600'} flex items-center justify-center"
                >
                  {#if selectedDays.has(meal.day)}
                    <svg
                      class="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="3"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                  {/if}
                </div>
              </button>

              <button
                on:click={() => toggleDay(meal.day)}
                class="flex-1 p-4 pl-0 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors text-left"
              >
                <div class="flex items-center gap-3">
                  <span class="text-2xl">{dayEmojis[meal.day - 1]}</span>
                  <div>
                    <div class="font-semibold text-stone-800 dark:text-stone-100">
                      {meal.dayName}
                    </div>
                    <div class="text-stone-600 dark:text-stone-300">
                      {meal.name}
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-sm text-stone-500 dark:text-stone-400">
                    ⏱️ {meal.cookingTime}
                    {$t('menu.minutes')}
                  </span>
                  <span class="text-xs px-2 py-1 rounded-full {difficultyColors[meal.difficulty]}">
                    {getDifficultyLabel(meal.difficulty)}
                  </span>
                  <span
                    class="text-stone-400 transition-transform {expandedDay === meal.day
                      ? 'rotate-180'
                      : ''}"
                  >
                    ▼
                  </span>
                </div>
              </button>
            </div>

            {#if expandedDay === meal.day}
              <div class="px-4 pb-4 border-t border-stone-100 dark:border-stone-700">
                <div class="pt-4">
                  <div class="text-sm text-stone-500 dark:text-stone-400 mb-2">
                    🍽️ {meal.servings}
                    {$t('menu.servings')}
                  </div>
                  <h4 class="text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                    {$t('menu.ingredients')}:
                  </h4>
                  <div class="flex flex-wrap gap-2">
                    {#each meal.ingredients as ingredient}
                      <span
                        class="text-sm px-2 py-1 bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-full"
                      >
                        {ingredient}
                      </span>
                    {/each}
                  </div>
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>

      <!-- Reused Ingredients -->
      {#if reusedIngredients.length > 0}
        <div
          class="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 p-4 mb-6"
        >
          <h3 class="font-semibold text-green-800 dark:text-green-300 mb-2">
            ♻️ {$t('menu.reusedIngredients')}
          </h3>
          <p class="text-sm text-green-700 dark:text-green-400 mb-3">
            {$t('menu.reusedDesc')}
          </p>
          <div class="flex flex-wrap gap-2">
            {#each reusedIngredients as item}
              <span
                class="text-sm px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full"
                title={item.days.join(', ')}
              >
                {item.ingredient} ({item.count}x)
              </span>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Action Buttons -->
      <div class="flex flex-wrap gap-3">
        <button
          on:click={() => generateMenu(true)}
          disabled={generating}
          class="flex-1 py-3 px-4 bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-500 hover:to-amber-500 text-white font-semibold rounded-lg shadow-md transition-all disabled:opacity-50"
        >
          {#if generating}
            <span class="animate-pulse">🤖 {$t('menu.generating')}</span>
          {:else}
            🔄 {$t('menu.regenerate')}
          {/if}
        </button>

        <button
          on:click={addToGroceries}
          class="py-3 px-4 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-300 font-medium rounded-lg transition-all"
        >
          🛒 {$t('menu.addToGroceries')}
        </button>
      </div>

      <!-- Selection hint -->
      <p class="mt-4 text-sm text-stone-500 dark:text-stone-400 text-center">
        💡 {$t('menu.selectionHint')}
      </p>

      <!-- Link to preferences -->
      <div
        class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
      >
        <p class="text-sm text-blue-700 dark:text-blue-300">
          💡 {$t('preferences.infoBox')}
          <a
            href="/groceries/preferences"
            class="underline hover:text-blue-900 dark:hover:text-blue-100"
          >
            {$t('preferences.linkText')} →
          </a>
        </p>
      </div>
    {/if}
  {/if}
</div>
