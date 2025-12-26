<script lang="ts">
  export let pendingCount = 0;
  export let assignedMembers: {
    displayName: string | null;
    username: string;
    avatarEmoji: string | null;
  }[] = [];
</script>

{#if pendingCount > 0}
  <div
    class="bg-white/90 dark:bg-stone-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-orange-200 dark:border-stone-700 p-4"
  >
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm font-semibold text-stone-600 dark:text-stone-400">🛒</span>
      <a href="/groceries" class="text-xs text-teal-600 dark:text-teal-400 hover:underline"
        >Visa lista →</a
      >
    </div>
    <a
      href="/groceries"
      class="flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-700/50 rounded px-1 -mx-1 py-1 transition-colors"
    >
      <span class="text-sm text-stone-700 dark:text-stone-300">
        <span class="font-semibold text-orange-500 dark:text-amber-400">{pendingCount}</span> varor
      </span>
      {#if assignedMembers.length > 0}
        <div class="flex items-center gap-1">
          {#each assignedMembers as member}
            <span class="text-sm" title={member.displayName || member.username}
              >{member.avatarEmoji || '👤'}</span
            >
          {/each}
        </div>
      {/if}
    </a>
  </div>
{/if}
