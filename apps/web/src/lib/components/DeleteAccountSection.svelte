<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { goto } from '$app/navigation';
  import { t } from '$lib/i18n';
  import { currentUser, currentFamily, logout } from '$lib/stores/auth';

  const dispatch = createEventDispatcher();

  let showConfirm = false;
  let confirmText = '';
  let deleting = false;
  let error = '';

  $: expectedText = $t('settings.deleteConfirmWord');
  $: canDelete = confirmText.toLowerCase() === expectedText.toLowerCase();

  async function deleteAccount() {
    if (!canDelete || !$currentUser) return;

    deleting = true;
    error = '';

    try {
      const response = await fetch(`/api/auth/users/${$currentUser.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-family-id': String($currentFamily?.id || ''),
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      // Clear auth state and redirect
      logout();
      dispatch('deleted');
      goto('/');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      deleting = false;
    }
  }

  function cancelDelete() {
    showConfirm = false;
    confirmText = '';
    error = '';
  }
</script>

<div class="space-y-3">
  {#if !showConfirm}
    <button
      on:click={() => (showConfirm = true)}
      class="w-full py-3 px-4 bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800
             text-red-700 dark:text-red-300 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/50
             transition-colors text-left"
    >
      <div class="font-semibold">🗑️ {$t('settings.deleteAccount')}</div>
      <div class="text-sm opacity-75">{$t('settings.deleteAccountDesc')}</div>
    </button>
  {:else}
    <div
      class="p-4 bg-red-50 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700 rounded-xl"
    >
      <div class="text-red-800 dark:text-red-200 font-semibold mb-2">
        ⚠️ {$t('settings.deleteWarning')}
      </div>
      <p class="text-sm text-red-700 dark:text-red-300 mb-4">
        {$t('settings.deleteWarningDesc')}
      </p>
      <p class="text-sm text-red-700 dark:text-red-300 mb-2">
        {$t('settings.typeToConfirm')} "{expectedText}"
      </p>
      <input
        type="text"
        bind:value={confirmText}
        placeholder={expectedText}
        class="w-full p-2 border-2 border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-stone-800
               text-red-800 dark:text-red-200 placeholder:text-red-300 dark:placeholder:text-red-600
               focus:outline-none focus:ring-2 focus:ring-red-500"
      />

      {#if error}
        <p class="text-sm text-red-600 mt-2">{error}</p>
      {/if}

      <div class="flex gap-2 mt-4">
        <button
          on:click={cancelDelete}
          class="flex-1 py-2 px-4 bg-stone-100 dark:bg-stone-800 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
          disabled={deleting}
        >
          {$t('common.cancel')}
        </button>
        <button
          on:click={deleteAccount}
          disabled={!canDelete || deleting}
          class="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700
                 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {#if deleting}
            {$t('common.deleting')}...
          {:else}
            {$t('settings.deleteAccount')}
          {/if}
        </button>
      </div>
    </div>
  {/if}
</div>
