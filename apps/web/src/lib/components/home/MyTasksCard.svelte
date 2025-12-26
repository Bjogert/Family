<script lang="ts">
  import { t } from '$lib/i18n';
  import { currentUser } from '$lib/stores/auth';
  import type { Task } from '@family-hub/shared/types';

  export let myAssignedTasks: Task[] = [];
  export let tasksAwaitingMyApproval: Task[] = [];
  export let familyMembers: { id: number; avatarEmoji: string | null }[] = [];
</script>

{#if myAssignedTasks.length > 0 || tasksAwaitingMyApproval.length > 0}
  <div
    class="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 backdrop-blur-lg rounded-2xl shadow-xl border border-amber-200 dark:border-amber-800 p-4"
  >
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <span class="text-lg">{$currentUser?.avatarEmoji || '👤'}</span>
        <span class="text-sm font-semibold text-amber-700 dark:text-amber-400"
          >{$t('profile.myTasks')}</span
        >
      </div>
      <a
        href="/profile/{$currentUser?.id}"
        class="text-xs text-teal-600 dark:text-teal-400 hover:underline"
      >
        {$t('profile.title')} →
      </a>
    </div>

    <!-- Tasks awaiting my approval (priority) -->
    {#if tasksAwaitingMyApproval.length > 0}
      <div class="mb-3">
        <p class="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">
          🔔 {$t('tasks.awaitingApproval')}
        </p>
        <div class="space-y-1">
          {#each tasksAwaitingMyApproval.slice(0, 3) as task (task.id)}
            {@const assignee = familyMembers.find((m) => m.id === task.assignedTo)}
            <a
              href="/tasks"
              class="flex items-center gap-2 py-1.5 px-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-800/40 transition-colors"
            >
              <span class="text-sm">{assignee?.avatarEmoji || '✅'}</span>
              <span class="text-sm text-stone-700 dark:text-stone-300 truncate flex-1"
                >{task.title}</span
              >
              <span class="text-xs text-orange-600 dark:text-orange-400 font-medium"
                >{$t('tasks.approve')}</span
              >
            </a>
          {/each}
        </div>
      </div>
    {/if}

    <!-- My assigned tasks -->
    {#if myAssignedTasks.length > 0}
      <div class="space-y-1">
        {#each myAssignedTasks.slice(0, 4) as task (task.id)}
          {@const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()}
          <a
            href="/tasks"
            class="flex items-center gap-2 py-1 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded px-1 -mx-1 transition-colors"
          >
            <span
              class="w-4 h-4 rounded-full border-2 {isOverdue
                ? 'border-red-400'
                : 'border-amber-400'}"
            ></span>
            <span
              class="text-sm text-stone-700 dark:text-stone-300 truncate flex-1 {isOverdue
                ? 'text-red-600 dark:text-red-400'
                : ''}">{task.title}</span
            >
            {#if task.dueDate}
              <span class="text-[10px] text-stone-400 dark:text-stone-500 flex-shrink-0">
                {new Date(task.dueDate).toLocaleDateString('sv-SE', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            {/if}
          </a>
        {/each}
        {#if myAssignedTasks.length > 4}
          <p class="text-[10px] text-stone-400 dark:text-stone-500 pt-1">
            +{myAssignedTasks.length - 4}
            {$t('common.more')}...
          </p>
        {/if}
      </div>
    {/if}
  </div>
{/if}
