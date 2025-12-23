<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { t } from '$lib/i18n';
  import type {
    Task,
    TaskCategory,
    TaskDifficulty,
    RecurringPattern,
  } from '@family-hub/shared/types';

  export let task: Task | null = null;
  export let categories: { value: TaskCategory; labelKey: string }[] = [];
  export let difficulties: { value: TaskDifficulty; labelKey: string }[] = [];
  export let familyMembers: Array<{
    id: number;
    displayName: string | null;
    avatarEmoji: string | null;
    color: string | null;
  }> = [];

  const dispatch = createEventDispatcher<{
    save: Partial<Task> & { sendNotification?: boolean };
    cancel: void;
  }>();

  // Form state
  let title = task?.title || '';
  let description = task?.description || '';
  let category: TaskCategory = (task?.category as TaskCategory) || 'other';
  let difficulty: TaskDifficulty | null = task?.difficulty || null;
  let points: number | null = task?.points || null;
  let assignedTo: number | null = task?.assignedTo || null;
  let dueDate = task?.dueDate || '';
  let dueTime = task?.dueTime || '';
  let recurringPattern: RecurringPattern = task?.recurringPattern || null;
  let sendNotification = true; // Default to send notification

  const recurringOptions: { value: RecurringPattern; labelKey: string }[] = [
    { value: null, labelKey: 'recurring.none' },
    { value: 'daily', labelKey: 'recurring.daily' },
    { value: 'weekly', labelKey: 'recurring.weekly' },
    { value: 'biweekly', labelKey: 'recurring.biweekly' },
    { value: 'monthly', labelKey: 'recurring.monthly' },
  ];

  // Auto-calculate points based on difficulty
  $: if (difficulty && !task) {
    const pointsMap: Record<TaskDifficulty, number> = { easy: 5, medium: 10, hard: 20 };
    points = pointsMap[difficulty];
  }

  function handleSubmit() {
    dispatch('save', {
      title,
      description: description || undefined,
      category,
      difficulty: difficulty || undefined,
      points: points || undefined,
      assignedTo: assignedTo || undefined,
      dueDate: dueDate || undefined,
      dueTime: dueTime || undefined,
      recurringPattern,
      sendNotification,
    });
  }
</script>

<form
  on:submit|preventDefault={handleSubmit}
  class="bg-white dark:bg-stone-800 rounded-2xl shadow-md p-6 space-y-4"
>
  <h2 class="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4">
    {task ? $t('common.edit') : $t('tasks.add')}
  </h2>

  <!-- Title -->
  <div>
    <label class="block">
      <span class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-1">
        {$t('tasks.titleLabel')} *
      </span>
      <input
        type="text"
        bind:value={title}
        required
        class="w-full px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
        placeholder={$t('tasks.titleLabel')}
      />
    </label>
  </div>

  <!-- Category -->
  <div>
    <span class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-1">
      {$t('tasks.category')}
    </span>
    <div class="flex flex-wrap gap-2">
      {#each categories as cat}
        <button
          type="button"
          on:click={() => (category = cat.value)}
          class="px-3 py-1.5 rounded-lg text-sm transition-all
            {category === cat.value
            ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 ring-2 ring-teal-400'
            : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'}"
        >
          {$t(cat.labelKey)}
        </button>
      {/each}
    </div>
  </div>

  <!-- Assignee -->
  <div>
    <span class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-2">
      👤 {$t('tasks.assignee')}
    </span>
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        on:click={() => (assignedTo = null)}
        class="px-3 py-2 rounded-xl transition-all
          {assignedTo === null
          ? 'bg-stone-200 dark:bg-stone-600 ring-2 ring-stone-400'
          : 'bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600'}"
      >
        <span class="text-sm text-stone-600 dark:text-stone-300">{$t('tasks.unassigned')}</span>
      </button>
      {#each familyMembers as member}
        <button
          type="button"
          on:click={() => (assignedTo = member.id)}
          class="flex items-center gap-2 px-3 py-2 rounded-xl transition-all
            {assignedTo === member.id
            ? 'bg-teal-100 dark:bg-teal-900/50 ring-2 ring-teal-400'
            : 'bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600'}"
        >
          <span class="text-lg">{member.avatarEmoji || '👤'}</span>
          <span class="text-sm text-stone-700 dark:text-stone-200">{member.displayName}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Due Date and Time (optional) -->
  <div class="grid grid-cols-2 gap-4">
    <label class="block">
      <span class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-1">
        📅 {$t('tasks.dueDate')}
      </span>
      <input
        type="date"
        bind:value={dueDate}
        class="w-full px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100"
      />
    </label>
    <label class="block">
      <span class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-1">
        🕐 {$t('tasks.dueTime')}
      </span>
      <input
        type="time"
        bind:value={dueTime}
        class="w-full px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100"
      />
    </label>
  </div>

  <!-- Difficulty and Points -->
  <div class="grid grid-cols-2 gap-4">
    <div>
      <span class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-1">
        {$t('tasks.difficulty')}
      </span>
      <div class="flex gap-2">
        {#each difficulties as diff}
          <button
            type="button"
            on:click={() => (difficulty = diff.value)}
            class="flex-1 px-2 py-2 rounded-lg text-sm transition-all
              {difficulty === diff.value
              ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 ring-2 ring-teal-400'
              : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200'}"
          >
            {$t(diff.labelKey)}
          </button>
        {/each}
      </div>
    </div>
    <label class="block">
      <span class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-1">
        🏆 {$t('tasks.points')}
      </span>
      <input
        type="number"
        bind:value={points}
        min="0"
        class="w-full px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100"
        placeholder="0"
      />
    </label>
  </div>

  <!-- Description -->
  <label class="block">
    <span class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-1">
      {$t('tasks.description')}
    </span>
    <textarea
      bind:value={description}
      rows="2"
      class="w-full px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100 resize-none"
      placeholder={$t('tasks.description')}
    ></textarea>
  </label>

  <!-- Recurring -->
  <label class="block">
    <span class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-1">
      🔁 {$t('tasks.recurring')}
    </span>
    <select
      bind:value={recurringPattern}
      class="w-full px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100"
    >
      {#each recurringOptions as opt}
        <option value={opt.value}>{$t(opt.labelKey)}</option>
      {/each}
    </select>
  </label>

  <!-- Send Notification (only show when someone is assigned) -->
  {#if assignedTo}
    <label class="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        bind:checked={sendNotification}
        class="w-5 h-5 rounded border-stone-300 dark:border-stone-600 text-teal-500 focus:ring-teal-400"
      />
      <span class="text-sm text-stone-700 dark:text-stone-200">
        🔔 {$t('tasks.sendNotification')}
      </span>
    </label>
  {/if}

  <!-- Actions -->
  <div class="flex gap-3 pt-4">
    <button
      type="button"
      on:click={() => dispatch('cancel')}
      class="flex-1 px-4 py-2 bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
    >
      {$t('common.cancel')}
    </button>
    <button
      type="submit"
      disabled={!title}
      class="flex-1 px-4 py-2 bg-gradient-to-r from-teal-400 to-emerald-400 text-white rounded-xl font-medium hover:from-teal-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
    >
      {$t('common.save')}
    </button>
  </div>
</form>
