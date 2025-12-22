<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  let deferredPrompt: any = null;
  let showInstallButton = false;

  onMount(() => {
    if (!browser) return;

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return; // Already installed
    }

    // Listen for the install prompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('[PWA] Install prompt available');
      e.preventDefault();
      deferredPrompt = e;
      showInstallButton = true;
    });

    // Detect if app was installed
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed');
      showInstallButton = false;
      deferredPrompt = null;
    });
  });

  async function installApp() {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    console.log('[PWA] User choice:', outcome);

    if (outcome === 'accepted') {
      showInstallButton = false;
    }

    deferredPrompt = null;
  }

  function dismissPrompt() {
    showInstallButton = false;
    // Remember that user dismissed (optional: use localStorage)
    localStorage.setItem('pwa-install-dismissed', 'true');
  }
</script>

{#if showInstallButton}
  <div
    class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 p-4 z-50"
  >
    <div class="flex items-start gap-3">
      <div class="text-3xl">📱</div>
      <div class="flex-1">
        <h3 class="font-semibold text-sm mb-1">Installera Family Hub</h3>
        <p class="text-xs text-gray-600 dark:text-gray-400 mb-3">
          Lägg till på din hemskärm för snabb åtkomst
        </p>
        <div class="flex gap-2">
          <button on:click={installApp} class="btn-primary text-xs py-1.5 px-3">
            Installera
          </button>
          <button
            on:click={dismissPrompt}
            class="btn-secondary text-xs py-1.5 px-3"
          >
            Inte nu
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
