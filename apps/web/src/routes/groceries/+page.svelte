<script lang="ts">
  import { onMount, afterUpdate, onDestroy } from 'svelte';
  import { get, post, patch, del, ApiError } from '$lib/api/client';
  import { t } from '$lib/i18n';
  import { searchSuggestions, type GrocerySuggestion } from '$lib/data/grocerySuggestions';
  import type { GroceryItem, CategoryInfo } from '$lib/types/grocery';
  import {
    getCategoryIcon as getIcon,
    groupItemsByCategory,
    loadCategoryOrder,
    saveCategoryOrder,
    initializeCategoryOrder,
  } from '$lib/utils/groceryHelpers';
  import AutocompleteDropdown from '$lib/components/AutocompleteDropdown.svelte';
  import CategorySection from '$lib/components/CategorySection.svelte';
  import GroceryItemRow from '$lib/components/GroceryItemRow.svelte';
  import { groceryWs } from '$lib/stores/groceryWs';

  let items: GroceryItem[] = [];
  let categories: CategoryInfo[] = [];
  let loading = true;
  let error = '';
  let newItemName = '';
  let newItemCategory = 'other';
  let newItemQuantity = 1;
  let showBought = false;
  let filterCategory: string | null = null;
  let adding = false;
  let editingQuantityId: number | null = null;
  let editQuantityValue = 1;

  // Autocomplete state
  let showSuggestions = false;
  let suggestions: GrocerySuggestion[] = [];
  let selectedSuggestionIndex = -1;
  let inputElement: HTMLInputElement;

  // Category order customization
  let categoryOrder: string[] = [];
  let draggingCategoryIndex: number | null = null;

  // Reactive suggestions
  $: {
    suggestions = searchSuggestions(newItemName, 8);
    // Reset selection when suggestions change
    selectedSuggestionIndex = suggestions.length > 0 ? 0 : -1;
  }

  // Reactive derived values
  $: pendingItems = items.filter((i) => !i.isBought);
  $: boughtItems = items.filter((i) => i.isBought);
  $: filteredPendingItems = filterCategory
    ? pendingItems.filter((i) => i.category === filterCategory)
    : pendingItems;
  $: filteredBoughtItems = filterCategory
    ? boughtItems.filter((i) => i.category === filterCategory)
    : boughtItems;

  $: groupedPendingItems = groupItemsByCategory(filteredPendingItems, categories, categoryOrder);

  function getCategoryIcon(categoryName: string): string {
    return getIcon(categories, categoryName);
  }

  function getCategoryTranslation(categoryName: string): string {
    const key = `category.${categoryName}` as any;
    return $t(key);
  }

  async function loadData() {
    loading = true;
    error = '';
    try {
      const [groceriesRes, categoriesRes] = await Promise.all([
        get<{ success: boolean; items: GroceryItem[] }>('/groceries'),
        get<{ success: boolean; categories: CategoryInfo[] }>('/groceries/categories'),
      ]);
      items = groceriesRes.items;
      categories = categoriesRes.categories;
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.statusCode === 401) {
          window.location.href = '/';
          return;
        }
        error = e.message;
      } else {
        error = 'Failed to load groceries';
      }
    } finally {
      loading = false;
    }
  }

  async function addItem(e: Event) {
    e.preventDefault();
    if (!newItemName.trim() || adding) return;

    adding = true;
    try {
      const res = await post<{ success: boolean; item: GroceryItem }>('/groceries', {
        name: newItemName.trim(),
        category: newItemCategory,
        quantity: newItemQuantity,
      });
      items = [res.item, ...items];
      newItemName = '';
      newItemQuantity = 1;
    } catch (e) {
      if (e instanceof ApiError) {
        error = e.message;
      } else {
        error = 'Failed to add item';
      }
    } finally {
      adding = false;
    }
  }

  async function toggleBought(itemId: number) {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const newBoughtState = !item.isBought;
    // Optimistic update
    items = items.map((i) => (i.id === item.id ? { ...i, isBought: newBoughtState } : i));

    try {
      await patch<{ success: boolean; item: GroceryItem }>(`/groceries/${item.id}`, {
        isBought: newBoughtState,
      });
    } catch (e) {
      // Revert on error
      items = items.map((i) => (i.id === item.id ? { ...i, isBought: !newBoughtState } : i));
      if (e instanceof ApiError) {
        error = e.message;
      }
    }
  }

  async function deleteItem(itemId: number) {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    // Optimistic update
    const oldItems = items;
    items = items.filter((i) => i.id !== item.id);

    try {
      await del<{ success: boolean }>(`/groceries/${item.id}`);
    } catch (e) {
      // Revert on error
      items = oldItems;
      if (e instanceof ApiError) {
        error = e.message;
      }
    }
  }

  async function clearBoughtItems() {
    if (!confirm('Clear all bought items?')) return;

    try {
      await post<{ success: boolean; count: number }>('/groceries/clear-bought');
      items = items.filter((i) => !i.isBought);
    } catch (e) {
      if (e instanceof ApiError) {
        error = e.message;
      }
    }
  }

  async function updateQuantity(itemId: number, newQuantity: number) {
    if (newQuantity < 1 || newQuantity > 99) return;

    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    // Optimistic update
    const oldItems = items;
    items = items.map((i) => (i.id === item.id ? { ...i, quantity: newQuantity } : i));
    editingQuantityId = null;

    try {
      await patch<{ success: boolean; item: GroceryItem }>(`/groceries/${item.id}`, {
        quantity: newQuantity,
      });
    } catch (e) {
      // Revert on error
      items = oldItems;
      if (e instanceof ApiError) {
        error = e.message;
      }
    }
  }

  function startEditingQuantity(itemId: number, quantity: number) {
    editingQuantityId = itemId;
    editQuantityValue = quantity;
  }

  function cancelEditingQuantity() {
    editingQuantityId = null;
  }

  // Autocomplete functions
  function selectSuggestion(suggestion: GrocerySuggestion) {
    newItemName = suggestion.name;
    newItemCategory = suggestion.category;
    if (suggestion.defaultQuantity) {
      newItemQuantity = suggestion.defaultQuantity;
    }
    showSuggestions = false;
    selectedSuggestionIndex = -1;
  }

  function handleInputKeydown(e: KeyboardEvent) {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, suggestions.length - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, 0);
        break;
      case 'Enter':
        if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
          e.preventDefault();
          selectSuggestion(suggestions[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        showSuggestions = false;
        selectedSuggestionIndex = -1;
        break;
    }
  }

  function handleInputFocus() {
    if (newItemName.length >= 1 && suggestions.length > 0) {
      showSuggestions = true;
    }
  }

  function handleInputBlur() {
    // Delay to allow click on suggestion
    setTimeout(() => {
      showSuggestions = false;
    }, 200);
  }

  function handleInput() {
    if (newItemName.length >= 1 && suggestions.length > 0) {
      showSuggestions = true;
    } else {
      showSuggestions = false;
    }
  }

  // Category drag and drop
  function handleCategoryDragStart(e: DragEvent, index: number) {
    draggingCategoryIndex = index;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      // Hide the default transparent ghost image
      const emptyImage = new Image();
      emptyImage.src =
        'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      e.dataTransfer.setDragImage(emptyImage, 0, 0);
    }
  }

  function handleCategoryDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    if (draggingCategoryIndex === null || draggingCategoryIndex === index) return;

    // Reorder categories
    const newOrder = [...categoryOrder];
    const [removed] = newOrder.splice(draggingCategoryIndex, 1);
    newOrder.splice(index, 0, removed);
    categoryOrder = newOrder;
    draggingCategoryIndex = index;

    // Save to localStorage
    saveCategoryOrder(categoryOrder);
  }

  function handleCategoryDragEnd() {
    draggingCategoryIndex = null;
  }

  onMount(() => {
    categoryOrder = loadCategoryOrder();
    loadData();

    // Connect to WebSocket
    groceryWs.connect();

    // Subscribe to WebSocket messages
    const unsubscribe = groceryWs.subscribe((state: { status: string; lastMessage: any }) => {
      if (state.lastMessage) {
        handleWebSocketMessage(state.lastMessage);
      }
    });

    return () => {
      unsubscribe();
    };
  });

  onDestroy(() => {
    groceryWs.disconnect();
  });

  // Handle incoming WebSocket messages
  function handleWebSocketMessage(message: any) {
    switch (message.type) {
      case 'grocery:added':
        // Add new item if it doesn't exist
        const newItem = message.payload.item;
        if (!items.find((i) => i.id === newItem.id)) {
          items = [newItem, ...items];
        }
        break;

      case 'grocery:updated':
        // Update existing item
        const updatedItem = message.payload.item;
        items = items.map((i) => (i.id === updatedItem.id ? updatedItem : i));
        break;

      case 'grocery:deleted':
        // Remove deleted item
        const deletedId = message.payload.id;
        items = items.filter((i) => i.id !== deletedId);
        break;

      case 'grocery:cleared':
        // Remove all bought items
        items = items.filter((i) => !i.isBought);
        break;
    }
  }

  // Update category order when new categories appear
  afterUpdate(() => {
    if (groupedPendingItems.length > 0 && categoryOrder.length > 0) {
      const newOrder = initializeCategoryOrder(categoryOrder, groupedPendingItems);
      if (newOrder.length > categoryOrder.length) {
        categoryOrder = newOrder;
        saveCategoryOrder(categoryOrder);
      }
    }
  });
</script>

<svelte:head>
  <title>Groceries - Family Hub</title>
</svelte:head>

<main class="flex-1 p-4 pb-24">
  <div class="max-w-2xl mx-auto">
    <header class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-bold">🛒 {$t('groceries.title')}</h1>
        <!-- Connection status indicator -->
        <div class="flex items-center gap-1.5">
          {#if $groceryWs.status === 'connected'}
            <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Ansluten"></div>
          {:else if $groceryWs.status === 'connecting'}
            <div class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" title="Ansluter..."></div>
          {:else if $groceryWs.status === 'error'}
            <div class="w-2 h-2 bg-red-500 rounded-full" title="Anslutningsfel"></div>
          {:else}
            <div class="w-2 h-2 bg-gray-400 rounded-full" title="Frånkopplad"></div>
          {/if}
        </div>
      </div>
      <a href="/" class="text-orange-500 hover:text-orange-600 dark:text-amber-400 dark:hover:text-amber-500 hover:underline text-sm">← Tillbaka</a>
    </header>

    {#if error}
      <div class="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded-lg mb-4">
        {error}
        <button class="ml-2 underline" on:click={() => (error = '')}>Stäng</button>
      </div>
    {/if}

    {#if loading}
      <div class="card p-8 text-center">
        <div
          class="animate-spin w-8 h-8 border-4 border-orange-400 border-t-transparent dark:border-amber-400 dark:border-t-transparent rounded-full mx-auto"
        ></div>
        <p class="mt-4 text-stone-500 dark:text-stone-400">Laddar...</p>
      </div>
    {:else}
      <!-- Add item form -->
      <form on:submit={addItem} class="card p-4 mb-4">
        <div class="flex gap-2 relative">
          <div class="flex-1 relative">
            <input
              type="text"
              bind:value={newItemName}
              bind:this={inputElement}
              placeholder={$t('groceries.addPlaceholder')}
              class="w-full input"
              disabled={adding}
              on:keydown={handleInputKeydown}
              on:focus={handleInputFocus}
              on:blur={handleInputBlur}
              on:input={handleInput}
              autocomplete="off"
            />

            <!-- Autocomplete dropdown -->
            {#if showSuggestions && suggestions.length > 0}
              <AutocompleteDropdown
                {suggestions}
                selectedIndex={selectedSuggestionIndex}
                {getCategoryIcon}
                {getCategoryTranslation}
                onSelectSuggestion={selectSuggestion}
              />
            {/if}
          </div>
          <button type="submit" class="btn btn-primary" disabled={adding || !newItemName.trim()}>
            {adding ? '...' : '+'}
          </button>
        </div>

        <div class="flex gap-2 mt-3">
          <select bind:value={newItemCategory} class="input flex-1">
            {#each categories as cat}
              <option value={cat.name}>{cat.icon} {getCategoryTranslation(cat.name)}</option>
            {/each}
          </select>
          <input
            type="number"
            bind:value={newItemQuantity}
            min="1"
            max="99"
            class="input w-16 text-center"
          />
        </div>
      </form>

      <!-- Category filter -->
      <div class="flex gap-2 mb-4 overflow-x-auto pb-2">
        <button
          class="px-3 py-1 rounded-full text-sm whitespace-nowrap {filterCategory === null
            ? 'bg-primary-600 text-white'
            : 'bg-gray-200 dark:bg-gray-700'}"
          on:click={() => (filterCategory = null)}
        >
          {$t('groceries.filterAll')} ({pendingItems.length})
        </button>
        {#each categories as cat}
          {@const count = pendingItems.filter((i) => i.category === cat.name).length}
          {#if count > 0}
            <button
              class="px-3 py-1 rounded-full text-sm whitespace-nowrap {filterCategory === cat.name
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700'}"
              on:click={() => (filterCategory = filterCategory === cat.name ? null : cat.name)}
            >
              {cat.icon}
              {count}
            </button>
          {/if}
        {/each}
      </div>

      <!-- Pending items grouped by category -->
      {#if filteredPendingItems.length === 0}
        <div class="card p-8 text-center text-stone-500 dark:text-stone-400">
          <p class="text-4xl mb-2">🎉</p>
          <p>{$t('groceries.emptyList')}</p>
        </div>
      {:else}
        {#each groupedPendingItems as group, index}
          <CategorySection
            {group}
            {index}
            draggingIndex={draggingCategoryIndex}
            {editingQuantityId}
            bind:editQuantityValue
            {getCategoryIcon}
            {getCategoryTranslation}
            onDragStart={(e) => handleCategoryDragStart(e, index)}
            onDragOver={(e) => handleCategoryDragOver(e, index)}
            onDragEnd={handleCategoryDragEnd}
            onToggleBought={toggleBought}
            onDelete={deleteItem}
            onStartEdit={startEditingQuantity}
            onUpdateQuantity={updateQuantity}
            onCancelEdit={cancelEditingQuantity}
          />
        {/each}
      {/if}

      <!-- Bought items section -->
      {#if boughtItems.length > 0}
        <div class="mt-6">
          <button
            on:click={() => (showBought = !showBought)}
            class="flex items-center gap-2 text-stone-500 dark:text-stone-400 mb-2 w-full"
          >
            <span class="text-sm">{showBought ? '▼' : '▶'}</span>
            <span class="text-sm font-semibold">Köpta ({boughtItems.length})</span>
            {#if showBought}
              <button
                on:click|stopPropagation={clearBoughtItems}
                class="ml-auto text-xs text-red-500 hover:text-red-700"
              >
                {$t('groceries.clearBought')}
              </button>
            {/if}
          </button>

          {#if showBought}
            <div class="card divide-y divide-gray-200 dark:divide-gray-700 opacity-60">
              {#each filteredBoughtItems as item (item.id)}
                <GroceryItemRow
                  {item}
                  {editingQuantityId}
                  bind:editQuantityValue
                  categoryIcon={getCategoryIcon(item.category)}
                  onToggleBought={() => toggleBought(item.id)}
                  onDelete={() => deleteItem(item.id)}
                  onStartEdit={() => startEditingQuantity(item.id, item.quantity)}
                  onUpdateQuantity={(val) => updateQuantity(item.id, val)}
                  onCancelEdit={cancelEditingQuantity}
                />
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    {/if}
  </div>
</main>
