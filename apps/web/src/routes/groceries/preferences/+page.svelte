<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '$lib/i18n';
  import { get, put, post } from '$lib/api/client';

  type PreferenceKey =
    | 'spicy'
    | 'asian'
    | 'swedish'
    | 'vegetarian'
    | 'vegan'
    | 'healthConscious'
    | 'kidFriendly'
    | 'quickMeals'
    | 'budgetConscious';

  interface Preferences {
    spicy: number;
    asian: number;
    swedish: number;
    vegetarian: number;
    vegan: number;
    healthConscious: number;
    kidFriendly: number;
    quickMeals: number;
    budgetConscious: number;
    [key: string]: number; // Index signature for dynamic access
  }

  interface RestrictionOption {
    id: string;
    label: string;
    labelEn: string;
  }

  let preferences: Preferences = {
    spicy: 5,
    asian: 5,
    swedish: 5,
    vegetarian: 3,
    vegan: 1,
    healthConscious: 5,
    kidFriendly: 5,
    quickMeals: 5,
    budgetConscious: 5,
  };

  let activeRestrictions: string[] = [];
  let availableRestrictions: RestrictionOption[] = [];
  let loading = true;
  let saving = false;
  let error: string | null = null;
  let success = false;

  const preferenceLabels: Record<PreferenceKey, { sv: string; en: string; emoji: string }> = {
    spicy: { sv: 'Kryddig mat', en: 'Spicy food', emoji: '🌶️' },
    asian: { sv: 'Asiatiskt', en: 'Asian cuisine', emoji: '🍜' },
    swedish: { sv: 'Husmanskost', en: 'Swedish traditional', emoji: '🇸🇪' },
    vegetarian: { sv: 'Vegetariskt', en: 'Vegetarian', emoji: '🥗' },
    vegan: { sv: 'Veganskt', en: 'Vegan', emoji: '🌱' },
    healthConscious: { sv: 'Hälsosamt', en: 'Health-conscious', emoji: '💪' },
    kidFriendly: { sv: 'Barnvänligt', en: 'Kid-friendly', emoji: '👶' },
    quickMeals: { sv: 'Snabba måltider', en: 'Quick meals (<30 min)', emoji: '⏱️' },
    budgetConscious: { sv: 'Budgetvänligt', en: 'Budget-friendly', emoji: '💰' },
  };

  const preferenceKeys: PreferenceKey[] = [
    'spicy',
    'asian',
    'swedish',
    'vegetarian',
    'vegan',
    'healthConscious',
    'kidFriendly',
    'quickMeals',
    'budgetConscious',
  ];

  onMount(async () => {
    await loadPreferences();
    await loadRestrictions();
  });

  async function loadPreferences() {
    try {
      loading = true;
      const response = await get<{
        preferences: Preferences;
        restrictions: { restriction: string }[];
      }>('/preferences');

      if (response.preferences) {
        preferences = {
          spicy: response.preferences.spicy,
          asian: response.preferences.asian,
          swedish: response.preferences.swedish,
          vegetarian: response.preferences.vegetarian,
          vegan: response.preferences.vegan,
          healthConscious: response.preferences.healthConscious,
          kidFriendly: response.preferences.kidFriendly,
          quickMeals: response.preferences.quickMeals,
          budgetConscious: response.preferences.budgetConscious,
        };
      }

      if (response.restrictions) {
        activeRestrictions = response.restrictions.map(
          (r: { restriction: string }) => r.restriction
        );
      }
    } catch (err) {
      error = (err as Error).message;
    } finally {
      loading = false;
    }
  }

  async function loadRestrictions() {
    try {
      const response = await get<{ restrictions: RestrictionOption[] }>(
        '/preferences/restrictions'
      );
      availableRestrictions = response.restrictions || [];
    } catch (err) {
      // Use default list if endpoint fails
      availableRestrictions = [
        { id: 'lactose', label: 'Laktos', labelEn: 'Lactose' },
        { id: 'gluten', label: 'Gluten', labelEn: 'Gluten' },
        { id: 'nuts', label: 'Nötter', labelEn: 'Nuts' },
        { id: 'peanuts', label: 'Jordnötter', labelEn: 'Peanuts' },
        { id: 'eggs', label: 'Ägg', labelEn: 'Eggs' },
        { id: 'fish', label: 'Fisk', labelEn: 'Fish' },
        { id: 'shellfish', label: 'Skaldjur', labelEn: 'Shellfish' },
        { id: 'soy', label: 'Soja', labelEn: 'Soy' },
      ];
    }
  }

  async function savePreferences() {
    try {
      saving = true;
      error = null;
      success = false;

      await put('/preferences', {
        preferences,
        restrictions: activeRestrictions,
      });

      success = true;
      setTimeout(() => (success = false), 3000);
    } catch (err) {
      error = (err as Error).message;
    } finally {
      saving = false;
    }
  }

  async function resetPreferences() {
    if (!confirm($t('preferences.confirmReset'))) return;

    try {
      saving = true;
      error = null;

      const response = await post<{
        preferences: Preferences;
        restrictions: { restriction: string }[];
      }>('/preferences/reset');

      preferences = {
        spicy: response.preferences.spicy,
        asian: response.preferences.asian,
        swedish: response.preferences.swedish,
        vegetarian: response.preferences.vegetarian,
        vegan: response.preferences.vegan,
        healthConscious: response.preferences.healthConscious,
        kidFriendly: response.preferences.kidFriendly,
        quickMeals: response.preferences.quickMeals,
        budgetConscious: response.preferences.budgetConscious,
      };
      activeRestrictions = [];

      success = true;
      setTimeout(() => (success = false), 3000);
    } catch (err) {
      error = (err as Error).message;
    } finally {
      saving = false;
    }
  }

  function toggleRestriction(id: string) {
    if (activeRestrictions.includes(id)) {
      activeRestrictions = activeRestrictions.filter((r) => r !== id);
    } else {
      activeRestrictions = [...activeRestrictions, id];
    }
  }

  function getLabel(key: PreferenceKey): string {
    return preferenceLabels[key].sv;
  }

  function getEmoji(key: PreferenceKey): string {
    return preferenceLabels[key].emoji;
  }

  function getRestrictionLabel(r: RestrictionOption): string {
    return r.label;
  }
</script>

<svelte:head>
  <title>{$t('preferences.title')} - Family Hub</title>
</svelte:head>

<div class="max-w-2xl mx-auto p-4">
  <!-- Header -->
  <div class="flex items-center gap-3 mb-6">
    <a
      href="/groceries"
      class="text-stone-500 hover:text-orange-500 transition-colors"
      aria-label="Back to groceries"
    >
      ← {$t('common.back')}
    </a>
  </div>

  <h1
    class="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent mb-2"
  >
    🍽️ {$t('preferences.title')}
  </h1>
  <p class="text-stone-600 dark:text-stone-400 mb-6">
    {$t('preferences.description')}
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
        ✅ {$t('preferences.saved')}
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

    <!-- Preference Sliders -->
    <div
      class="bg-white dark:bg-stone-800 rounded-xl shadow-lg border border-orange-200 dark:border-stone-700 p-6 mb-6"
    >
      <h2 class="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4">
        {$t('preferences.tastePreferences')}
      </h2>

      <div class="space-y-6">
        {#each preferenceKeys as prefKey}
          <div>
            <div class="flex items-center justify-between mb-2">
              <label
                for="pref-{prefKey}"
                class="text-sm font-medium text-stone-700 dark:text-stone-300"
              >
                {getEmoji(prefKey)}
                {getLabel(prefKey)}
              </label>
              <span class="text-sm font-bold text-orange-500">{preferences[prefKey]}/10</span>
            </div>
            <input
              id="pref-{prefKey}"
              type="range"
              min="1"
              max="10"
              bind:value={preferences[prefKey]}
              class="w-full h-2 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <div class="flex justify-between text-xs text-stone-400 mt-1">
              <span>{$t('preferences.low')}</span>
              <span>{$t('preferences.high')}</span>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Dietary Restrictions -->
    <div
      class="bg-white dark:bg-stone-800 rounded-xl shadow-lg border border-orange-200 dark:border-stone-700 p-6 mb-6"
    >
      <h2 class="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4">
        ⚠️ {$t('preferences.dietaryRestrictions')}
      </h2>
      <p class="text-sm text-stone-500 dark:text-stone-400 mb-4">
        {$t('preferences.restrictionsDescription')}
      </p>

      <div class="flex flex-wrap gap-2">
        {#each availableRestrictions as restriction}
          <button
            type="button"
            on:click={() => toggleRestriction(restriction.id)}
            class="px-3 py-1.5 rounded-full text-sm font-medium transition-all
              {activeRestrictions.includes(restriction.id)
              ? 'bg-red-500 text-white'
              : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'}"
          >
            {activeRestrictions.includes(restriction.id) ? '✓ ' : ''}{getRestrictionLabel(
              restriction
            )}
          </button>
        {/each}
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex gap-3">
      <button
        on:click={savePreferences}
        disabled={saving}
        class="flex-1 py-3 px-4 bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-500 hover:to-amber-500 text-white font-semibold rounded-lg shadow-md transition-all disabled:opacity-50"
      >
        {#if saving}
          <span class="animate-pulse">{$t('common.saving')}</span>
        {:else}
          💾 {$t('common.save')}
        {/if}
      </button>

      <button
        on:click={resetPreferences}
        disabled={saving}
        class="py-3 px-4 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-300 font-medium rounded-lg transition-all disabled:opacity-50"
      >
        🔄 {$t('preferences.reset')}
      </button>
    </div>

    <!-- Info box -->
    <div
      class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
    >
      <p class="text-sm text-blue-700 dark:text-blue-300">
        💡 {$t('preferences.infoBox')}
      </p>
    </div>
  {/if}
</div>
