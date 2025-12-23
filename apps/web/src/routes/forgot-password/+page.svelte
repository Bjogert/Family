<script lang="ts">
  import { page } from '$app/stores';
  import { post } from '$lib/api/client';
  import { t } from '$lib/i18n';

  let email = '';
  let loading = false;
  let submitted = false;
  let error = '';

  // Check if this is family password reset
  $: resetType = $page.url.searchParams.get('type') === 'family' ? 'family' : 'user';
  $: isFamilyReset = resetType === 'family';

  async function handleSubmit() {
    if (!email.trim()) {
      error = $t('forgotPassword.errorEmail');
      return;
    }

    loading = true;
    error = '';

    try {
      const endpoint = isFamilyReset ? '/auth/forgot-family-password' : '/auth/forgot-password';
      const response = await post<{ success: boolean; message?: string }>(endpoint, {
        email,
      });
      if (response.success) {
        submitted = true;
      } else {
        error = response.message || $t('forgotPassword.errorGeneric');
      }
    } catch (err) {
      error = $t('forgotPassword.errorSend');
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>{$t('forgotPassword.title')} - {$t('nav.familyHub')}</title>
</svelte:head>

<div
  class="min-h-screen bg-gradient-to-br from-violet-100 via-purple-50 to-fuchsia-100 flex items-center justify-center p-4"
>
  <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
    <div class="text-center mb-8">
      <div class="text-5xl mb-4">{isFamilyReset ? '🏠' : '🔑'}</div>
      <h1 class="text-2xl font-bold text-gray-800">
        {isFamilyReset ? $t('forgotPassword.familyTitle') : $t('forgotPassword.title')}
      </h1>
      <p class="text-gray-600 mt-2">
        {#if isFamilyReset}
          {$t('forgotPassword.familyDescription')}
        {:else}
          {$t('forgotPassword.description')}
        {/if}
      </p>
    </div>

    {#if submitted}
      <div class="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <div class="text-4xl mb-3">📧</div>
        <h2 class="text-lg font-semibold text-green-800 mb-2">{$t('forgotPassword.successTitle')}</h2>
        <p class="text-green-700 text-sm">
          {$t('forgotPassword.successMessage').replace('{type}', isFamilyReset ? $t('forgotPassword.familyPassword') : $t('forgotPassword.yourPassword'))}
        </p>
        <p class="text-green-600 text-xs mt-3">{$t('forgotPassword.checkSpam')}</p>
      </div>

      <div class="mt-6 text-center">
        <a href="/welcome" class="text-violet-600 hover:text-violet-700 font-medium">
          {$t('forgotPassword.backToHome')}
        </a>
      </div>
    {:else}
      <form on:submit|preventDefault={handleSubmit} class="space-y-6">
        {#if error}
          <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        {/if}

        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
            {isFamilyReset ? $t('forgotPassword.parentEmailLabel') : $t('forgotPassword.emailLabel')}
          </label>
          <input
            type="email"
            id="email"
            bind:value={email}
            placeholder={$t('forgotPassword.emailPlaceholder')}
            class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          class="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
        >
          {#if loading}
            <span class="inline-flex items-center gap-2">
              <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                  fill="none"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {$t('common.loading')}
            </span>
          {:else}
            {$t('forgotPassword.submitButton')}
          {/if}
        </button>
      </form>

      <div class="mt-6 text-center text-sm text-gray-600">
        <a href="/welcome" class="text-violet-600 hover:text-violet-700 font-medium">
          {$t('forgotPassword.backToHome')}
        </a>
      </div>
    {/if}
  </div>
</div>
