<script lang="ts">
  import type { GrocerySuggestion } from '$lib/data/grocerySuggestions';

  export let suggestions: GrocerySuggestion[];
  export let selectedIndex: number;
  export let getCategoryIcon: (category: string) => string;
  export let getCategoryTranslation: (category: string) => string;
  export let onSelectSuggestion: (suggestion: GrocerySuggestion) => void;
</script>

<div
  class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
>
  {#each suggestions as suggestion, index}
    <button
      type="button"
      class="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors
             {index === selectedIndex ? 'bg-primary-100 dark:bg-primary-900/50' : ''}"
      on:mousedown|preventDefault={() => onSelectSuggestion(suggestion)}
    >
      <span class="text-lg">{getCategoryIcon(suggestion.category)}</span>
      <div class="flex-1">
        <span class="font-medium text-gray-900 dark:text-gray-100">{suggestion.name}</span>
        <span class="text-xs text-gray-500 ml-2"
          >({getCategoryTranslation(suggestion.category)})</span
        >
      </div>
      {#if suggestion.defaultQuantity}
        <span class="text-xs text-gray-400"
          >{suggestion.defaultQuantity} {suggestion.unit || 'st'}</span
        >
      {/if}
    </button>
  {/each}
</div>
