<script lang="ts">
  import { currentLanguage } from '$lib/i18n';
  import { t } from '$lib/i18n';
  import type { Activity } from '@family-hub/shared/types';

  export let activities: Activity[] = [];

  function getLocaleCode(): string {
    const lang = $currentLanguage;
    return lang === 'sv' ? 'sv-SE' : lang === 'pt' ? 'pt-BR' : 'en-US';
  }

  function formatActivityDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const locale = getLocaleCode();

    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const todayText = $t('date.today') || 'Today';
    const tomorrowText = $t('date.tomorrow') || 'Tomorrow';

    if (isToday)
      return `${todayText} ${date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`;
    if (isTomorrow)
      return `${tomorrowText} ${date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`;

    return date.toLocaleDateString(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getActivityEmoji(category: string): string {
    const emojis: Record<string, string> = {
      sports: '⚽',
      music: '🎵',
      school: '📚',
      hobbies: '🎨',
      social: '👥',
      medical: '🏥',
      other: '📅',
    };
    return emojis[category] || '📅';
  }
</script>

{#if activities.length > 0}
  <div
    class="bg-white/90 dark:bg-stone-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-orange-200 dark:border-stone-700 p-4"
  >
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm font-semibold text-stone-600 dark:text-stone-400">📅</span>
      <a href="/calendar" class="text-xs text-teal-600 dark:text-teal-400 hover:underline"
        >Kalender →</a
      >
    </div>
    <div class="space-y-1">
      {#each activities as activity (activity.id)}
        <a
          href="/calendar"
          class="flex items-center gap-2 py-1 hover:bg-stone-50 dark:hover:bg-stone-700/50 rounded px-1 -mx-1 transition-colors"
        >
          <span class="text-sm flex-shrink-0">{getActivityEmoji(activity.category)}</span>
          <span class="text-sm text-stone-700 dark:text-stone-300 truncate flex-1"
            >{activity.title}</span
          >
          <span class="text-[10px] text-stone-400 dark:text-stone-500 flex-shrink-0">
            {formatActivityDate(activity.startTime)}
          </span>
        </a>
      {/each}
    </div>
  </div>
{/if}
