<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { goto } from '$app/navigation';

  export let profile: {
    displayName: string | null;
    username: string;
    avatarEmoji: string | null;
  };
  export let bgColor: string;
  export let activeSection: string;
  export let isOwnProfile: boolean;
  export let showMessageForm: boolean;
  export let messageText: string;
  export let sendingMessage: boolean;

  const dispatch = createEventDispatcher<{
    setSection: string;
    toggleMessageForm: void;
    sendMessage: void;
    cancelMessage: void;
  }>();
</script>

<aside class="lg:w-64 flex-shrink-0">
  <div
    class="bg-white/90 dark:bg-stone-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-orange-200 dark:border-stone-700 p-3 lg:p-4"
  >
    <!-- User section: Avatar + Name as Overview button -->
    <button
      on:click={() => dispatch('setSection', 'overview')}
      class="w-full flex items-center gap-3 px-2 py-2 rounded-xl transition-colors text-left mb-2
        {activeSection === 'overview'
        ? 'bg-orange-100 dark:bg-orange-900/30'
        : 'hover:bg-stone-100 dark:hover:bg-stone-700/50'}"
    >
      <div
        class="{bgColor} w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-md flex-shrink-0"
      >
        {profile.avatarEmoji || '👤'}
      </div>
      <div class="min-w-0 flex-1">
        <span
          class="font-semibold text-sm lg:text-base text-stone-800 dark:text-white truncate block"
        >
          {profile.displayName || profile.username}
        </span>
        <span class="text-xs text-stone-400 dark:text-stone-500 truncate block">
          @{profile.username}
        </span>
      </div>
    </button>

    <!-- Message button (only show if viewing someone else's profile) -->
    {#if !isOwnProfile}
      <button
        on:click={() => dispatch('toggleMessageForm')}
        class="w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-colors mb-2
          {showMessageForm
          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
          : 'hover:bg-stone-100 dark:hover:bg-stone-700/50 text-stone-500 dark:text-stone-400'}"
      >
        <span>💬</span>
        <span class="font-medium text-sm">Meddelande</span>
      </button>
    {/if}

    <!-- Profile and Tillbaka buttons row -->
    <div class="flex gap-2">
      <button
        on:click={() => dispatch('setSection', 'profile')}
        class="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl transition-colors
          {activeSection === 'profile'
          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
          : 'hover:bg-stone-100 dark:hover:bg-stone-700/50 text-stone-500 dark:text-stone-400'}"
      >
        <span>👤</span>
        <span class="font-medium text-sm">Profil</span>
      </button>
      <button
        on:click={() => goto('/')}
        class="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-700/50 text-stone-500 dark:text-stone-400 transition-colors"
      >
        <span>←</span>
        <span class="font-medium text-sm">Tillbaka</span>
      </button>
    </div>
  </div>

  <!-- Message Form (appears below sidebar when active) -->
  {#if showMessageForm && !isOwnProfile}
    <div
      class="mt-3 bg-white/90 dark:bg-stone-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-blue-200 dark:border-blue-800 p-4"
    >
      <div class="flex items-center gap-2 mb-3">
        <span class="text-lg">💬</span>
        <span class="font-semibold text-stone-700 dark:text-stone-200 text-sm"
          >Skicka meddelande till {profile.displayName || profile.username}</span
        >
      </div>
      <textarea
        bind:value={messageText}
        placeholder="Skriv ditt meddelande..."
        class="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 text-sm resize-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
        rows="3"
      ></textarea>
      <div class="flex justify-end gap-2 mt-3">
        <button
          on:click={() => dispatch('cancelMessage')}
          class="px-3 py-1.5 text-sm text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors"
        >
          Avbryt
        </button>
        <button
          on:click={() => dispatch('sendMessage')}
          disabled={!messageText.trim() || sendingMessage}
          class="px-4 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {#if sendingMessage}
            <span class="animate-spin">⏳</span>
          {:else}
            <span>📌</span>
          {/if}
          Fäst
        </button>
      </div>
    </div>
  {/if}
</aside>
