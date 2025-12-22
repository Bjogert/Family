<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get, patch } from '$lib/api/client';
  import { t } from '$lib/i18n';
  import { groceryWs } from '$lib/stores/groceryWs';
  import type { GroceryItem, CategoryInfo } from '$lib/types/grocery';

  let apiStatus = 'Checking...';
  let groceryItems: GroceryItem[] = [];
  let categories: CategoryInfo[] = [];
  let loadingGroceries = true;

  interface ApiInfo {
    name: string;
    version: string;
    status: string;
  }

  $: pendingItems = groceryItems.filter((i) => !i.isBought);
  $: pendingCount = pendingItems.length;

  function getCategoryIcon(categoryName: string): string {
    const cat = categories.find((c) => c.name === categoryName);
    return cat?.icon || '📦';
  }

  async function toggleBought(itemId: number) {
    const item = groceryItems.find((i) => i.id === itemId);
    if (!item) return;

    const newBoughtState = !item.isBought;
    groceryItems = groceryItems.map((i) => (i.id === item.id ? { ...i, isBought: newBoughtState } : i));

    try {
      await patch(`/groceries/${item.id}`, { isBought: newBoughtState });
    } catch {
      groceryItems = groceryItems.map((i) => (i.id === item.id ? { ...i, isBought: !newBoughtState } : i));
    }
  }

  function handleWebSocketMessage(message: any) {
    switch (message.type) {
      case 'grocery:added':
        const newItem = message.payload.item;
        if (!groceryItems.find((i) => i.id === newItem.id)) {
          groceryItems = [newItem, ...groceryItems];
        }
        break;
      case 'grocery:updated':
        const updatedItem = message.payload.item;
        groceryItems = groceryItems.map((i) => (i.id === updatedItem.id ? updatedItem : i));
        break;
      case 'grocery:deleted':
        const deletedId = message.payload.id;
        groceryItems = groceryItems.filter((i) => i.id !== deletedId);
        break;
      case 'grocery:cleared':
        groceryItems = groceryItems.filter((i) => !i.isBought);
        break;
    }
  }

  onMount(() => {
    // Fetch API status and groceries
    (async () => {
      try {
        const data = await get<ApiInfo>('');
        apiStatus = `Connected - ${data.name} v${data.version}`;
      } catch {
        apiStatus = 'Cannot reach API (is it running?)';
      }

      try {
        const [groceriesRes, categoriesRes] = await Promise.all([
          get<{ success: boolean; items: GroceryItem[] }>('/groceries'),
          get<{ success: boolean; categories: CategoryInfo[] }>('/groceries/categories'),
        ]);
        groceryItems = groceriesRes.items;
        categories = categoriesRes.categories;
      } catch {
        // Ignore errors
      } finally {
        loadingGroceries = false;
      }
    })();

    // Connect to WebSocket for real-time updates
    groceryWs.connect();
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
</script>

<svelte:head>
  <title>Family Hub</title>
</svelte:head>

<main
  class="flex-1 bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 dark:from-stone-900 dark:via-stone-800 dark:to-stone-900"
>
  <div class="h-full flex flex-col lg:flex-row gap-6 p-4 lg:p-6 max-w-7xl mx-auto">
    <!-- Left Sidebar - Navigation -->
    <aside class="lg:w-64 flex-shrink-0">
      <div
        class="bg-white/90 dark:bg-stone-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-orange-200 dark:border-stone-700 p-6"
      >
        <nav class="space-y-3">
          <a
            href="/groceries"
            class="flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-orange-400 to-amber-400 hover:from-orange-500 hover:to-amber-500 text-white font-medium rounded-lg shadow-md transition"
          >
            <span class="text-xl">🛒</span>
            <span>{$t('home.groceries')}</span>
          </a>

          <a
            href="/calendar"
            class="flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-orange-300 to-amber-300 hover:from-orange-400 hover:to-amber-400 text-stone-800 font-medium rounded-lg shadow-md transition"
          >
            <span class="text-xl">📅</span>
            <span>{$t('home.calendar')}</span>
          </a>
        </nav>
      </div>
    </aside>

    <!-- Main Content - Grocery List -->
    <div class="flex-1 min-w-0">
      <div
        class="bg-white/90 dark:bg-stone-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-orange-200 dark:border-stone-700 p-6"
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-bold text-stone-800 dark:text-white">
            🛒 Inköpslista
            {#if pendingCount > 0}
              <span class="text-base font-normal text-stone-500">({pendingCount})</span>
            {/if}
          </h2>
          <a
            href="/groceries"
            class="text-orange-500 hover:text-orange-600 dark:text-amber-400 text-sm"
          >
            Visa alla →
          </a>
        </div>

        {#if loadingGroceries}
          <div class="text-center py-8">
            <div class="animate-spin w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full mx-auto"></div>
          </div>
        {:else if pendingItems.length === 0}
          <div class="text-center py-8">
            <p class="text-4xl mb-2">🎉</p>
            <p class="text-stone-500 dark:text-stone-400">Inköpslistan är tom!</p>
            <a
              href="/groceries"
              class="inline-block mt-4 text-orange-500 hover:text-orange-600 dark:text-amber-400 text-sm"
            >
              + Lägg till varor
            </a>
          </div>
        {:else}
          <ul class="space-y-2">
            {#each pendingItems as item (item.id)}
              <li
                class="flex items-center gap-3 p-3 bg-stone-50 dark:bg-stone-700/50 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
              >
                <button
                  on:click={() => toggleBought(item.id)}
                  class="w-6 h-6 rounded-full border-2 border-stone-300 dark:border-stone-500 hover:border-orange-400 dark:hover:border-amber-400 flex items-center justify-center transition-colors"
                >
                  <!-- Empty circle for pending items -->
                </button>
                <span class="text-lg">{getCategoryIcon(item.category)}</span>
                <span class="flex-1 text-stone-800 dark:text-stone-200">{item.name}</span>
                {#if item.quantity > 1}
                  <span class="text-sm text-stone-500 dark:text-stone-400 bg-stone-200 dark:bg-stone-600 px-2 py-0.5 rounded">
                    {item.quantity} st
                  </span>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </div>

    <!-- API Status - Bottom Right Corner -->
    <div class="fixed bottom-2 right-2 text-[10px] text-stone-400 dark:text-stone-600">
      {apiStatus}
    </div>
  </div>
</main>
