<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { t } from '$lib/i18n';
  import type {
    Activity,
    ActivityCategory,
    RecurringPattern,
    CreateActivityInput,
  } from '@family-hub/shared/types';

  export let activity: Activity | null = null;
  export let categories: { value: ActivityCategory; labelKey: string }[] = [];
  export let familyMembers: Array<{
    id: number;
    displayName: string | null;
    avatarEmoji: string | null;
    color: string | null;
    role: string | null;
  }> = [];
  export let calendarConnected = false;

  // Filter to only parents for transport
  $: parents = familyMembers.filter((m) => m.role === 'pappa' || m.role === 'mamma');
  // Filter to only children for participants
  $: children = familyMembers.filter((m) => m.role === 'barn' || m.role === 'bebis');

  const dispatch = createEventDispatcher<{
    save: CreateActivityInput & { sendNotification?: boolean };
    cancel: void;
  }>();

  // Form state
  let title = activity?.title || '';
  let description = activity?.description || '';
  let category: ActivityCategory = (activity?.category as ActivityCategory) || 'other';
  let location = activity?.location || '';
  let startDate = activity
    ? new Date(activity.startTime).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  let startTime = activity ? new Date(activity.startTime).toTimeString().slice(0, 5) : '09:00';
  let endTime = activity?.endTime ? new Date(activity.endTime).toTimeString().slice(0, 5) : '';
  let recurringPattern: RecurringPattern = activity?.recurringPattern || null;
  let transportUserId: number | null = activity?.transportUserId || null;
  let selectedParticipants: number[] = activity?.participants?.map((p) => p.userId) || [];
  let syncToCalendar = calendarConnected && !activity; // Default to true for new activities if calendar is connected
  let sendNotification = true; // Default to send notification

  const recurringOptions: { value: RecurringPattern; labelKey: string }[] = [
    { value: null, labelKey: 'recurring.none' },
    { value: 'daily', labelKey: 'recurring.daily' },
    { value: 'weekly', labelKey: 'recurring.weekly' },
    { value: 'biweekly', labelKey: 'recurring.biweekly' },
    { value: 'monthly', labelKey: 'recurring.monthly' },
  ];

  function toggleParticipant(userId: number) {
    if (selectedParticipants.includes(userId)) {
      selectedParticipants = selectedParticipants.filter((id) => id !== userId);
    } else {
      selectedParticipants = [...selectedParticipants, userId];
    }
  }

  function handleSubmit() {
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = endTime ? new Date(`${startDate}T${endTime}`) : null;

    dispatch('save', {
      title,
      description: description || undefined,
      category,
      location: location || undefined,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime?.toISOString() || undefined,
      recurringPattern,
      transportUserId: transportUserId || undefined,
      participantIds: selectedParticipants,
      syncToCalendar: syncToCalendar && !activity, // Only sync new activities
      sendNotification,
    });
  }
</script>

<form
  on:submit|preventDefault={handleSubmit}
  class="bg-white dark:bg-stone-800 rounded-2xl shadow-md p-6 space-y-4"
>
  <h2 class="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4">
    {activity ? $t('common.edit') : $t('activities.add')}
  </h2>

  <!-- Title -->
  <div>
    <label class="block">
      <span class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-1">
        {$t('activities.titleLabel')} *
      </span>
      <input
        type="text"
        bind:value={title}
        required
        class="w-full px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-amber-400 focus:border-transparent"
        placeholder={$t('activities.titleLabel')}
      />
    </label>
  </div>

  <!-- Category -->
  <div>
    <span class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-1">
      {$t('activities.category')}
    </span>
    <div class="flex flex-wrap gap-2">
      {#each categories as cat}
        <button
          type="button"
          on:click={() => (category = cat.value)}
          class="px-3 py-1.5 rounded-lg text-sm transition-all
            {category === cat.value
            ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 ring-2 ring-amber-400'
            : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'}"
        >
          {$t(cat.labelKey)}
        </button>
      {/each}
    </div>
  </div>

  <!-- Date and Time -->
  <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
    <label class="block">
      <span class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-1">
        {$t('activities.dateLabel')}
      </span>
      <input
        type="date"
        bind:value={startDate}
        required
        class="w-full px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100"
      />
    </label>
    <label class="block">
      <span class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-1">
        {$t('activities.startTime')} *
      </span>
      <input
        type="time"
        bind:value={startTime}
        required
        class="w-full px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100"
      />
    </label>
    <label class="block">
      <span class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-1">
        {$t('activities.endTime')}
      </span>
      <input
        type="time"
        bind:value={endTime}
        class="w-full px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100"
      />
    </label>
  </div>

  <!-- Location -->
  <label class="block">
    <span class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-1">
      📍 {$t('activities.location')}
    </span>
    <input
      type="text"
      bind:value={location}
      class="w-full px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100"
      placeholder={$t('activities.location')}
    />
  </label>

  <!-- Description -->
  <label class="block">
    <span class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-1">
      {$t('activities.description')}
    </span>
    <textarea
      bind:value={description}
      rows="2"
      class="w-full px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100 resize-none"
      placeholder={$t('activities.description')}
    ></textarea>
  </label>

  <!-- Participants -->
  <div>
    <span class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-2">
      👥 {$t('activities.participants')}
    </span>
    <div class="flex flex-wrap gap-2">
      {#each children as member}
        <button
          type="button"
          on:click={() => toggleParticipant(member.id)}
          class="flex items-center gap-2 px-3 py-2 rounded-xl transition-all
            {selectedParticipants.includes(member.id)
            ? 'bg-amber-100 dark:bg-amber-900/50 ring-2 ring-amber-400'
            : 'bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600'}"
        >
          <span class="text-lg">{member.avatarEmoji || '👤'}</span>
          <span class="text-sm text-stone-700 dark:text-stone-200">{member.displayName}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Transport -->
  <label class="block">
    <span class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-1">
      🚗 {$t('activities.transport')}
    </span>
    <select
      bind:value={transportUserId}
      class="w-full px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100"
    >
      <option value={null}>{$t('activities.noTransport')}</option>
      {#each parents as member}
        <option value={member.id}>{member.avatarEmoji} {member.displayName}</option>
      {/each}
    </select>
  </label>

  <!-- Recurring -->
  <label class="block">
    <span class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-1">
      🔁 {$t('activities.recurring')}
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

  <!-- Send Notification (only show when participants or transport user selected) -->
  {#if selectedParticipants.length > 0 || transportUserId}
    <label class="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        bind:checked={sendNotification}
        class="w-5 h-5 rounded border-stone-300 dark:border-stone-600 text-amber-500 focus:ring-amber-400"
      />
      <span class="text-sm text-stone-700 dark:text-stone-200">
        🔔 {$t('activities.sendNotification')}
      </span>
    </label>
  {/if}

  <!-- Sync to Google Calendar (only show for new activities when connected) -->
  {#if calendarConnected && !activity}
    <label class="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        bind:checked={syncToCalendar}
        class="w-5 h-5 rounded border-stone-300 dark:border-stone-600 text-amber-500 focus:ring-amber-400"
      />
      <span class="text-sm text-stone-700 dark:text-stone-200">
        {$t('activities.syncToCalendar')}
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
      class="flex-1 px-4 py-2 bg-gradient-to-r from-orange-400 to-amber-400 text-white rounded-xl font-medium hover:from-orange-500 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
    >
      {$t('common.save')}
    </button>
  </div>
</form>
