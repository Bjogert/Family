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
</script>

<div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
  {#if $loading}
    <div class="flex-1 flex items-center justify-center">
      <div class="text-gray-500 dark:text-gray-400">Loading...</div>
    </div>
  {:else if $authenticated && !publicPaths.some((p) => $page.url.pathname.startsWith(p))}
    <!-- Navigation header for authenticated users -->
    <header class="bg-white dark:bg-gray-800 shadow-sm">
      <div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div>
          <a href="/" class="text-lg font-bold text-primary-600">Family Hub</a>
          {#if $currentFamily}
            <p class="text-xs text-gray-500">{$currentFamily.name}</p>
          {/if}
        </div>
        <nav class="flex items-center gap-4">
          <a href="/groceries" class="text-gray-600 dark:text-gray-300 hover:text-primary-600">
            Groceries
          </a>
          <a href="/calendar" class="text-gray-600 dark:text-gray-300 hover:text-primary-600">
            Calendar
          </a>
          <div class="text-sm text-gray-600 dark:text-gray-400">
            {$currentUser?.displayName || $currentUser?.username || 'User'}
          </div>
          <button
            on:click={handleLogout}
            class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm"
          >
            Logout
          </button>
        </nav>
      </div>
    </header>
    <slot />
  {:else}
    <slot />
  {/if}
</div>
