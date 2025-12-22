<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from '$lib/api/client';
  import { t } from '$lib/i18n';
  import { groceryWs } from '$lib/stores/groceryWs';
  import { currentFamily } from '$lib/stores/auth';
  import type { GroceryItem } from '$lib/types/grocery';

  interface FamilyMember {
    id: number;
    username: string;
    displayName: string | null;
    hasPassword: boolean;
    role: string | null;
    birthday: string | null;
    gender: string | null;
    avatarEmoji: string | null;
    color: string | null;
  }

  // Color mapping for member cards
  const colorClasses: Record<string, string> = {
    orange: 'bg-orange-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    green: 'bg-emerald-400',
    blue: 'bg-sky-400',
    purple: 'bg-violet-400',
    stone: 'bg-stone-400',
  };

  let apiStatus = 'Checking...';
  let groceryItems: GroceryItem[] = [];
  let loadingGroceries = true;
  let familyMembers: FamilyMember[] = [];
  let loadingMembers = true;

  // TODO: This will be replaced with actual task assignments from API
  // For now, simulate notification counts per user
  let memberNotifications: Record<number, number> = {};

  interface ApiInfo {
    name: string;
    version: string;
    status: string;
  }

  $: pendingItems = groceryItems.filter((i) => !i.isBought);
  $: pendingCount = pendingItems.length;

  // Get the most recent item to show who updated the list
  $: latestItem =
    groceryItems.length > 0
      ? groceryItems.reduce((latest, item) => {
          const latestDate = new Date(latest.updatedAt || latest.createdAt);
          const itemDate = new Date(item.updatedAt || item.createdAt);
          return itemDate > latestDate ? item : latest;
        })
      : null;

  function timeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just nu';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min sedan`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} tim sedan`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} dagar sedan`;
    return date.toLocaleDateString('sv-SE');
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
    // Fetch API status, groceries, and family members
    (async () => {
      try {
        const data = await get<ApiInfo>('');
        apiStatus = `Connected - ${data.name} v${data.version}`;
      } catch {
        apiStatus = 'Cannot reach API (is it running?)';
      }

      try {
        const groceriesRes = await get<{ success: boolean; items: GroceryItem[] }>('/groceries');
        groceryItems = groceriesRes.items;
      } catch {
        // Ignore errors
      } finally {
        loadingGroceries = false;
      }

      // Fetch family members
      if ($currentFamily) {
        try {
          const membersRes = await get<{ users: FamilyMember[] }>(
            `/families/${$currentFamily.id}/users`
          );
          familyMembers = membersRes.users || [];
          // TODO: Fetch actual task assignments - for now just simulate with pending grocery count for first member
          if (familyMembers.length > 0 && pendingCount > 0) {
            memberNotifications = { [familyMembers[0].id]: pendingCount };
          }
        } catch {
          // Ignore errors
        } finally {
          loadingMembers = false;
        }
      } else {
        loadingMembers = false;
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

    <!-- Main Content - Activity Feed -->
    <div class="flex-1 min-w-0">
      <div
        class="bg-white/90 dark:bg-stone-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-orange-200 dark:border-stone-700 p-6"
      >
        <h2 class="text-lg font-bold text-stone-800 dark:text-white mb-4">Aktivitet</h2>

        {#if loadingGroceries}
          <div class="text-center py-4">
            <div
              class="animate-spin w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full mx-auto"
            ></div>
          </div>
        {:else if pendingCount > 0}
          <!-- Grocery List Activity Card -->
          <a
            href="/groceries"
            class="block p-4 bg-stone-50 dark:bg-stone-700/50 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">🛒</span>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-stone-800 dark:text-stone-200">
                  Inköpslista
                  <span class="text-orange-500 dark:text-amber-400">({pendingCount} varor)</span>
                </p>
                {#if latestItem}
                  <p class="text-sm text-stone-500 dark:text-stone-400 truncate">
                    Uppdaterad av {latestItem.addedBy?.name || 'någon'}, {timeAgo(
                      latestItem.updatedAt || latestItem.createdAt
                    )}
                  </p>
                {/if}
              </div>
              <span class="text-stone-400">→</span>
            </div>
          </a>
        {:else}
          <p class="text-stone-500 dark:text-stone-400 text-sm py-4">Ingen aktivitet just nu</p>
        {/if}
      </div>
    </div>

    <!-- API Status - Bottom Right Corner -->
    <div class="fixed bottom-2 right-2 text-[10px] text-stone-400 dark:text-stone-600">
      {apiStatus}
    </div>
  </div>
</main>
