<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '$lib/i18n';
  import { currentFamily, currentUser } from '$lib/stores/auth';
  import type { Task, TaskCategory, TaskDifficulty, TaskStatus } from '@family-hub/shared/types';
  import TaskList from '$lib/components/TaskList.svelte';
  import TaskForm from '$lib/components/TaskForm.svelte';

  let tasks: Task[] = [];
  let loading = true;
  let showForm = false;
  let editingTask: Task | null = null;
  let familyMembers: Array<{
    id: number;
    displayName: string | null;
    avatarEmoji: string | null;
    color: string | null;
  }> = [];
  let filterStatus: TaskStatus | 'all' = 'all';

  const categories: { value: TaskCategory; labelKey: string }[] = [
    { value: 'cleaning', labelKey: 'taskCategory.cleaning' },
    { value: 'outdoor', labelKey: 'taskCategory.outdoor' },
    { value: 'pets', labelKey: 'taskCategory.pets' },
    { value: 'kitchen', labelKey: 'taskCategory.kitchen' },
    { value: 'laundry', labelKey: 'taskCategory.laundry' },
    { value: 'shopping', labelKey: 'taskCategory.shopping' },
    { value: 'other', labelKey: 'taskCategory.other' },
  ];

  const difficulties: { value: TaskDifficulty; labelKey: string }[] = [
    { value: 'easy', labelKey: 'taskDifficulty.easy' },
    { value: 'medium', labelKey: 'taskDifficulty.medium' },
    { value: 'hard', labelKey: 'taskDifficulty.hard' },
  ];

  $: filteredTasks =
    filterStatus === 'all' ? tasks : tasks.filter((t) => t.status === filterStatus);

  onMount(async () => {
    await Promise.all([loadTasks(), loadFamilyMembers()]);
  });

  async function loadTasks() {
    if (!$currentFamily) return;
    loading = true;
    try {
      const res = await fetch('/api/tasks', {
        headers: { 'x-family-id': String($currentFamily.id) },
      });
      if (res.ok) {
        tasks = await res.json();
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      loading = false;
    }
  }

  async function loadFamilyMembers() {
    if (!$currentFamily) return;
    try {
      const res = await fetch(`/api/families/${$currentFamily.id}/users`);
      if (res.ok) {
        const data = await res.json();
        familyMembers = data.users || [];
      }
    } catch (err) {
      console.error('Failed to load family members:', err);
    }
  }

  async function handleSave(event: CustomEvent<Partial<Task>>) {
    const data = event.detail;
    if (!$currentFamily) return;

    const method = editingTask ? 'PUT' : 'POST';
    const url = editingTask ? `/api/tasks/${editingTask.id}` : '/api/tasks';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-family-id': String($currentFamily.id),
          'x-user-id': String($currentUser?.id || ''),
        },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        await loadTasks();
        showForm = false;
        editingTask = null;
      }
    } catch (err) {
      console.error('Failed to save task:', err);
    }
  }

  async function handleDelete(event: CustomEvent<number>) {
    const id = event.detail;
    if (!$currentFamily) return;

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
        headers: { 'x-family-id': String($currentFamily.id) },
      });
      if (res.ok) {
        tasks = tasks.filter((t) => t.id !== id);
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  }

  async function handleStatusChange(event: CustomEvent<{ id: number; status: TaskStatus }>) {
    const { id, status } = event.detail;
    if (!$currentFamily) return;

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-family-id': String($currentFamily.id),
        },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        await loadTasks();
      }
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  }

  async function handleReopen(event: CustomEvent<number>) {
    const id = event.detail;
    if (!$currentFamily) return;

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-family-id': String($currentFamily.id),
        },
        body: JSON.stringify({ status: 'open' }),
      });

      if (res.ok) {
        await loadTasks();
      }
    } catch (err) {
      console.error('Failed to reopen task:', err);
    }
  }

  async function handleVerify(event: CustomEvent<number>) {
    const id = event.detail;
    if (!$currentFamily || !$currentUser) return;

    try {
      const res = await fetch(`/api/tasks/${id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-family-id': String($currentFamily.id),
          'x-user-id': String($currentUser.id),
        },
      });

      if (res.ok) {
        await loadTasks();
      }
    } catch (err) {
      console.error('Failed to verify task:', err);
    }
  }

  function handleEdit(event: CustomEvent<Task>) {
    editingTask = event.detail;
    showForm = true;
  }

  function handleCancel() {
    showForm = false;
    editingTask = null;
  }
</script>

<div class="flex-1 p-4 max-w-4xl mx-auto w-full">
  <!-- Header -->
  <div class="flex items-center justify-between mb-4">
    <h1 class="text-2xl font-bold text-stone-800 dark:text-stone-100">
      ✅ {$t('tasks.title')}
    </h1>
    {#if !showForm}
      <button
        on:click={() => {
          editingTask = null;
          showForm = true;
        }}
        class="px-4 py-2 bg-gradient-to-r from-teal-400 to-emerald-400 text-white rounded-xl font-medium hover:from-teal-500 hover:to-emerald-500 transition-all shadow-md"
      >
        + {$t('tasks.add')}
      </button>
    {/if}
  </div>

  <!-- Filter tabs -->
  {#if !showForm && tasks.length > 0}
    <div class="flex gap-2 mb-4 overflow-x-auto pb-2">
      <button
        on:click={() => (filterStatus = 'all')}
        class="px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors
          {filterStatus === 'all'
          ? 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800'
          : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300'}"
      >
        {$t('common.all')} ({tasks.length})
      </button>
      <button
        on:click={() => (filterStatus = 'open')}
        class="px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors
          {filterStatus === 'open'
          ? 'bg-blue-500 text-white'
          : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300'}"
      >
        📋 {$t('taskStatus.open')} ({tasks.filter((t) => t.status === 'open').length})
      </button>
      <button
        on:click={() => (filterStatus = 'in_progress')}
        class="px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors
          {filterStatus === 'in_progress'
          ? 'bg-yellow-500 text-white'
          : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300'}"
      >
        🔄 {$t('taskStatus.in_progress')} ({tasks.filter((t) => t.status === 'in_progress').length})
      </button>
      <button
        on:click={() => (filterStatus = 'done')}
        class="px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors
          {filterStatus === 'done'
          ? 'bg-green-500 text-white'
          : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300'}"
      >
        ✔️ {$t('taskStatus.done')} ({tasks.filter((t) => t.status === 'done').length})
      </button>
      <button
        on:click={() => (filterStatus = 'verified')}
        class="px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors
          {filterStatus === 'verified'
          ? 'bg-purple-500 text-white'
          : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300'}"
      >
        ⭐ {$t('taskStatus.verified')} ({tasks.filter((t) => t.status === 'verified').length})
      </button>
    </div>
  {/if}

  {#if showForm}
    <TaskForm
      task={editingTask}
      {categories}
      {difficulties}
      {familyMembers}
      on:save={handleSave}
      on:cancel={handleCancel}
    />
  {:else if loading}
    <div class="flex items-center justify-center py-12">
      <div class="text-stone-500">{$t('common.loading')}</div>
    </div>
  {:else if tasks.length === 0}
    <div class="text-center py-12 bg-white dark:bg-stone-800 rounded-2xl shadow-md">
      <div class="text-6xl mb-4">🧹</div>
      <h3 class="text-lg font-semibold text-stone-700 dark:text-stone-200 mb-2">
        {$t('tasks.empty')}
      </h3>
      <p class="text-stone-500 dark:text-stone-400">
        {$t('tasks.emptyDesc')}
      </p>
    </div>
  {:else}
    <TaskList
      tasks={filteredTasks}
      {familyMembers}
      on:edit={handleEdit}
      on:delete={handleDelete}
      on:statusChange={handleStatusChange}
      on:verify={handleVerify}
      on:reopen={handleReopen}
    />
  {/if}
</div>
