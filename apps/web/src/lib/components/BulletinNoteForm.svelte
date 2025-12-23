<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { t } from '$lib/i18n';
  import type { BulletinNote, BulletinColor, BulletinListItem } from '@family-hub/shared/types';

  export let note: BulletinNote | null = null;
  export let familyMembers: Array<{
    id: number;
    displayName: string | null;
    avatarEmoji: string | null;
    color: string | null;
  }> = [];

  const dispatch = createEventDispatcher<{
    save: {
      title: string;
      content?: string;
      listItems?: BulletinListItem[];
      color: BulletinColor;
      isPinned: boolean;
      expiresAt?: string | null;
      assignedTo?: number[];
    };
    cancel: void;
  }>();

  // Form state
  let title = note?.title || '';
  let content = note?.content || '';
  let color: BulletinColor = note?.color || 'yellow';
  let isPinned = note?.isPinned || false;
  let noteType: 'text' | 'list' = note?.listItems?.length ? 'list' : 'text';
  let listItems: BulletinListItem[] = note?.listItems || [];
  let newListItemText = '';
  let enableExpiry = !!note?.expiresAt;
  let expiresAt = note?.expiresAt ? note.expiresAt.split('T')[0] : '';
  let assignedTo: number[] = note?.assignedTo?.map((a) => a.id) || [];

  const colorOptions: { value: BulletinColor; bg: string; label: string }[] = [
    { value: 'yellow', bg: 'bg-yellow-200', label: 'Gul' },
    { value: 'pink', bg: 'bg-pink-200', label: 'Rosa' },
    { value: 'blue', bg: 'bg-blue-200', label: 'Blå' },
    { value: 'green', bg: 'bg-green-200', label: 'Grön' },
    { value: 'purple', bg: 'bg-purple-200', label: 'Lila' },
    { value: 'orange', bg: 'bg-orange-200', label: 'Orange' },
  ];

  function addListItem() {
    if (!newListItemText.trim()) return;
    listItems = [
      ...listItems,
      { id: crypto.randomUUID(), text: newListItemText.trim(), isChecked: false },
    ];
    newListItemText = '';
  }

  function removeListItem(id: string) {
    listItems = listItems.filter((item) => item.id !== id);
  }

  function toggleAssignment(userId: number) {
    if (assignedTo.includes(userId)) {
      assignedTo = assignedTo.filter((id) => id !== userId);
    } else {
      assignedTo = [...assignedTo, userId];
    }
  }

  function selectAllMembers() {
    assignedTo = familyMembers.map((m) => m.id);
  }

  function handleSubmit() {
    dispatch('save', {
      title,
      content: noteType === 'text' ? content || undefined : undefined,
      listItems: noteType === 'list' && listItems.length > 0 ? listItems : undefined,
      color,
      isPinned,
      expiresAt: enableExpiry && expiresAt ? new Date(expiresAt).toISOString() : null,
      assignedTo: assignedTo.length > 0 ? assignedTo : undefined,
    });
  }
</script>

<form
  on:submit|preventDefault={handleSubmit}
  class="bg-white dark:bg-stone-800 rounded-2xl shadow-md p-6 space-y-4"
>
  <h2 class="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4">
    {note ? $t('bulletin.editNote') : $t('bulletin.newNote')}
  </h2>

  <!-- Title -->
  <div>
    <label class="block">
      <span class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-1">
        {$t('bulletin.titleRequired')}
      </span>
      <input
        type="text"
        bind:value={title}
        required
        class="w-full px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
        placeholder={$t('bulletin.titlePlaceholder')}
      />
    </label>
  </div>

  <!-- Note Type Toggle -->
  <div>
    <span class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-2">{$t('bulletin.type')}</span>
    <div class="flex gap-2">
      <button
        type="button"
        on:click={() => (noteType = 'text')}
        class="px-4 py-2 rounded-xl text-sm font-medium transition-colors {noteType === 'text'
          ? 'bg-teal-500 text-white'
          : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300'}"
      >
        {$t('bulletin.typeText')}
      </button>
      <button
        type="button"
        on:click={() => (noteType = 'list')}
        class="px-4 py-2 rounded-xl text-sm font-medium transition-colors {noteType === 'list'
          ? 'bg-teal-500 text-white'
          : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300'}"
      >
        {$t('bulletin.typeList')}
      </button>
    </div>
  </div>

  <!-- Content (text mode) -->
  {#if noteType === 'text'}
    <div>
      <label class="block">
        <span class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-1">
          {$t('bulletin.message')}
        </span>
        <textarea
          bind:value={content}
          rows="3"
          class="w-full px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
          placeholder={$t('bulletin.messagePlaceholder')}
        ></textarea>
      </label>
    </div>
  {/if}

  <!-- List Items (list mode) -->
  {#if noteType === 'list'}
    <div>
      <span class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-2">
        {$t('bulletin.listItems')}
      </span>

      <!-- Existing items -->
      {#if listItems.length > 0}
        <div class="space-y-2 mb-3">
          {#each listItems as item (item.id)}
            <div class="flex items-center gap-2">
              <span class="text-stone-600 dark:text-stone-300 flex-1">{item.text}</span>
              <button
                type="button"
                on:click={() => removeListItem(item.id)}
                class="p-1 text-red-500 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Add new item -->
      <div class="flex gap-2">
        <input
          type="text"
          bind:value={newListItemText}
          on:keydown={(e) => e.key === 'Enter' && (e.preventDefault(), addListItem())}
          class="flex-1 px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
          placeholder={$t('bulletin.newItem')}
        />
        <button
          type="button"
          on:click={addListItem}
          class="px-4 py-2 bg-teal-500 text-white rounded-xl hover:bg-teal-600"
        >
          +
        </button>
      </div>
    </div>
  {/if}

  <!-- Color -->
  <div>
    <span class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-2">{$t('bulletin.color')}</span>
    <div class="flex gap-2 flex-wrap">
      {#each colorOptions as opt}
        <button
          type="button"
          on:click={() => (color = opt.value)}
          class="w-8 h-8 rounded-full {opt.bg} border-2 transition-all {color === opt.value
            ? 'border-stone-800 dark:border-white scale-110'
            : 'border-transparent'}"
          title={opt.label}
        ></button>
      {/each}
    </div>
  </div>

  <!-- Assign to family members (for notifications) -->
  <div>
    <div class="flex items-center justify-between mb-2">
      <span class="block text-sm font-medium text-stone-600 dark:text-stone-300">
        {$t('bulletin.notifyPush')}
      </span>
      <button
        type="button"
        on:click={selectAllMembers}
        class="text-xs text-teal-600 dark:text-teal-400 hover:underline"
      >
        {$t('bulletin.allMembers')}
      </button>
    </div>
    <div class="flex flex-wrap gap-2">
      {#each familyMembers as member}
        <button
          type="button"
          on:click={() => toggleAssignment(member.id)}
          class="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors {assignedTo.includes(
            member.id
          )
            ? 'bg-teal-500 text-white'
            : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300'}"
        >
          <span>{member.avatarEmoji || '👤'}</span>
          <span>{member.displayName || $t('bulletin.anonymous')}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Pin toggle -->
  <div class="flex items-center gap-3">
    <label class="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        bind:checked={isPinned}
        class="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-teal-500 focus:ring-teal-400"
      />
      <span class="text-sm text-stone-600 dark:text-stone-300">{$t('bulletin.pinTop')}</span>
    </label>
  </div>

  <!-- Expiry -->
  <div>
    <label class="flex items-center gap-2 cursor-pointer mb-2">
      <input
        type="checkbox"
        bind:checked={enableExpiry}
        class="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-teal-500 focus:ring-teal-400"
      />
      <span class="text-sm text-stone-600 dark:text-stone-300">{$t('bulletin.expires')}</span>
    </label>
    {#if enableExpiry}
      <input
        type="date"
        bind:value={expiresAt}
        class="w-full px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
      />
    {/if}
  </div>

  <!-- Actions -->
  <div class="flex gap-3 pt-4">
    <button
      type="button"
      on:click={() => dispatch('cancel')}
      class="flex-1 px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 font-medium hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors"
    >
      {$t('common.cancel')}
    </button>
    <button
      type="submit"
      class="flex-1 px-4 py-2 rounded-xl bg-teal-500 text-white font-medium hover:bg-teal-600 transition-colors"
    >
      {note ? $t('common.save') : $t('welcome.create')}
    </button>
  </div>
</form>
