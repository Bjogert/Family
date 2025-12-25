<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { t } from '$lib/i18n';
  import type { Task, TaskCategory, TaskStatus } from '@family-hub/shared/types';

  export let tasks: Task[];
  export let familyMembers: Array<{
    id: number;
    displayName: string | null;
    avatarEmoji: string | null;
    color: string | null;
  }>;

  const dispatch = createEventDispatcher<{
    edit: Task;
    delete: number;
    statusChange: { id: number; status: TaskStatus };
    verify: number;
    reopen: number;
  }>();

  function getMemberById(id: number | null) {
    if (!id) return null;
    return familyMembers.find((m) => m.id === id);
  }

  function getCategoryIcon(cat: TaskCategory): string {
    const icons: Record<TaskCategory, string> = {
      cleaning: '🧹',
      outdoor: '🌳',
      pets: '🐾',
      kitchen: '🍳',
      laundry: '👕',
      shopping: '🛒',
      other: '📝',
    };
    return icons[cat] || '📝';
  }

  function getStatusColor(status: TaskStatus): string {
    const colors: Record<TaskStatus, string> = {
      open: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
      in_progress: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300',
      done: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
      verified: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
    };
    return colors[status] || '';
  }

  function formatDueDate(date: string | null, time: string | null): string {
    if (!date) return '';
    const d = new Date(date);
    const dateStr = d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    return time ? `${dateStr} ${time.slice(0, 5)}` : dateStr;
  }

  function getDifficultyStars(difficulty: string | null): string {
    if (!difficulty) return '';
    const stars: Record<string, string> = { easy: '⭐', medium: '⭐⭐', hard: '⭐⭐⭐' };
    return stars[difficulty] || '';
  }

  function handleNextStatus(task: Task) {
    const nextStatus: Record<TaskStatus, TaskStatus> = {
      open: 'in_progress',
      in_progress: 'done',
      done: 'verified',
      verified: 'verified',
    };
    if (task.status === 'done') {
      dispatch('verify', task.id);
    } else if (task.status !== 'verified') {
      dispatch('statusChange', { id: task.id, status: nextStatus[task.status] });
    }
  }

  function getActionButtonText(status: TaskStatus): string {
    const actions: Record<TaskStatus, string> = {
      open: '▶️ Start',
      in_progress: '✔️ Done',
      done: '⭐ Verify',
      verified: '✓ Verified',
    };
    return actions[status];
  }
</script>

<div class="space-y-3">
  {#each tasks as task (task.id)}
    {@const assignee = getMemberById(task.assignedTo)}
    {@const verifier = getMemberById(task.verifiedBy)}
    <div
      class="bg-white dark:bg-stone-800 rounded-xl shadow-sm p-4 border-l-4
      {task.status === 'open' ? 'border-blue-400' : ''}
      {task.status === 'in_progress' ? 'border-yellow-400' : ''}
      {task.status === 'done' ? 'border-green-400' : ''}
      {task.status === 'verified' ? 'border-purple-400' : ''}"
    >
      <div class="flex items-start gap-3">
        <!-- Category icon -->
        <div class="text-2xl shrink-0">{getCategoryIcon(task.category)}</div>

        <!-- Main content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-2">
            <h3
              class="font-semibold text-stone-800 dark:text-stone-100 {task.status === 'verified'
                ? 'line-through opacity-60'
                : ''}"
            >
              {task.title}
            </h3>
            <span
              class="px-2 py-0.5 text-xs rounded-full whitespace-nowrap {getStatusColor(
                task.status
              )}"
            >
              {$t(`taskStatus.${task.status}`)}
            </span>
          </div>

          {#if task.description}
            <p class="text-sm text-stone-500 dark:text-stone-400 mt-1">{task.description}</p>
          {/if}

          <div
            class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-stone-500 dark:text-stone-400"
          >
            {#if task.dueDate}
              <span class="flex items-center gap-1">
                📅 {formatDueDate(task.dueDate, task.dueTime)}
              </span>
            {/if}
            {#if assignee}
              <span class="flex items-center gap-1">
                👤 {assignee.avatarEmoji}
                {assignee.displayName}
              </span>
            {/if}
            {#if task.difficulty}
              <span>{getDifficultyStars(task.difficulty)}</span>
            {/if}
            {#if task.points}
              <span class="text-amber-600 dark:text-amber-400 font-medium">+{task.points}p</span>
            {/if}
          </div>

          {#if task.status === 'verified' && verifier}
            <div class="text-xs text-purple-600 dark:text-purple-400 mt-2">
              ✓ Verified by {verifier.avatarEmoji}
              {verifier.displayName}
            </div>
          {/if}
        </div>
      </div>

      <!-- Actions -->
      <div
        class="flex items-center gap-2 mt-3 pt-3 border-t border-stone-100 dark:border-stone-700"
      >
        {#if task.status !== 'verified'}
          <button
            on:click={() => handleNextStatus(task)}
            class="px-3 py-1.5 text-sm rounded-lg transition-colors
              {task.status === 'open'
              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200'
              : ''}
              {task.status === 'in_progress'
              ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200'
              : ''}
              {task.status === 'done'
              ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 hover:bg-green-200'
              : ''}"
          >
            {getActionButtonText(task.status)}
          </button>
          {#if task.status === 'done' || task.status === 'in_progress'}
            <button
              on:click={() => dispatch('reopen', task.id)}
              class="px-2 py-1.5 text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 transition-colors"
              title={$t('tasks.reopen')}
            >
              ↩️
            </button>
          {/if}
        {/if}
        <div class="flex-1"></div>
        {#if task.status !== 'verified'}
          <button
            on:click={() => dispatch('edit', task)}
            class="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
            title={$t('common.edit')}
          >
            ✏️
          </button>
        {/if}
        <button
          on:click={() => dispatch('delete', task.id)}
          class="p-2 text-stone-400 hover:text-red-500 transition-colors"
          title={$t('common.delete')}
        >
          🗑️
        </button>
      </div>
    </div>
  {/each}
</div>
