<script lang="ts">
  import { onMount } from 'svelte';

  let apiStatus = 'Checking...';

  onMount(async () => {
    try {
      const res = await fetch('/api');
      if (res.ok) {
        const data = await res.json();
        apiStatus = `Connected - ${data.name} v${data.version}`;
      } else {
        apiStatus = 'API not responding';
      }
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
    <h1 class="text-4xl font-bold text-primary-600 mb-4">
      Family Hub
    </h1>

    <p class="text-lg text-gray-600 dark:text-gray-400 mb-8">
      Welcome! Your family's household management app.
    </p>

    <div class="card p-6 mb-6">
      <h2 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
        API Status
      </h2>
      <p class="text-lg font-medium">
        {apiStatus}
      </p>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <a href="/groceries" class="btn-primary py-3">
        🛒 Groceries
      </a>
      <a href="/calendar" class="btn-secondary py-3">
        📅 Calendar
      </a>
    </div>

    <p class="mt-8 text-sm text-gray-500 dark:text-gray-400">
      Phase 1 - Authentication Complete
    </p>
  </div>
</main>
