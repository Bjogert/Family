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

<main
  class="flex-1 bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 dark:from-stone-900 dark:via-stone-800 dark:to-stone-900"
>
  <div class="h-full flex flex-col lg:flex-row gap-6 p-4 lg:p-6 max-w-7xl mx-auto">
    <!-- Left Sidebar - Navigation -->
    <aside class="lg:w-64 flex-shrink-0">
      <div
        class="bg-white/90 dark:bg-stone-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-orange-200 dark:border-stone-700 p-6"
      >
        <nav class="space-y-3">
          <a
            href="/groceries"
            class="flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-orange-400 to-amber-400 hover:from-orange-500 hover:to-amber-500 text-white font-medium rounded-lg shadow-md transition"
          >
            <span class="text-xl">🛒</span>
            <span>{$t('home.groceries')}</span>
          </a>

          <a
            href="/calendar"
            class="flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-orange-300 to-amber-300 hover:from-orange-400 hover:to-amber-400 text-stone-800 font-medium rounded-lg shadow-md transition"
          >
            <span class="text-xl">📅</span>
            <span>{$t('home.calendar')}</span>
          </a>
        </nav>
      </div>
    </aside>

    <!-- Main Content - Activity Feed -->
    <div class="flex-1 min-w-0">
      <div
        class="bg-white/90 dark:bg-stone-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-orange-200 dark:border-stone-700 p-6"
      >
        <h2 class="text-xl font-bold text-stone-800 dark:text-white mb-6">Familjeaktivitet</h2>

        <!-- Activity Feed - Empty State -->
        <div class="text-center py-16">
          <p class="text-stone-500 dark:text-stone-400 mb-2">Aktivitet från familjen visas här</p>
          <p class="text-sm text-stone-400 dark:text-stone-500">
            {$t('home.phase1Complete')}
          </p>
        </div>
      </div>
    </div>

    <!-- API Status - Bottom Right Corner -->
    <div class="fixed bottom-2 right-2 text-[10px] text-stone-400 dark:text-stone-600">
      {apiStatus}
    </div>
  </div>
</main>
