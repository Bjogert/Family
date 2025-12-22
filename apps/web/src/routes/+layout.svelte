<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import {
    authenticated,
    currentFamily,
    currentUser,
    loading,
    checkAuth,
    logout,
  } from '$lib/stores/auth';
  import { t, setLanguage, languages, currentLanguage } from '$lib/i18n';

  let showLanguageMenu = false;

  $: currentLangData = languages.find((l) => l.code === $currentLanguage);

  // Pages that don't require authentication
  const publicPaths = ['/welcome', '/login'];

  onMount(() => {
    checkAuth();
  });

  // Redirect logic
  $: {
    if (!$loading) {
      const isPublicPath = publicPaths.some((p) => $page.url.pathname.startsWith(p));

      if (!$authenticated && !isPublicPath) {
        goto('/welcome');
      } else if ($authenticated && isPublicPath) {
        goto('/');
      }
    }
  }

  async function handleLogout() {
    await logout();
    goto('/welcome');
  }

  function switchLanguage(lang: 'sv' | 'en' | 'pt') {
    setLanguage(lang);
    showLanguageMenu = false;
  }
</script>

<div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
  {#if $loading}
    <div class="flex-1 flex items-center justify-center">
      <div class="text-gray-500 dark:text-gray-400">Loading...</div>
    </div>
  {:else if $authenticated && !publicPaths.some((p) => $page.url.pathname.startsWith(p))}
    <!-- Navigation header for authenticated users -->
    <header class="bg-white dark:bg-gray-800 shadow-sm">
      <div class="max-w-4xl mx-auto px-3 py-2">
        <!-- Mobile Layout -->
        <div class="md:hidden">
          <div class="flex items-center justify-between mb-2">
            <a href="/" class="text-sm font-bold text-primary-600">{$t('nav.familyHub')}</a>
            <div class="flex items-center gap-2">
              <button
                on:click={() => (showLanguageMenu = !showLanguageMenu)}
                class="text-base hover:opacity-80"
                aria-label="Change language"
              >
                {currentLangData?.flag || '🇸🇪'}
              </button>
              <button
                on:click={handleLogout}
                class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-[10px] px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded"
              >
                {$t('nav.logout')}
              </button>
            </div>
          </div>
          {#if $currentFamily}
            <p class="text-[10px] text-gray-500 mb-2">{$currentFamily.name}</p>
          {/if}
          <nav class="flex gap-3">
            <a
              href="/groceries"
              class="text-gray-600 dark:text-gray-300 hover:text-primary-600 text-xs font-medium"
            >
              🛒 {$t('nav.groceries')}
            </a>
            <a
              href="/calendar"
              class="text-gray-600 dark:text-gray-300 hover:text-primary-600 text-xs font-medium"
            >
              📅 {$t('nav.calendar')}
            </a>
          </nav>
          {#if showLanguageMenu}
            <div
              class="absolute right-3 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[110px] z-50"
            >
              {#each languages as lang}
                <button
                  on:click={() => switchLanguage(lang.code)}
                  class="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <span class="text-base">{lang.flag}</span>
                  <span class="text-xs">{lang.name}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Desktop Layout -->
        <div class="hidden md:flex items-center justify-between">
          <div>
            <a href="/" class="text-lg font-bold text-primary-600">{$t('nav.familyHub')}</a>
            {#if $currentFamily}
              <p class="text-xs text-gray-500">{$currentFamily.name}</p>
            {/if}
          </div>
          <nav class="flex items-center gap-4">
            <a href="/groceries" class="text-gray-600 dark:text-gray-300 hover:text-primary-600">
              {$t('nav.groceries')}
            </a>
            <a href="/calendar" class="text-gray-600 dark:text-gray-300 hover:text-primary-600">
              {$t('nav.calendar')}
            </a>

            <div class="text-sm text-gray-600 dark:text-gray-400">
              {$currentUser?.displayName || $currentUser?.username || 'User'}
            </div>
            <button
              on:click={handleLogout}
              class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm"
            >
              {$t('nav.logout')}
            </button>

            <!-- Language Switcher (Desktop) -->
            <div class="relative">
              <button
                on:click={() => (showLanguageMenu = !showLanguageMenu)}
                class="text-xl hover:opacity-80"
                aria-label="Change language"
              >
                {currentLangData?.flag || '🇸🇪'}
              </button>
              {#if showLanguageMenu}
                <div
                  class="absolute right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[140px] z-50"
                >
                  {#each languages as lang}
                    <button
                      on:click={() => switchLanguage(lang.code)}
                      class="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <span class="text-xl">{lang.flag}</span>
                      <span class="text-sm">{lang.name}</span>
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          </nav>
        </div>
      </div>
    </header>
    {#key $currentLanguage}
      <slot />
    {/key}
  {:else}
    {#key $currentLanguage}
      <slot />
    {/key}
  {/if}
</div>
