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
    loadCollapsedCategories,
    saveCollapsedCategories,
    initializeCategoryOrder,
  } from '$lib/utils/groceryHelpers';
  import AutocompleteDropdown from '$lib/components/AutocompleteDropdown.svelte';
  import CategorySection from '$lib/components/CategorySection.svelte';
  import GroceryItemRow from '$lib/components/GroceryItemRow.svelte';
  import { groceryWs } from '$lib/stores/groceryWs';
  import type { WsMessage } from '$lib/websocket/client';
  import { currentFamily } from '$lib/stores/auth';

  interface GroceryAssignment {
    id: number;
    familyId: number;
    userId: number;
    assignedBy: number | null;
    createdAt: string;
    userDisplayName: string | null;
    userAvatarEmoji: string | null;
    userColor: string | null;
  }

  interface FamilyMember {
    id: number;
    displayName: string | null;
    avatarEmoji: string | null;
    color: string | null;
    role: string | null;
  }

  let items: GroceryItem[] = [];
  let categories: CategoryInfo[] = [];
  let assignments: GroceryAssignment[] = [];
  let familyMembers: FamilyMember[] = [];
  let loading = true;
  let error = '';
  let newItemName = '';
  let newItemCategory = 'other';
  let newItemQuantity = 1;
  let newItemUnit = 'st';
  let showBought = false;
  let showFavoritesOnly = false;
  let filterCategory: string | null = null;
  let adding = false;
  let editingQuantityId: number | null = null;
  let editQuantityValue = 1;
  let showAssignmentPanel = false;
  let showStaplesPanel = false;
  let staples: GroceryItem[] = [];
  let loadingStaples = false;

  // Autocomplete state
  let showSuggestions = false;
  let suggestions: GrocerySuggestion[] = [];
  let selectedSuggestionIndex = -1;
  let inputElement: HTMLInputElement;

  // Category order customization
  let categoryOrder: string[] = [];
  let draggingCategoryIndex: number | null = null;
  let collapsedCategories: Set<string> = new Set();

  function toggleCategoryCollapse(categoryName: string) {
    if (collapsedCategories.has(categoryName)) {
      collapsedCategories.delete(categoryName);
    } else {
      collapsedCategories.add(categoryName);
    }
    collapsedCategories = collapsedCategories; // trigger reactivity
    saveCollapsedCategories(collapsedCategories);
  }

  // Reactive suggestions
  $: {
    suggestions = searchSuggestions(newItemName, 8);
    // Reset selection when suggestions change
    selectedSuggestionIndex = suggestions.length > 0 ? 0 : -1;
  }

  // Reactive derived values
  $: pendingItems = items.filter((i) => !i.isBought);
  $: boughtItems = items.filter((i) => i.isBought);
  $: favoriteItems = items.filter((i) => i.isFavorite && !i.isBought);
  $: filteredPendingItems = showFavoritesOnly
    ? favoriteItems.filter((i) => !filterCategory || i.category === filterCategory)
    : filterCategory
      ? pendingItems.filter((i) => i.category === filterCategory)
      : pendingItems;
  $: filteredBoughtItems = filterCategory
    ? boughtItems.filter((i) => i.category === filterCategory)
    : boughtItems;

  // Track which staple names are currently on the list (for reactive UI updates)
  $: itemNamesOnList = new Set(pendingItems.map((i) => i.name.toLowerCase()));

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
      const [groceriesRes, categoriesRes, assignmentsRes] = await Promise.all([
        get<{ success: boolean; items: GroceryItem[] }>('/groceries'),
        get<{ success: boolean; categories: CategoryInfo[] }>('/groceries/categories'),
        get<{ success: boolean; assignments: GroceryAssignment[] }>('/groceries/assignments'),
      ]);
      items = groceriesRes.items;
      categories = categoriesRes.categories;
      assignments = assignmentsRes.assignments;

      // Load family members separately using the correct endpoint
      if ($currentFamily) {
        try {
          const membersRes = await get<{ users: FamilyMember[] }>(
            `/families/${$currentFamily.id}/users`
          );
          familyMembers = membersRes.users || [];
        } catch {
          // Ignore - family members are optional for this page
        }
      }
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
      // Don't add item locally - WebSocket will handle it
      // This prevents duplication when WebSocket message arrives before POST response
      await post<{ success: boolean; item: GroceryItem }>('/groceries', {
        name: newItemName.trim(),
        category: newItemCategory,
        quantity: newItemQuantity,
        unit: newItemUnit,
      });
      newItemName = '';
      newItemQuantity = 1;
      newItemUnit = 'st';
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

  // Track in-flight toggles to prevent double-clicks
  let toggleInFlight = new Set<number>();

  async function toggleBought(itemId: number) {
    // Prevent multiple clicks while request is in flight
    if (toggleInFlight.has(itemId)) return;

    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    toggleInFlight.add(itemId);
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
    } finally {
      toggleInFlight.delete(itemId);
    }
  }

  async function toggleFavorite(itemId: number) {
    // Prevent multiple clicks while request is in flight
    if (toggleInFlight.has(itemId)) return;

    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    toggleInFlight.add(itemId);
    const newFavoriteState = !item.isFavorite;
    // Optimistic update
    items = items.map((i) => (i.id === item.id ? { ...i, isFavorite: newFavoriteState } : i));

    try {
      await patch<{ success: boolean; item: GroceryItem }>(`/groceries/${item.id}`, {
        isFavorite: newFavoriteState,
      });
    } catch (e) {
      // Revert on error
      items = items.map((i) => (i.id === item.id ? { ...i, isFavorite: !newFavoriteState } : i));
      if (e instanceof ApiError) {
        error = e.message;
      }
    } finally {
      toggleInFlight.delete(itemId);
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
      // Filter out bought items that are NOT favorites
      // Favorites will be reset to not-bought state by the API
      items = items.filter((i) => !i.isBought || i.isFavorite).map((i) => 
        i.isBought && i.isFavorite ? { ...i, isBought: false, boughtBy: null, boughtAt: null } : i
      );
    } catch (e) {
      if (e instanceof ApiError) {
        error = e.message;
      }
    }
  }

  // Staples (Basvaror) functions
  async function loadStaples() {
    loadingStaples = true;
    try {
      const res = await get<{ success: boolean; items: GroceryItem[] }>('/groceries/favorites');
      staples = res.items;
    } catch (e) {
      if (e instanceof ApiError) {
        error = e.message;
      }
    } finally {
      loadingStaples = false;
    }
  }

  async function addStapleToList(staple: GroceryItem) {
    // Check if item already exists on the list (not bought)
    if (isStapleOnList(staple.name)) {
      return; // Already on list
    }

    try {
      await post<{ success: boolean; item: GroceryItem }>('/groceries', {
        name: staple.name,
        category: staple.category,
        quantity: staple.quantity,
        unit: staple.unit,
      });
      // WebSocket will add the item to the list
    } catch (e) {
      if (e instanceof ApiError) {
        error = e.message;
      }
    }
  }

  async function addAllStaplesToList() {
    const staplesToAdd = staples.filter((s) => !isStapleOnList(s.name));

    for (const staple of staplesToAdd) {
      await addStapleToList(staple);
    }
  }

  function isStapleOnList(stapleName: string): boolean {
    return itemNamesOnList.has(stapleName.toLowerCase());
  }

  function openStaplesPanel() {
    showStaplesPanel = true;
    loadStaples();
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

  // Assignment functions
  async function assignMember(userId: number) {
    try {
      const res = await post<{ success: boolean; assignment: GroceryAssignment }>(
        '/groceries/assignments',
        { userId }
      );
      if (res.success && res.assignment) {
        // Add to assignments if not already there
        if (!assignments.find((a) => a.userId === userId)) {
          assignments = [...assignments, res.assignment];
        }
      }
    } catch (e) {
      if (e instanceof ApiError) {
        error = e.message;
      }
    }
  }

  async function unassignMember(userId: number) {
    try {
      await del<{ success: boolean }>(`/groceries/assignments/${userId}`);
      assignments = assignments.filter((a) => a.userId !== userId);
    } catch (e) {
      if (e instanceof ApiError) {
        error = e.message;
      }
    }
  }

  // Reactive set of assigned user IDs for proper UI updates
  $: assignedUserIds = new Set(assignments.map((a) => a.userId));

  function toggleAssignment(userId: number) {
    if (assignedUserIds.has(userId)) {
      unassignMember(userId);
    } else {
      assignMember(userId);
    }
  }

  // Autocomplete functions
  function selectSuggestion(suggestion: GrocerySuggestion) {
    newItemName = suggestion.name;
    newItemCategory = suggestion.category;
    if (suggestion.defaultQuantity) {
      newItemQuantity = suggestion.defaultQuantity;
    }
    if (suggestion.unit) {
      newItemUnit = suggestion.unit;
    } else {
      newItemUnit = 'st';
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

  // Smart quantity stepping based on unit
  function getQuantityStep(currentValue: number, unit: string, increasing: boolean): number {
    // For weight units (kg), use smart stepping
    if (unit === 'kg') {
      if (increasing) {
        if (currentValue < 2) return 0.2;
        if (currentValue < 3) return 0.5;
        return 1;
      } else {
        if (currentValue <= 2) return 0.2;
        if (currentValue <= 3) return 0.5;
        return 1;
      }
    }
    // For volume units (l, dl), similar smart stepping
    if (unit === 'l') {
      if (increasing) {
        if (currentValue < 2) return 0.5;
        return 1;
      } else {
        if (currentValue <= 2) return 0.5;
        return 1;
      }
    }
    if (unit === 'dl') {
      return 1; // 1 dl steps
    }
    // For grams, step by 50 up to 500, then 100
    if (unit === 'g') {
      if (increasing) {
        if (currentValue < 500) return 50;
        return 100;
      } else {
        if (currentValue <= 500) return 50;
        return 100;
      }
    }
    // For all other units (st, burk, förp, etc.), step by 1
    return 1;
  }

  function incrementQuantity() {
    const step = getQuantityStep(newItemQuantity, newItemUnit, true);
    newItemQuantity = Math.round((newItemQuantity + step) * 10) / 10; // Round to 1 decimal
  }

  function decrementQuantity() {
    const step = getQuantityStep(newItemQuantity, newItemUnit, false);
    const minValue = newItemUnit === 'kg' || newItemUnit === 'l' ? 0.2 : 1;
    newItemQuantity = Math.max(minValue, Math.round((newItemQuantity - step) * 10) / 10);
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
    collapsedCategories = loadCollapsedCategories();
    loadData();

    // Connect to WebSocket
    groceryWs.connect();

    // Subscribe to WebSocket messages
    const unsubscribe = groceryWs.subscribe((state) => {
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
  function handleWebSocketMessage(message: WsMessage) {
    const payload = message.payload as Record<string, unknown>;
    switch (message.type) {
      case 'grocery:added':
        // Add new item if it doesn't exist
        const newItem = (payload as { item: GroceryItem }).item;
        if (!items.find((i) => i.id === newItem.id)) {
          items = [newItem, ...items];
        }
        break;

      case 'grocery:updated':
        // Update existing item - skip if item is currently being toggled to prevent race condition
        const updatedItem = (payload as { item: GroceryItem }).item;
        if (toggleInFlight.has(updatedItem.id)) break;
        items = items.map((i) => (i.id === updatedItem.id ? updatedItem : i));
        break;

      case 'grocery:deleted':
        // Remove deleted item
        const deletedId = (payload as { id: number }).id;
        items = items.filter((i) => i.id !== deletedId);
        break;

      case 'grocery:cleared':
        // Remove all bought items
        items = items.filter((i) => !i.isBought);
        break;

      case 'grocery:assigned':
        // Add new assignment
        const assignedPayload = payload as { userId: number; assignedBy: number | null };
        const assignedUserId = assignedPayload.userId;
        if (!assignments.find((a) => a.userId === assignedUserId)) {
          const member = familyMembers.find((m) => m.id === assignedUserId);
          if (member) {
            assignments = [
              ...assignments,
              {
                id: 0,
                familyId: 0,
                userId: assignedUserId,
                assignedBy: assignedPayload.assignedBy,
                createdAt: new Date().toISOString(),
                userDisplayName: member.displayName,
                userAvatarEmoji: member.avatarEmoji,
                userColor: member.color,
              },
            ];
          }
        }
        break;

      case 'grocery:unassigned':
        // Remove assignment
        const unassignedUserId = (payload as { userId: number }).userId;
        assignments = assignments.filter((a) => a.userId !== unassignedUserId);
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
        <!-- Assignment button - next to title -->
        <button
          on:click={() => (showAssignmentPanel = !showAssignmentPanel)}
          class="relative flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
          title="Tilldela handlingslistan"
        >
          <span class="text-base">🏷️</span>
          {#if assignments.length > 0}
            <span
              class="absolute -top-1 -right-1 bg-primary-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium text-[10px]"
            >
              {assignments.length}
            </span>
          {/if}
        </button>
        <!-- Preferences link -->
        <a
          href="/groceries/preferences"
          class="flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors text-stone-600 dark:text-stone-300 text-sm"
          title={$t('preferences.title')}
        >
          <span class="text-base">🍽️</span>
        </a>
        <!-- Menu link -->
        <a
          href="/groceries/menu"
          class="flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 hover:from-orange-200 hover:to-amber-200 dark:hover:from-orange-800/30 dark:hover:to-amber-800/30 transition-colors text-orange-700 dark:text-orange-300 text-sm border border-orange-200 dark:border-orange-800"
          title={$t('menu.title')}
        >
          <span class="text-base">🤖</span>
          <span class="hidden sm:inline">AI</span>
        </a>
        <!-- Basvaror (Staples) button -->
        <button
          on:click={openStaplesPanel}
          class="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-800/30 transition-colors text-amber-700 dark:text-amber-300 text-sm border border-amber-200 dark:border-amber-800"
          title={$t('groceries.staples')}
        >
          <span class="text-base">⭐</span>
          <span class="hidden sm:inline">{$t('groceries.staples')}</span>
        </button>
        <!-- Connection status indicator -->
        <div class="flex items-center gap-1.5">
          {#if $groceryWs.status === 'connected'}
            <div
              class="w-2 h-2 bg-green-500 rounded-full animate-pulse"
              title={$t('calendar.connectionStatus')}
            ></div>
          {:else if $groceryWs.status === 'connecting'}
            <div
              class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"
              title={$t('groceries.connecting')}
            ></div>
          {:else if $groceryWs.status === 'error'}
            <div
              class="w-2 h-2 bg-red-500 rounded-full"
              title={$t('groceries.connectionError')}
            ></div>
          {:else}
            <div
              class="w-2 h-2 bg-gray-400 rounded-full"
              title={$t('groceries.disconnected')}
            ></div>
          {/if}
        </div>
      </div>
      <a
        href="/"
        class="text-orange-500 hover:text-orange-600 dark:text-amber-400 dark:hover:text-amber-500 hover:underline text-sm"
        >← Tillbaka</a
      >
    </header>

    <!-- Assignment panel -->
    {#if showAssignmentPanel}
      <div class="card p-4 mb-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-semibold text-stone-700 dark:text-stone-200">
            📋 Tilldela handlingslistan
          </h3>
          <button
            on:click={() => (showAssignmentPanel = false)}
            class="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
          >
            ✕
          </button>
        </div>
        <p class="text-sm text-stone-500 dark:text-stone-400 mb-3">Välj vem som ska handla idag:</p>
        <div class="flex flex-wrap gap-2">
          {#each familyMembers as member}
            {@const assigned = assignedUserIds.has(member.id)}
            <button
              on:click={() => toggleAssignment(member.id)}
              class="flex items-center gap-2 px-3 py-2 rounded-lg transition-all {assigned
                ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/30'
                : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700'}"
            >
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                style="background-color: {member.color || '#9CA3AF'}"
              >
                {member.avatarEmoji || '👤'}
              </div>
              <span class="text-sm font-medium">{member.displayName || 'Anonym'}</span>
              {#if assigned}
                <span class="text-green-500 text-lg">✓</span>
              {/if}
            </button>
          {/each}
        </div>
        {#if assignments.length > 0}
          <div class="mt-3 pt-3 border-t border-stone-200 dark:border-stone-700">
            <p class="text-sm text-stone-600 dark:text-stone-300">
              <span class="font-medium">Tilldelad:</span>
              {assignments.map((a) => a.userDisplayName || 'Anonym').join(', ')}
            </p>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Show assigned members summary if any -->
    {#if assignments.length > 0 && !showAssignmentPanel}
      <div class="flex items-center gap-2 mb-4 p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
        <span class="text-sm text-stone-600 dark:text-stone-300">{$t('groceries.assigned')}</span>
        <div class="flex -space-x-2">
          {#each assignments as assignment}
            <div
              class="w-7 h-7 rounded-full flex items-center justify-center text-sm ring-2 ring-white dark:ring-stone-900"
              style="background-color: {assignment.userColor || '#9CA3AF'}"
              title={assignment.userDisplayName || $t('groceries.anonymous')}
            >
              {assignment.userAvatarEmoji || '👤'}
            </div>
          {/each}
        </div>
        <button
          on:click={() => (showAssignmentPanel = true)}
          class="ml-auto text-xs text-primary-600 dark:text-primary-400 hover:underline"
        >
          {$t('groceries.change')}
        </button>
      </div>
    {/if}

    <!-- Staples (Basvaror) panel -->
    {#if showStaplesPanel}
      <div class="card p-4 mb-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-semibold text-stone-700 dark:text-stone-200">
            ⭐ {$t('groceries.staples')}
          </h3>
          <button
            on:click={() => (showStaplesPanel = false)}
            class="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
          >
            ✕
          </button>
        </div>
        <p class="text-sm text-stone-500 dark:text-stone-400 mb-3">{$t('groceries.staplesDescription')}</p>
        
        {#if loadingStaples}
          <div class="flex justify-center py-4">
            <div class="animate-spin w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full"></div>
          </div>
        {:else if staples.length === 0}
          <div class="text-center py-4 text-stone-400 dark:text-stone-500">
            <p class="text-2xl mb-2">⭐</p>
            <p class="text-sm">{$t('groceries.noStaples')}</p>
            <p class="text-xs mt-1">{$t('groceries.noStaplesHint')}</p>
          </div>
        {:else}
          <div class="space-y-2 max-h-64 overflow-y-auto">
            {#each staples as staple (staple.id)}
              {@const onList = isStapleOnList(staple.name)}
              <div class="flex items-center justify-between p-2 rounded-lg bg-stone-50 dark:bg-stone-800/50">
                <div class="flex items-center gap-2">
                  <span class="text-lg">{getCategoryIcon(staple.category)}</span>
                  <span class="text-sm font-medium text-stone-700 dark:text-stone-200">{staple.name}</span>
                  <span class="text-xs text-stone-400">{staple.quantity} {staple.unit || 'st'}</span>
                </div>
                {#if onList}
                  <span class="text-xs text-green-600 dark:text-green-400 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded">
                    ✓ {$t('groceries.onList')}
                  </span>
                {:else}
                  <button
                    on:click={() => addStapleToList(staple)}
                    class="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded hover:bg-amber-200 dark:hover:bg-amber-800/30 transition-colors"
                  >
                    + {$t('groceries.addToList')}
                  </button>
                {/if}
              </div>
            {/each}
          </div>
          {#if staples.some((s) => !isStapleOnList(s.name))}
            <div class="mt-3 pt-3 border-t border-stone-200 dark:border-stone-700">
              <button
                on:click={addAllStaplesToList}
                class="w-full py-2 px-4 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg font-medium text-sm transition-colors"
              >
                {$t('groceries.addAllStaples')}
              </button>
            </div>
          {/if}
        {/if}
      </div>
    {/if}

    {#if error}
      <div class="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded-lg mb-4">
        {error}
        <button class="ml-2 underline" on:click={() => (error = '')}>{$t('common.close')}</button>
      </div>
    {/if}

    {#if loading}
      <div class="card p-8 text-center">
        <div
          class="animate-spin w-8 h-8 border-4 border-orange-400 border-t-transparent dark:border-amber-400 dark:border-t-transparent rounded-full mx-auto"
        ></div>
        <p class="mt-4 text-stone-500 dark:text-stone-400">{$t('common.loading')}</p>
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
          <div class="flex items-center gap-1">
            <button
              type="button"
              on:click={decrementQuantity}
              class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center text-lg font-bold"
            >
              −
            </button>
            <span class="w-14 text-center font-medium">
              {newItemQuantity % 1 === 0 ? newItemQuantity : newItemQuantity.toFixed(1)}
              {newItemUnit}
            </span>
            <button
              type="button"
              on:click={incrementQuantity}
              class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center text-lg font-bold"
            >
              +
            </button>
          </div>
        </div>
      </form>

      <!-- Category filter -->
      <div class="flex gap-2 mb-4 overflow-x-auto pb-2">
        <button
          class="px-3 py-1 rounded-full text-sm whitespace-nowrap {filterCategory === null &&
          !showFavoritesOnly
            ? 'bg-primary-600 text-white'
            : 'bg-gray-200 dark:bg-gray-700'}"
          on:click={() => {
            filterCategory = null;
            showFavoritesOnly = false;
          }}
        >
          {$t('groceries.filterAll')} ({pendingItems.length})
        </button>
        <!-- Favorites filter button -->
        <button
          class="px-3 py-1 rounded-full text-sm whitespace-nowrap {showFavoritesOnly
            ? 'bg-yellow-500 text-white'
            : 'bg-gray-200 dark:bg-gray-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'}"
          on:click={() => {
            showFavoritesOnly = !showFavoritesOnly;
            filterCategory = null;
          }}
        >
          ⭐ {favoriteItems.length}
        </button>
        {#each categories as cat}
          {@const count = pendingItems.filter((i) => i.category === cat.name).length}
          {#if count > 0}
            <button
              class="px-3 py-1 rounded-full text-sm whitespace-nowrap {filterCategory ===
                cat.name && !showFavoritesOnly
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700'}"
              on:click={() => {
                filterCategory = filterCategory === cat.name ? null : cat.name;
                showFavoritesOnly = false;
              }}
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
            isCollapsed={collapsedCategories.has(group.category.name)}
            {getCategoryIcon}
            {getCategoryTranslation}
            onDragStart={(e) => handleCategoryDragStart(e, index)}
            onDragOver={(e) => handleCategoryDragOver(e, index)}
            onDragEnd={handleCategoryDragEnd}
            onToggleBought={toggleBought}
            onToggleFavorite={toggleFavorite}
            onDelete={deleteItem}
            onStartEdit={startEditingQuantity}
            onUpdateQuantity={updateQuantity}
            onCancelEdit={cancelEditingQuantity}
            onToggleCollapse={() => toggleCategoryCollapse(group.category.name)}
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
                  onToggleFavorite={() => toggleFavorite(item.id)}
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
