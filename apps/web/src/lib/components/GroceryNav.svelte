<script lang="ts">
  import { page } from '$app/stores';
  import { t } from '$lib/i18n';

  // Determine current page for highlighting
  $: currentPath = $page.url.pathname;

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
  <div class="flex items-center gap-2 flex-wrap">
    {#each navItems as item}
      <a
        href={item.href}
        class="flex items-center gap-1 px-2 py-1 rounded-lg transition-colors text-sm border-2
          {isActive(item)
          ? 'bg-orange-200 dark:bg-orange-800/50 text-orange-700 dark:text-orange-200 border-orange-300 dark:border-orange-600'
          : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 border-transparent'}"
        title={item.title.includes('.') ? $t(item.title) : item.title}
      >
        <span class="text-lg">{item.emoji}</span>
      </a>
    {/each}

    <!-- Slot for additional buttons (like assignment, staples panel toggles) -->
    <slot />
  </div>
</div>
