<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { post } from '$lib/api/client';
  import { t } from '$lib/i18n';

  let loading = true;
  let success = false;
  let error = '';

  $: token = $page.url.searchParams.get('token') || '';

  onMount(async () => {
    if (!token) {
      error = $t('verifyEmail.errorMissing');
      loading = false;
      return;
    }

    try {
      const response = await post<{ success: boolean; message?: string }>('/auth/verify-email', {
        token,
      });

      if (response.success) {
        success = true;
      } else {
        error = response.message || $t('verifyEmail.errorVerify');
      }
    } catch (err) {
      error = $t('verifyEmail.errorGeneric');
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>{$t('verifyEmail.title')} - {$t('nav.familyHub')}</title>
</svelte:head>

<div
  class="min-h-screen bg-gradient-to-br from-violet-100 via-purple-50 to-fuchsia-100 flex items-center justify-center p-4"
>
  <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
    {#if loading}
      <div class="py-8">
        <div class="text-5xl mb-4 animate-bounce">📧</div>
        <h1 class="text-xl font-semibold text-gray-700">{$t('verifyEmail.verifying')}</h1>
        <div class="mt-6 flex justify-center">
          <svg class="animate-spin h-8 w-8 text-violet-600" viewBox="0 0 24 24">
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
        </div>
      </div>
    {:else if success}
      <div class="py-8">
        <div class="text-6xl mb-4">🎉</div>
        <h1 class="text-2xl font-bold text-green-700 mb-3">{$t('verifyEmail.successTitle')}</h1>
        <p class="text-gray-600 mb-6">{$t('verifyEmail.successMessage')}</p>
        <a
          href="/"
          class="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 px-6 rounded-xl inline-block transition-colors"
        >
          {$t('verifyEmail.goToApp')}
        </a>
      </div>
    {:else}
      <div class="py-8">
        <div class="text-6xl mb-4">😔</div>
        <h1 class="text-2xl font-bold text-red-700 mb-3">{$t('verifyEmail.errorTitle')}</h1>
        <p class="text-gray-600 mb-2">{error}</p>
        <p class="text-sm text-gray-500 mb-6">{$t('verifyEmail.errorExpired')}</p>
        <div class="space-y-3">
          <a
            href="/"
            class="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 px-6 rounded-xl inline-block transition-colors"
          >
            {$t('verifyEmail.goToHome')}
          </a>
        </div>
      </div>
    {/if}
  </div>
</div>
