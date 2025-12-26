<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { t } from '$lib/i18n';
  import { deferredPrompt, isInstalled, initPwaDetection, triggerInstall } from '$lib/stores/pwa';

  let showInstallButton = false;

  const DISMISS_KEY = 'pwa-install-dismissed';
  const DISMISS_COOLDOWN_HOURS = 24;

  function isDismissedRecently(): boolean {
    if (!browser) return true;
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (!dismissedAt) return false;

    const dismissTime = parseInt(dismissedAt, 10);
    const hoursSinceDismiss = (Date.now() - dismissTime) / (1000 * 60 * 60);
    return hoursSinceDismiss < DISMISS_COOLDOWN_HOURS;
  }

  onMount(() => {
    if (!browser) return;

    // Initialize PWA detection (sets up the shared store)
    initPwaDetection();

    // Check if already installed
    if ($isInstalled) return;

    // Check if user dismissed recently (24h cooldown)
    if (isDismissedRecently()) {
      console.log('[PWA] Install prompt dismissed recently, waiting for cooldown');
      return;
    }

    // Subscribe to prompt availability
    const unsubscribe = deferredPrompt.subscribe((prompt) => {
      showInstallButton = prompt !== null;
    });

    return unsubscribe;
  });

  async function installApp() {
    const outcome = await triggerInstall();
    if (outcome === 'accepted') {
      showInstallButton = false;
      localStorage.removeItem(DISMISS_KEY);
    }
  }

  function dismissPrompt() {
    showInstallButton = false;
    // Remember dismiss time for 24h cooldown
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  }
</script>

{#if showInstallButton}
  <div
    class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 p-4 z-50"
  >
    <div class="flex items-start gap-3">
      <div class="text-3xl">🏠</div>
      <div class="flex-1">
        <h3 class="font-semibold text-sm mb-1">{$t('install.title')}</h3>
        <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">
          {$t('install.appExplanation')}
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-500 mb-3 italic">
          {$t('install.description')}
        </p>
        <div class="flex gap-2">
          <button on:click={installApp} class="btn-primary text-xs py-1.5 px-3">
            📲 {$t('install.button')}
          </button>
          <button on:click={dismissPrompt} class="btn-secondary text-xs py-1.5 px-3">
            {$t('install.notNow')}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
