<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { t } from '$lib/i18n';
  import ThemeToggle from './ThemeToggle.svelte';
  import DeleteAccountSection from './DeleteAccountSection.svelte';

  export let open = false;

  const dispatch = createEventDispatcher();

  function close() {
    open = false;
    dispatch('close');
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-black/50 z-40"
    on:click={close}
    on:keydown={(e) => e.key === 'Enter' && close()}
    role="button"
    tabindex="0"
  ></div>

  <!-- Modal -->
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div
      class="bg-white dark:bg-stone-900 rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-700"
      >
        <h2 id="settings-title" class="text-xl font-bold text-stone-800 dark:text-stone-100">
          ⚙️ {$t('settings.title')}
        </h2>
        <button
          on:click={close}
          class="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <!-- Content -->
      <div class="p-4 space-y-6">
        <!-- Theme Section -->
        <section>
          <h3
            class="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-3"
          >
            {$t('settings.appearance')}
          </h3>
          <ThemeToggle />
        </section>

        <!-- Danger Zone -->
        <section>
          <h3 class="text-sm font-semibold text-red-500 uppercase tracking-wide mb-3">
            {$t('settings.dangerZone')}
          </h3>
          <DeleteAccountSection on:deleted={close} />
        </section>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t border-stone-200 dark:border-stone-700">
        <button
          on:click={close}
          class="w-full py-2 px-4 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition-colors"
        >
          {$t('common.close')}
        </button>
      </div>
    </div>
  </div>
{/if}
