<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { t } from '$lib/i18n';

  interface GroceryItem {
    id: number;
    name: string;
    quantity: number | null;
    unit: string | null;
  }

  interface AssignedTask {
    id: number;
    title: string;
    points: number;
    status: 'open' | 'in_progress' | 'done' | 'verified';
    dueDate: string | null;
    requiresValidation: boolean;
    createdBy: number | null;
  }

  interface CalendarEvent {
    id: number;
    title: string;
    startDate: string;
  }

  interface BulletinNote {
    id: number;
    title: string;
    content: string;
    isPinned: boolean;
    createdAt: string;
    author?: { displayName: string | null; avatarEmoji: string | null };
  }

  export let earnedPoints: number;
  export let assignedGroceries: GroceryItem[];
  export let assignedTasks: AssignedTask[];
  export let upcomingEvents: CalendarEvent[];
  export let userMessages: BulletinNote[];
  export let taskUpdating: boolean;
  export let currentUserId: number | undefined;

  const dispatch = createEventDispatcher<{
    markTaskDone: number;
    reopenTask: number;
    verifyTask: number;
  }>();

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function formatEventDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('sv-SE', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }
</script>

<!-- Points Badge - only show if has points -->
{#if earnedPoints > 0}
  <div class="flex items-center justify-end gap-2 mb-4" title={$t('profile.earnedPoints')}>
    <span class="text-sm text-stone-500 dark:text-stone-400">🏆</span>
    <span
      class="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg"
    >
      {earnedPoints}
    </span>
  </div>
{/if}

<div class="grid gap-4 md:grid-cols-2">
  <!-- Assigned Groceries - only show if has items -->
  {#if assignedGroceries.length > 0}
    <div class="bg-stone-50 dark:bg-stone-700/50 rounded-xl p-3">
      <h3
        class="font-semibold text-stone-700 dark:text-stone-300 mb-2 flex items-center gap-2 text-sm"
      >
        <span>🛒</span>
        <span>Inköpslista</span>
        <span class="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
          {assignedGroceries.length}
        </span>
      </h3>
      <ul class="space-y-1">
        {#each assignedGroceries as item}
          <li class="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300">
            <span class="w-1.5 h-1.5 bg-orange-400 rounded-full"></span>
            <span>{item.name}</span>
            {#if item.quantity}
              <span class="text-stone-400"
                >({item.quantity % 1 === 0
                  ? item.quantity
                  : item.quantity.toFixed(1)}{item.unit || ''})</span
              >
            {/if}
          </li>
        {/each}
      </ul>
      <a
        href="/groceries"
        class="inline-block mt-2 text-xs text-orange-500 hover:text-orange-600 dark:text-orange-400"
      >
        Visa hela listan →
      </a>
    </div>
  {/if}

  <!-- Assigned Tasks -->
  <div class="bg-stone-50 dark:bg-stone-700/50 rounded-xl p-3">
    <h3
      class="font-semibold text-stone-700 dark:text-stone-300 mb-2 flex items-center gap-2 text-sm"
    >
      <span>📋</span>
      <span>{$t('profile.myTasks')}</span>
      {#if assignedTasks.length > 0}
        <span class="bg-teal-500 text-white text-xs px-2 py-0.5 rounded-full">
          {assignedTasks.length}
        </span>
      {/if}
    </h3>
    {#if assignedTasks.length === 0}
      <p class="text-sm text-stone-500 dark:text-stone-400">{$t('profile.noTasks')}</p>
    {:else}
      <ul class="space-y-2">
        {#each assignedTasks as task}
          <li class="bg-white dark:bg-stone-600/50 rounded-lg p-2">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <span
                  class="text-sm font-medium text-stone-700 dark:text-stone-200 block truncate"
                >
                  {task.title}
                </span>
                <div class="flex items-center gap-2 mt-1 flex-wrap">
                  <span class="text-xs text-stone-500 dark:text-stone-400">
                    🏆 {task.points}
                    {$t('tasks.points')}
                  </span>
                  {#if task.dueDate}
                    <span class="text-xs text-stone-500 dark:text-stone-400">
                      📅 {formatDate(task.dueDate)}
                    </span>
                  {/if}
                  {#if task.status === 'done'}
                    <span
                      class="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full"
                    >
                      {task.requiresValidation ? $t('tasks.awaitingApproval') : $t('tasks.statusDone')}
                    </span>
                    <button
                      on:click={() => dispatch('reopenTask', task.id)}
                      disabled={taskUpdating}
                      class="text-xs text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 transition-colors disabled:opacity-50"
                      title={$t('tasks.reopen')}
                    >
                      ↩️
                    </button>
                  {:else if task.status === 'in_progress'}
                    <span
                      class="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full"
                    >
                      {$t('tasks.statusInProgress')}
                    </span>
                  {/if}
                </div>
              </div>

              <!-- Actions -->
              {#if task.status !== 'done'}
                <button
                  on:click={() => dispatch('markTaskDone', task.id)}
                  disabled={taskUpdating}
                  class="shrink-0 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white text-xs rounded-lg transition-colors disabled:opacity-50"
                >
                  ✓ {$t('tasks.markDone')}
                </button>
              {:else if task.requiresValidation && task.createdBy === currentUserId}
                <!-- Show verify button if current user is the creator -->
                <button
                  on:click={() => dispatch('verifyTask', task.id)}
                  disabled={taskUpdating}
                  class="shrink-0 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs rounded-lg transition-colors disabled:opacity-50"
                >
                  ✅ {$t('tasks.approve')}
                </button>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
      <a
        href="/tasks"
        class="inline-block mt-2 text-xs text-teal-500 hover:text-teal-600 dark:text-teal-400"
      >
        {$t('tasks.viewAll')} →
      </a>
    {/if}
  </div>

  <!-- Upcoming Events - only show if has events -->
  {#if upcomingEvents.length > 0}
    <div class="bg-stone-50 dark:bg-stone-700/50 rounded-xl p-3">
      <h3
        class="font-semibold text-stone-700 dark:text-stone-300 mb-2 flex items-center gap-2 text-sm"
      >
        <span>📅</span>
        <span>Kommande händelser</span>
      </h3>
      <ul class="space-y-1">
        {#each upcomingEvents as event}
          <li class="text-sm">
            <span class="text-stone-600 dark:text-stone-300">{event.title}</span>
            <span class="text-stone-400 dark:text-stone-500 block text-xs">
              {formatEventDate(event.startDate)}
            </span>
          </li>
        {/each}
      </ul>
      <a
        href="/calendar"
        class="inline-block mt-2 text-xs text-orange-500 hover:text-orange-600 dark:text-orange-400"
      >
        Visa kalender →
      </a>
    </div>
  {/if}
</div>

<!-- Messages Section - show messages assigned to this user -->
{#if userMessages.length > 0}
  <div class="mt-4">
    <h3
      class="font-semibold text-stone-700 dark:text-stone-300 mb-3 flex items-center gap-2 text-sm"
    >
      <span>💬</span>
      <span>Meddelanden</span>
      <span class="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
        {userMessages.length}
      </span>
    </h3>
    <div class="space-y-3">
      {#each userMessages as msg}
        <div class="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3 border-l-4 border-blue-400">
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-lg">{msg.author?.avatarEmoji || '👤'}</span>
                <span class="text-xs text-stone-500 dark:text-stone-400">
                  {msg.title.replace('💬 Meddelande från ', '')}
                </span>
              </div>
              <p class="text-sm text-stone-700 dark:text-stone-200 whitespace-pre-wrap">
                {msg.content}
              </p>
              <span class="text-xs text-stone-400 dark:text-stone-500 mt-1 block">
                {new Date(msg.createdAt).toLocaleDateString('sv-SE', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            {#if msg.isPinned}
              <span class="text-orange-500" title="Fäst meddelande">📌</span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}
