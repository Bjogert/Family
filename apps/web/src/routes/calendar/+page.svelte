<script lang="ts">
  // Placeholder - will be implemented in Phase 5
  import { t } from '$lib/i18n';
</script>

<svelte:head>
  <title>Calendar - Family Hub</title>
</svelte:head>

<main class="flex-1 p-4">
  <div class="max-w-4xl mx-auto">
    <header class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">📅 {$t('calendar.title')}</h1>
      <a href="/" class="text-orange-500 hover:text-orange-600 dark:text-amber-400 dark:hover:text-amber-500 hover:underline">← {$t('nav.back')}</a>
    </header>

    <div class="card p-8 text-center">
      <p class="text-stone-500 dark:text-stone-400 mb-4">
        {$t('calendar.comingSoon')}
      </p>
      <p class="text-sm text-stone-400">
        {$t('calendar.features')}
      </p>
    </div>
  </div>
</main>
