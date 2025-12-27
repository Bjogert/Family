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
  import { familyStore, familyMembers, familyLoading, familyLoaded } from '$lib/stores/family';
  import { t, setLanguage, languages, currentLanguage } from '$lib/i18n';
  import InstallPrompt from '$lib/components/InstallPrompt.svelte';
  import SettingsModal from '$lib/components/SettingsModal.svelte';

  // Color mapping for user indicators
  const colorClasses: Record<string, string> = {
    orange: 'bg-orange-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    green: 'bg-emerald-400',
    blue: 'bg-sky-400',
    purple: 'bg-violet-400',
    stone: 'bg-stone-400',
  };

  // Other family members (excluding current user)
  $: otherMembers = $familyMembers.filter((m) => m.id !== $currentUser?.id);

  let showLanguageMenu = false;
  let showSettingsModal = false;
  let isFullscreen = false;
  let canFullscreen = false;
  let showFullscreenPrompt = false;

  $: currentLangData = languages.find((l) => l.code === $currentLanguage);
  $: userColor = colorClasses[$currentUser?.color || 'orange'];

  // Pages that don't require authentication
  const publicPaths = [
    '/welcome',
    '/login',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
  ];

  onMount(() => {
    checkAuth();

    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      // Add version to bust Cloudflare cache
      const swVersion = 'v9';
      navigator.serviceWorker
        .register(`/sw.js?v=${swVersion}`)
        .then((registration) => {
          // Check for updates periodically
          registration.update();
        })
        .catch((error) => {
          console.error('[PWA] Service worker registration failed:', error);
        });
    }

    // Fullscreen support
    canFullscreen = document.fullscreenEnabled || (document as any).webkitFullscreenEnabled;

    // Listen for fullscreen changes
    const updateFullscreenState = () => {
      isFullscreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('fullscreenEnabled', isFullscreen.toString());
      }
    };

    document.addEventListener('fullscreenchange', updateFullscreenState);
    document.addEventListener('webkitfullscreenchange', updateFullscreenState);

    // Show fullscreen prompt if previously enabled (browsers require user gesture)
    const checkFullscreenPrompt = () => {
      if (typeof localStorage !== 'undefined') {
        const wasFullscreen = localStorage.getItem('fullscreenEnabled') === 'true';
        const isCurrentlyFullscreen = !!(
          document.fullscreenElement || (document as any).webkitFullscreenElement
        );
        if (wasFullscreen && canFullscreen && !isCurrentlyFullscreen) {
          showFullscreenPrompt = true;
        }
      }
    };

    // Check on initial load
    checkFullscreenPrompt();

    // Check when page becomes visible again (after minimize/tab switch)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkFullscreenPrompt();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('fullscreenchange', updateFullscreenState);
      document.removeEventListener('webkitfullscreenchange', updateFullscreenState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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

  // Load family members when authenticated
  $: if ($authenticated && !$familyLoaded && !$familyLoading) {
    familyStore.loadMembers();
  }

  async function handleLogout() {
    await logout();
    goto('/welcome');
  }

  function switchLanguage(lang: 'sv' | 'en' | 'pt') {
    setLanguage(lang);
    showLanguageMenu = false;
  }

  async function toggleFullscreen() {
    showFullscreenPrompt = false;
    if (!isFullscreen) {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen().catch(() => {});
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen().catch(() => {});
      }
    }
  }

  function dismissFullscreenPrompt() {
    showFullscreenPrompt = false;
    localStorage.removeItem('fullscreenEnabled');
  }
</script>

<div
  class="min-h-screen flex flex-col bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 dark:from-stone-900 dark:via-stone-800 dark:to-stone-900"
>
  <!-- Fullscreen restore prompt -->
  {#if showFullscreenPrompt && !isFullscreen}
    <div class="bg-primary-600 text-white px-4 py-2 flex items-center justify-between">
      <span class="text-sm">Tryck för att återgå till helskärm</span>
      <div class="flex gap-2">
        <button
          on:click={toggleFullscreen}
          class="px-3 py-1 bg-white dark:bg-stone-700 text-orange-500 dark:text-amber-400 rounded text-sm font-medium"
        >
          ⛶ Helskärm
        </button>
        <button
          on:click={dismissFullscreenPrompt}
          class="px-2 py-1 text-white/80 hover:text-white text-sm"
        >
          ✕
        </button>
      </div>
    </div>
  {/if}

  {#if $loading}
    <div class="flex-1 flex items-center justify-center">
      <div class="text-gray-500 dark:text-gray-400">{$t('layout.loading')}</div>
    </div>
  {:else if $authenticated && !publicPaths.some((p) => $page.url.pathname.startsWith(p))}
    <!-- Navigation header for authenticated users -->
    <header
      class="bg-gradient-to-r from-orange-100 via-amber-50 to-yellow-100 dark:from-stone-900 dark:via-stone-800 dark:to-stone-900 shadow-md border-b border-orange-200 dark:border-stone-700"
    >
      <div class="max-w-4xl mx-auto px-3 py-2">
        <!-- Mobile Layout -->
        <div class="md:hidden">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <a
                href="/"
                class="text-sm font-bold bg-gradient-to-r from-orange-400 to-amber-400 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent"
                >{$t('nav.familyHub')}</a
              >
            </div>
            <div class="flex items-center gap-2">
              {#if canFullscreen}
                <button
                  on:click={toggleFullscreen}
                  class="text-base hover:opacity-80"
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  {isFullscreen ? '⛶' : '⛶'}
                </button>
              {/if}
              <button
                on:click={() => (showSettingsModal = true)}
                class="text-base hover:opacity-80"
                aria-label="Settings"
              >
                ⚙️
              </button>
              <button
                on:click={() => (showLanguageMenu = !showLanguageMenu)}
                class="text-base hover:opacity-80"
                aria-label="Change language"
              >
                {currentLangData?.flag || '🇸🇪'}
              </button>
              <button
                on:click={handleLogout}
                class="text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-[10px] px-2 py-1 bg-stone-100 dark:bg-stone-700 rounded"
              >
                {$t('nav.logout')}
              </button>
            </div>
          </div>
          <nav class="flex gap-3 overflow-x-auto">
            <a
              href="/groceries"
              class="text-gray-600 dark:text-gray-300 hover:text-primary-600 text-xs font-medium whitespace-nowrap"
            >
              🛒 {$t('nav.groceries')}
            </a>
            <a
              href="/calendar"
              class="text-gray-600 dark:text-gray-300 hover:text-primary-600 text-xs font-medium whitespace-nowrap"
            >
              📅 {$t('nav.calendar')}
            </a>
            <a
              href="/activities"
              class="text-gray-600 dark:text-gray-300 hover:text-primary-600 text-xs font-medium whitespace-nowrap"
            >
              🎯 {$t('nav.activities')}
            </a>
            <a
              href="/tasks"
              class="text-gray-600 dark:text-gray-300 hover:text-primary-600 text-xs font-medium whitespace-nowrap"
            >
              ✅ {$t('nav.tasks')}
            </a>
          </nav>
          {#if showLanguageMenu}
            <div
              class="absolute right-3 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[110px] z-50"
            >
              {#each languages as lang}
                <button
                  on:click={() => switchLanguage(lang.code)}
                  class="w-full px-3 py-2 text-left hover:bg-orange-50 dark:hover:bg-stone-700 flex items-center gap-2"
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
            <a
              href="/"
              class="text-lg font-bold bg-gradient-to-r from-orange-400 to-amber-400 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent"
              >{$t('nav.familyHub')}</a
            >
          </div>
          <nav class="flex items-center gap-4">
            <a href="/groceries" class="text-stone-600 dark:text-stone-300 hover:text-orange-500">
              🛒 {$t('nav.groceries')}
            </a>
            <a href="/calendar" class="text-stone-600 dark:text-stone-300 hover:text-orange-500">
              📅 {$t('nav.calendar')}
            </a>
            <a href="/activities" class="text-stone-600 dark:text-stone-300 hover:text-orange-500">
              🎯 {$t('nav.activities')}
            </a>
            <a href="/tasks" class="text-stone-600 dark:text-stone-300 hover:text-orange-500">
              ✅ {$t('nav.tasks')}
            </a>

            <button
              on:click={handleLogout}
              class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm"
            >
              {$t('nav.logout')}
            </button>

            <!-- Fullscreen Toggle (Desktop) -->
            {#if canFullscreen}
              <button
                on:click={toggleFullscreen}
                class="text-xl hover:opacity-80"
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                ⛶
              </button>
            {/if}

            <!-- Settings (Desktop) -->
            <button
              on:click={() => (showSettingsModal = true)}
              class="text-xl hover:opacity-80"
              aria-label="Settings"
            >
              ⚙️
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
                      class="w-full px-4 py-2 text-left hover:bg-orange-50 dark:hover:bg-stone-700 flex items-center gap-2"
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

    <!-- Family Members Bar -->
    {#if $familyMembers.length > 0}
      <div
        class="bg-stone-100/80 dark:bg-stone-800/80 border-b border-orange-200 dark:border-stone-700"
      >
        <div class="max-w-4xl mx-auto px-3 py-1.5">
          <div class="flex items-center gap-3 overflow-x-auto">
            <!-- Family name as link to home -->
            <a
              href="/"
              class="flex flex-col leading-tight mr-1 hover:opacity-80 transition-opacity"
            >
              <span class="text-[9px] text-stone-400 dark:text-stone-500 uppercase tracking-wider"
                >Familjen</span
              >
              <span
                class="text-sm font-bold bg-gradient-to-r from-orange-400 to-amber-400 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent"
              >
                {$currentFamily?.name || 'Family'}
              </span>
            </a>
            {#each $familyMembers as member (member.id)}
              {@const bgColor = colorClasses[member.color || 'orange']}
              {@const isCurrentUser = member.id === $currentUser?.id}
              <a
                href="/profile/{member.id}"
                class="flex items-center gap-1.5 py-0.5 px-1.5 rounded-full hover:bg-white dark:hover:bg-stone-700 transition-colors group {isCurrentUser
                  ? 'bg-white/50 dark:bg-stone-700/50'
                  : ''}"
                title={member.displayName || member.username}
              >
                <span
                  class="{bgColor} w-6 h-6 rounded-full flex items-center justify-center text-sm shadow-sm"
                >
                  {member.avatarEmoji || '👤'}
                </span>
                <span
                  class="text-xs text-stone-600 dark:text-stone-300 whitespace-nowrap hidden sm:inline"
                >
                  {member.displayName?.split(' ')[0] || member.username}
                </span>
                {#if isCurrentUser}
                  <span class="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                {/if}
              </a>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    {#key $currentLanguage}
      <slot />
    {/key}
  {:else}
    {#key $currentLanguage}
      <slot />
    {/key}
  {/if}

  <!-- PWA Install Prompt -->
  <InstallPrompt />

  <!-- Settings Modal -->
  <SettingsModal bind:open={showSettingsModal} />
</div>
