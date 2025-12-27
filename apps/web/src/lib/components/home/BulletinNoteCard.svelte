<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { t } from '$lib/i18n';
  import type { BulletinNote } from '@family-hub/shared/types';

  export let note: BulletinNote;

  const dispatch = createEventDispatcher<{
    edit: BulletinNote;
    delete: number;
    toggleItem: { noteId: number; itemId: string };
  }>();

  const noteColorClasses: Record<string, string> = {
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700',
    pink: 'bg-pink-100 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700',
    blue: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
    green: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700',
    purple: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700',
    orange: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700',
  };

  function timeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just nu';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min sedan`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} tim sedan`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} dagar sedan`;
    return date.toLocaleDateString('sv-SE');
  }
</script>

<div
  class="rounded-2xl shadow-xl border p-4 {noteColorClasses[note.color] || noteColorClasses.yellow}"
>
  <!-- Header: Creator + Pin + Actions -->
  <div class="flex items-start justify-between mb-1">
    <div class="flex items-center gap-2 flex-wrap">
      {#if note.isPinned}
        <span class="text-sm">📌</span>
      {/if}
      <span class="text-xs text-stone-500 dark:text-stone-400">
        {note.creator?.avatarEmoji || '👤'}
        {note.creator?.displayName || $t('bulletin.someone')}
        {#if note.assignedTo && note.assignedTo.length > 0 && !(note.assignedTo.length === 1 && note.assignedTo[0].id === note.creator?.id)}
          <span class="mx-0.5">→</span>
          {#each note.assignedTo as recipient, i}
            {recipient.avatarEmoji || '👤'}
            {recipient.displayName || 'Användare'}{#if i < note.assignedTo.length - 1},
            {/if}
          {/each}
        {/if}
        <span class="mx-1">·</span>
        {timeAgo(note.createdAt)}
      </span>
    </div>
    <div class="flex items-center gap-1">
      <button
        on:click={() => dispatch('edit', note)}
        class="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
        title={$t('common.edit')}
      >
        ✏️
      </button>
      <button
        on:click={() => dispatch('delete', note.id)}
        class="p-1 text-stone-400 hover:text-red-500"
        title={$t('common.delete')}
      >
        🗑️
      </button>
    </div>
  </div>

  <!-- Title -->
  {#if note.title}
    <h3 class="font-semibold text-stone-800 dark:text-stone-100 mb-1">{note.title}</h3>
  {/if}

  <!-- Content or List -->
  {#if note.content}
    <p class="text-sm text-stone-600 dark:text-stone-300 whitespace-pre-wrap">
      {note.content}
    </p>
  {/if}
  {#if note.listItems && note.listItems.length > 0}
    <div class="space-y-1">
      {#each note.listItems as item (item.id)}
        <button
          on:click={() => dispatch('toggleItem', { noteId: note.id, itemId: item.id })}
          class="flex items-center gap-2 text-sm text-left w-full hover:bg-black/5 dark:hover:bg-white/5 rounded px-1 -mx-1 py-0.5"
        >
          <span
            class="w-4 h-4 rounded border border-stone-400 flex items-center justify-center text-xs {item.isChecked
              ? 'bg-teal-500 border-teal-500 text-white'
              : ''}"
          >
            {#if item.isChecked}✓{/if}
          </span>
          <span
            class={item.isChecked
              ? 'line-through text-stone-400'
              : 'text-stone-700 dark:text-stone-300'}>{item.text}</span
          >
        </button>
      {/each}
    </div>
  {/if}

  <!-- Expiry notice -->
  {#if note.expiresAt}
    <p class="text-[10px] text-stone-400 dark:text-stone-500 mt-2">
      Förfaller {new Date(note.expiresAt).toLocaleDateString('sv-SE')}
    </p>
  {/if}
</div>
