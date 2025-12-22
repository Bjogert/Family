<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { t } from '$lib/i18n';
  import type { TranslationKey } from '$lib/i18n/translations';

  type Theme = 'light' | 'dark' | 'system';

  let currentTheme: Theme = 'system';

  onMount(() => {
    // Load saved preference
    const saved = localStorage.getItem('theme') as Theme | null;
    currentTheme = saved || 'system';
    applyTheme(currentTheme);
  });

  function applyTheme(theme: Theme) {
    if (!browser) return;

    const root = document.documentElement;

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }

    localStorage.setItem('theme', theme);
  }

  function setTheme(theme: Theme) {
    currentTheme = theme;
    applyTheme(theme);
  }

  const themes: { value: Theme; icon: string; labelKey: TranslationKey }[] = [
    { value: 'light', icon: '☀️', labelKey: 'settings.themeLight' },
    { value: 'dark', icon: '🌙', labelKey: 'settings.themeDark' },
    { value: 'system', icon: '💻', labelKey: 'settings.themeSystem' },
  ];
</script>

<div class="flex gap-2">
  {#each themes as theme}
    <button
      on:click={() => setTheme(theme.value)}
      class="flex-1 py-3 px-4 rounded-xl border-2 transition-all
        {currentTheme === theme.value
        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30'
        : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600'}"
    >
      <div class="text-2xl mb-1">{theme.icon}</div>
      <div class="text-xs font-medium text-stone-700 dark:text-stone-300">
        {$t(theme.labelKey)}
      </div>
    </button>
  {/each}
</div>
