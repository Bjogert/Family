<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from '$lib/api/client';
  import { t } from '$lib/i18n';

  let apiStatus = 'Checking...';

  interface ApiInfo {
    name: string;
    version: string;
    status: string;
  }

  onMount(async () => {
    try {
      const data = await get<ApiInfo>('');
      apiStatus = `Connected - ${data.name} v${data.version}`;
    } catch {
      apiStatus = 'Cannot reach API (is it running?)';
    }
  });
</script>

<svelte:head>
  <title>Family Hub</title>
</svelte:head>

<main class="flex-1 flex items-center justify-center p-4">
  <div class="text-center max-w-md">
    <h1 class="text-4xl font-bold text-primary-600 mb-4">{$t('nav.familyHub')}</h1>

    <p class="text-lg text-gray-600 dark:text-gray-400 mb-8">
      {$t('home.welcome')}
      {$t('home.subtitle')}
    </p>

    <div class="card p-6 mb-6">
      <h2 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
        {$t('home.apiStatus')}
      </h2>
      <p class="text-lg font-medium">
        {apiStatus}
      </p>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <a href="/groceries" class="btn-primary py-3"> 🛒 {$t('home.groceries')} </a>
      <a href="/calendar" class="btn-secondary py-3"> 📅 {$t('home.calendar')} </a>
    </div>

    <p class="mt-8 text-sm text-gray-500 dark:text-gray-400">{$t('home.phase1Complete')}</p>
  </div>
</main>
