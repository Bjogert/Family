<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { t } from '$lib/i18n';

  interface PasswordForm {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }

  export let passwordForm: PasswordForm;
  export let passwordError: string | null;
  export let passwordSuccess: boolean;
  export let saving: boolean;

  const dispatch = createEventDispatcher<{
    changePassword: void;
  }>();
</script>

<h2 class="text-xl font-bold text-stone-800 dark:text-white mb-6">Konto</h2>

<div class="space-y-6">
  <!-- Change Password -->
  <div class="bg-stone-50 dark:bg-stone-700/50 rounded-xl p-6">
    <h3 class="font-semibold text-stone-700 dark:text-stone-300 mb-4">Byt lösenord</h3>

    {#if passwordError}
      <div
        class="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm"
      >
        {passwordError}
      </div>
    {/if}
    {#if passwordSuccess}
      <div
        class="mb-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm"
      >
        {$t('profile.passwordChanged')}
      </div>
    {/if}

    <form on:submit|preventDefault={() => dispatch('changePassword')} class="space-y-4">
      <div>
        <label
          for="currentPassword"
          class="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1"
        >
          Nuvarande lösenord
        </label>
        <input
          type="password"
          id="currentPassword"
          bind:value={passwordForm.currentPassword}
          autocomplete="current-password"
          class="w-full px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-800 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>
      <div>
        <label
          for="newPassword"
          class="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1"
        >
          Nytt lösenord
        </label>
        <input
          type="password"
          id="newPassword"
          bind:value={passwordForm.newPassword}
          autocomplete="new-password"
          class="w-full px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-800 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>
      <div>
        <label
          for="confirmPassword"
          class="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1"
        >
          {$t('profile.confirmPasswordLabel')}
        </label>
        <input
          type="password"
          id="confirmPassword"
          bind:value={passwordForm.confirmPassword}
          autocomplete="new-password"
          class="w-full px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-800 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        class="w-full py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
      >
        {saving ? $t('common.saving') : $t('profile.changePassword')}
      </button>
    </form>
  </div>

  <!-- Delete Account -->
  <div
    class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6"
  >
    <h3 class="font-semibold text-red-700 dark:text-red-400 mb-2">
      {$t('profile.deleteAccountTitle')}
    </h3>
    <p class="text-sm text-red-600 dark:text-red-400/80 mb-4">
      {$t('profile.deleteAccountDescription')}
    </p>
    <a
      href="/settings"
      class="inline-block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
    >
      {$t('profile.goToAccountSettings')}
    </a>
  </div>
</div>
