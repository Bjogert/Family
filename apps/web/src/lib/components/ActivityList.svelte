<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { t } from '$lib/i18n';
  import type { Activity, ActivityCategory } from '@family-hub/shared/types';

  export let activities: Activity[] = [];
  export let categories: { value: ActivityCategory; labelKey: string }[] = [];

  const dispatch = createEventDispatcher<{
    edit: Activity;
    delete: number;
  }>();

  function getCategoryLabel(category: string): string {
    const cat = categories.find((c) => c.value === category);
    return cat ? $t(cat.labelKey as keyof typeof $t) : category;
  }

  function formatDateTime(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatTimeRange(start: string, end: string | null): string {
    const startDate = new Date(start);
    const startTime = startDate.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (end) {
      const endDate = new Date(end);
      const endTime = endDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      return `${startTime} - ${endTime}`;
    }
    return startTime;
  }

  // Group activities by date
  $: groupedActivities = activities.reduce(
    (groups, activity) => {
      const date = new Date(activity.startTime).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(activity);
      return groups;
    },
    {} as Record<string, Activity[]>
  );
</script>

<div class="space-y-6">
  {#each Object.entries(groupedActivities) as [date, dayActivities]}
    <div>
      <h2
        class="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-3"
      >
        {date}
      </h2>
      <div class="space-y-3">
        {#each dayActivities as activity (activity.id)}
          <div
            class="bg-white dark:bg-stone-800 rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-lg">{getCategoryLabel(activity.category).split(' ')[0]}</span>
                  <h3 class="font-semibold text-stone-800 dark:text-stone-100">
                    {activity.title}
                  </h3>
                  {#if activity.recurringPattern}
                    <span
                      class="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full"
                    >
                      🔁 {$t(`recurring.${activity.recurringPattern}`)}
                    </span>
                  {/if}
                </div>

                <div
                  class="flex flex-wrap items-center gap-3 text-sm text-stone-500 dark:text-stone-400"
                >
                  <span>🕐 {formatTimeRange(activity.startTime, activity.endTime)}</span>

                  {#if activity.location}
                    <span>📍 {activity.location}</span>
                  {/if}
                </div>

                {#if activity.description}
                  <p class="mt-2 text-sm text-stone-600 dark:text-stone-300">
                    {activity.description}
                  </p>
                {/if}

                <!-- Participants -->
                {#if activity.participants && activity.participants.length > 0}
                  <div class="flex items-center gap-1 mt-3">
                    <span class="text-xs text-stone-500 dark:text-stone-400 mr-1">
                      {$t('activities.participants')}:
                    </span>
                    {#each activity.participants as participant}
                      <span
                        class="inline-flex items-center justify-center w-7 h-7 rounded-full text-sm"
                        style="background-color: {participant.user?.color
                          ? `var(--color-${participant.user.color})`
                          : '#d4d4d4'}"
                        title={participant.user?.displayName || ''}
                      >
                        {participant.user?.avatarEmoji || '👤'}
                      </span>
                    {/each}
                  </div>
                {/if}

                <!-- Transport -->
                {#if activity.transportUser}
                  <div class="mt-2 text-sm text-stone-500 dark:text-stone-400">
                    🚗 {$t('activities.transport')}:
                    <span class="font-medium"
                      >{activity.transportUser.avatarEmoji}
                      {activity.transportUser.displayName}</span
                    >
                  </div>
                {/if}
              </div>

              <!-- Actions -->
              <div class="flex gap-2 ml-4">
                <button
                  on:click={() => dispatch('edit', activity)}
                  class="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors"
                  title={$t('common.edit')}
                >
                  ✏️
                </button>
                <button
                  on:click={() => dispatch('delete', activity.id)}
                  class="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  title={$t('common.delete')}
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/each}
</div>
