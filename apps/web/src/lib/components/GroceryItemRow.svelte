<script lang="ts">
  import type { GroceryItem } from '$lib/types/grocery';
  import { t } from '$lib/i18n';

  export let item: GroceryItem;
  export let editingQuantityId: number | null;
  export let editQuantityValue: number;
  export let categoryIcon: string;
  export let onToggleBought: () => void;
  export let onDelete: () => void;
  export let onStartEdit: () => void;
  export let onUpdateQuantity: (value: number) => void;
  export let onCancelEdit: () => void;

  function decrementQuantity() {
    if (editQuantityValue > 1) {
      editQuantityValue--;
    }
  }

  function incrementQuantity() {
    if (editQuantityValue < 99) {
      editQuantityValue++;
    }
  }
</script>

<div class="flex items-center p-2 gap-2">
  <button
    on:click={onToggleBought}
    class="w-6 h-6 rounded-full {item.isBought
      ? 'bg-green-500 text-white'
      : 'border-2 border-gray-300 dark:border-gray-600'} flex items-center justify-center {!item.isBought
      ? 'hover:border-primary-500'
      : ''} transition-colors text-sm"
    aria-label={item.isBought ? 'Markera som ej köpt' : 'Markera som köpt'}
  >
    {#if item.isBought}✓{/if}
  </button>
  <div class="flex-1 min-w-0">
    <p class="font-medium truncate {item.isBought ? 'line-through' : ''}">{item.name}</p>
    {#if item.isBought && item.boughtBy}
      <p class="text-xs text-gray-500">
        {$t('groceries.boughtBy')}
        {item.boughtBy.name}
      </p>
    {:else if !item.isBought && item.addedBy}
      <p class="text-xs text-gray-500">
        {$t('groceries.addedBy')}
        {item.addedBy.name}
      </p>
    {/if}
  </div>

  {#if !item.isBought}
    {#if editingQuantityId === item.id}
      <div
        class="flex items-center gap-1 bg-primary-50 dark:bg-primary-900/20 px-1.5 py-0.5 rounded"
      >
        <button
          on:click={decrementQuantity}
          class="w-7 h-7 flex items-center justify-center text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-800 rounded transition-colors text-lg font-bold"
        >
          −
        </button>
        <span
          class="text-sm font-medium text-gray-900 dark:text-gray-100 min-w-[2.5rem] text-center"
        >
          {editQuantityValue}
          {item.unit || 'st'}
        </span>
        <button
          on:click={incrementQuantity}
          class="w-7 h-7 flex items-center justify-center text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-800 rounded transition-colors text-lg font-bold"
        >
          +
        </button>
        <button
          on:click={() => onUpdateQuantity(editQuantityValue)}
          class="ml-0.5 px-2 py-0.5 bg-primary-600 text-white rounded text-xs font-medium hover:bg-primary-700 transition-colors"
        >
          OK
        </button>
        <button
          on:click={onCancelEdit}
          class="px-1.5 py-0.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
        >
          ×
        </button>
      </div>
    {:else}
      <button
        on:click={onStartEdit}
        class="text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      >
        {item.quantity}
        {item.unit || 'st'}
      </button>
    {/if}
  {:else}
    <span class="text-sm text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
      {item.quantity}
      {item.unit || 'st'}
    </span>
  {/if}

  {#if !item.isBought}
    <button on:click={onDelete} class="text-red-500 hover:text-red-700 p-1" aria-label="Ta bort">
      🗑️
    </button>
  {:else}
    <span class="text-sm">{categoryIcon}</span>
  {/if}
</div>
