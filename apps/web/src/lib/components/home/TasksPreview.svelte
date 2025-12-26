<script lang="ts">
  import type { Task } from '@family-hub/shared/types';

  export let tasks: Task[] = [];
  export let familyMembers: { id: number; avatarEmoji: string | null }[] = [];
</script>

{#if tasks.length > 0}
  <div
    class="bg-white/90 dark:bg-stone-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-orange-200 dark:border-stone-700 p-4"
  >
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm font-semibold text-stone-600 dark:text-stone-400">📋</span>
      <a href="/tasks" class="text-xs text-teal-600 dark:text-teal-400 hover:underline"
        >Alla uppgifter →</a
      >
    </div>
    <div class="space-y-1">
      {#each tasks.slice(0, 6) as task (task.id)}
        {@const assignee = familyMembers.find((m) => m.id === task.assignedTo)}
        {@const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()}
        <a
          href="/tasks"
          class="flex items-center gap-2 py-1 hover:bg-stone-50 dark:hover:bg-stone-700/50 rounded px-1 -mx-1 transition-colors"
        >
          <span class="text-sm flex-shrink-0">{assignee?.avatarEmoji || '·'}</span>
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
      {#if tasks.length > 6}
        <p class="text-[10px] text-stone-400 dark:text-stone-500 pt-1">
          +{tasks.length - 6} till...
        </p>
      {/if}
    </div>
  </div>
{/if}
