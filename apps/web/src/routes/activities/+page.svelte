<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '$lib/i18n';
  import { currentFamily, currentUser } from '$lib/stores/auth';
  import type { Activity, ActivityCategory, RecurringPattern } from '@family-hub/shared/types';
  import ActivityList from '$lib/components/ActivityList.svelte';
  import ActivityForm from '$lib/components/ActivityForm.svelte';

  let activities: Activity[] = [];
  let loading = true;
  let showForm = false;
  let editingActivity: Activity | null = null;
  let calendarConnected = false;
  let familyMembers: Array<{
    id: number;
    displayName: string | null;
    avatarEmoji: string | null;
    color: string | null;
    role: string | null;
  }> = [];

  const categories: { value: ActivityCategory; labelKey: string }[] = [
    { value: 'sports', labelKey: 'activityCategory.sports' },
    { value: 'music', labelKey: 'activityCategory.music' },
    { value: 'school', labelKey: 'activityCategory.school' },
    { value: 'hobbies', labelKey: 'activityCategory.hobbies' },
    { value: 'social', labelKey: 'activityCategory.social' },
    { value: 'medical', labelKey: 'activityCategory.medical' },
    { value: 'other', labelKey: 'activityCategory.other' },
  ];

  onMount(async () => {
    await Promise.all([loadActivities(), loadFamilyMembers(), checkCalendarConnection()]);
  });

  async function checkCalendarConnection() {
    if (!$currentUser) return;
    try {
      const res = await fetch('/api/calendar/google/status', {
        headers: { 'x-user-id': String($currentUser.id) },
      });
      if (res.ok) {
        const data = await res.json();
        calendarConnected = data.connected && !!data.familyCalendarId;
      }
    } catch (err) {
      console.error('Failed to check calendar connection:', err);
    }
  }

  async function loadActivities() {
    if (!$currentFamily) return;
    loading = true;
    try {
      const res = await fetch('/api/activities', {
        headers: { 'x-family-id': String($currentFamily.id) },
      });
      if (res.ok) {
        activities = await res.json();
      }
    } catch (err) {
      console.error('Failed to load activities:', err);
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

  async function handleSave(event: CustomEvent<Partial<Activity>>) {
    const data = event.detail;
    if (!$currentFamily) return;

    const method = editingActivity ? 'PUT' : 'POST';
    const url = editingActivity ? `/api/activities/${editingActivity.id}` : '/api/activities';

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
        await loadActivities();
        showForm = false;
        editingActivity = null;
      }
    } catch (err) {
      console.error('Failed to save activity:', err);
    }
  }

  async function handleDelete(event: CustomEvent<number>) {
    const id = event.detail;
    if (!$currentFamily) return;

    try {
      const res = await fetch(`/api/activities/${id}`, {
        method: 'DELETE',
        headers: {
          'x-family-id': String($currentFamily.id),
          'x-user-id': String($currentUser?.id || ''),
        },
      });
      if (res.ok) {
        activities = activities.filter((a) => a.id !== id);
      }
    } catch (err) {
      console.error('Failed to delete activity:', err);
    }
  }

  function handleEdit(event: CustomEvent<Activity>) {
    editingActivity = event.detail;
    showForm = true;
  }

  function handleCancel() {
    showForm = false;
    editingActivity = null;
  }
</script>

<div class="flex-1 p-4 max-w-4xl mx-auto w-full">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-2xl font-bold text-stone-800 dark:text-stone-100">
      🎯 {$t('activities.title')}
    </h1>
    {#if !showForm}
      <button
        on:click={() => {
          editingActivity = null;
          showForm = true;
        }}
        class="px-4 py-2 bg-gradient-to-r from-orange-400 to-amber-400 text-white rounded-xl font-medium hover:from-orange-500 hover:to-amber-500 transition-all shadow-md"
      >
        + {$t('activities.add')}
      </button>
    {/if}
  </div>

  {#if showForm}
    <ActivityForm
      activity={editingActivity}
      {categories}
      {familyMembers}
      {calendarConnected}
      on:save={handleSave}
      on:cancel={handleCancel}
    />
  {:else if loading}
    <div class="flex items-center justify-center py-12">
      <div class="text-stone-500">{$t('common.loading')}</div>
    </div>
  {:else if activities.length === 0}
    <div class="text-center py-12 bg-white dark:bg-stone-800 rounded-2xl shadow-md">
      <div class="text-6xl mb-4">📅</div>
      <h3 class="text-lg font-semibold text-stone-700 dark:text-stone-200 mb-2">
        {$t('activities.empty')}
      </h3>
      <p class="text-stone-500 dark:text-stone-400">
        {$t('activities.emptyDesc')}
      </p>
    </div>
  {:else}
    <ActivityList {activities} {categories} on:edit={handleEdit} on:delete={handleDelete} />
  {/if}
</div>
