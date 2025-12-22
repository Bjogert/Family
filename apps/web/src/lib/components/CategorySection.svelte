<script lang="ts">
  import type { GroupedCategory } from '$lib/types/grocery';
  import GroceryItemRow from './GroceryItemRow.svelte';

  export let group: GroupedCategory;
  export let index: number;
  export let draggingIndex: number | null;
  export let editingQuantityId: number | null;
  export let editQuantityValue: number;
  export let getCategoryIcon: (category: string) => string;
  export let getCategoryTranslation: (category: string) => string;
  export let onDragStart: (e: DragEvent) => void;
  export let onDragOver: (e: DragEvent) => void;
  export let onDragEnd: () => void;
  export let onToggleBought: (itemId: number) => void;
  export let onDelete: (itemId: number) => void;
  export let onStartEdit: (itemId: number, quantity: number) => void;
  export let onUpdateQuantity: (itemId: number, quantity: number) => void;
  export let onCancelEdit: () => void;
</script>

<div
  class="mb-3 transition-all duration-200 {draggingIndex === index
    ? 'scale-105 shadow-2xl bg-primary-50 dark:bg-primary-900/30 rounded-lg p-2 -mx-2'
    : ''}"
  draggable="true"
  role="button"
  tabindex="0"
  on:dragstart={onDragStart}
  on:dragover={onDragOver}
  on:dragend={onDragEnd}
>
  <h2
    class="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-2 cursor-move touch-none select-none"
  >
    <span class="text-lg">⋮⋮</span>
    <span>{group.category.icon}</span>
    <span class="capitalize">{getCategoryTranslation(group.category.name)}</span>
    <span class="text-xs">({group.items.length})</span>
  </h2>
  <div class="card divide-y divide-gray-200 dark:divide-gray-700">
    {#each group.items as item (item.id)}
      <GroceryItemRow
        {item}
        {editingQuantityId}
        bind:editQuantityValue
        categoryIcon={getCategoryIcon(item.category)}
        onToggleBought={() => onToggleBought(item.id)}
        onDelete={() => onDelete(item.id)}
        onStartEdit={() => onStartEdit(item.id, item.quantity)}
        onUpdateQuantity={(val) => onUpdateQuantity(item.id, val)}
        {onCancelEdit}
      />
    {/each}
  </div>
</div>
