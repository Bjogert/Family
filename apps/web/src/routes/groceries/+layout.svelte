<script lang="ts">
  import { page } from '$app/stores';
  import { t } from '$lib/i18n';
  import { groceryWs } from '$lib/stores/groceryWs';

  // Determine current page for highlighting
  $: currentPath = $page.url.pathname;
  $: isMainGroceryPage = currentPath === '/groceries';

  interface NavItem {
    href: string;
    emoji: string;
    title: string;
    exact?: boolean;
  }

  const navItems: NavItem[] = [
    { href: '/groceries', emoji: '🛒', title: 'groceries.title', exact: true },
    { href: '/groceries/preferences', emoji: '🍽️', title: 'preferences.title' },
    { href: '/groceries/menu', emoji: '🤖', title: 'menu.title' },
    { href: '/groceries/recipes', emoji: '📖', title: 'Recept' },
  ];

  function isActive(item: NavItem): boolean {
    if (item.exact) {
      return currentPath === item.href;
    }
    return currentPath.startsWith(item.href);
  }
</script>

<main class="flex-1 p-4 pb-24">
  <div class="max-w-4xl mx-auto">
    <!-- Navigation stays constant -->
    <div class="mb-4">
      <!-- Back link - top row -->
      <div class="flex justify-between items-center mb-2">
        <a
          href="/"
          class="text-orange-500 hover:text-orange-600 dark:text-amber-400 dark:hover:text-amber-500 hover:underline text-sm"
          >← Tillbaka</a
        >
      </div>

      <!-- Navigation buttons row -->
      <div class="flex items-center gap-2 flex-wrap" id="grocery-nav-buttons">
        {#each navItems as item}
          <a
            href={item.href}
            data-sveltekit-noscroll
            class="flex items-center gap-1 px-2 py-1 rounded-lg transition-colors text-sm border-2
              {isActive(item)
              ? 'bg-orange-200 dark:bg-orange-800/50 text-orange-700 dark:text-orange-200 border-orange-300 dark:border-orange-600'
              : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 border-transparent'}"
            title={item.title.includes('.') ? $t(item.title) : item.title}
          >
            <span class="text-lg">{item.emoji}</span>
          </a>
        {/each}

        <!-- Connection status indicator (always visible on grocery pages) -->
        <div class="flex items-center gap-1.5 ml-auto">
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
    </div>

    <!-- Page content changes here -->
    <slot />
  </div>
</main>
