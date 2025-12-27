<script lang="ts">
  import { createEventDispatcher } from 'svelte';

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
    class="bg-white/90 dark:bg-stone-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-orange-200 dark:border-stone-700 p-3"
  >
    <!-- User Header with navigation buttons in top right -->
    <div class="relative">
      <!-- Navigation buttons in top right corner: Profile - Account - Settings -->
      <div class="absolute top-0 right-0 flex items-center gap-0.5">
        <button
          on:click={() => dispatch('setSection', 'profile')}
          class="p-1.5 rounded-lg transition-colors
            {activeSection === 'profile'
            ? 'bg-orange-200 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400'
            : 'hover:bg-stone-200/50 dark:hover:bg-stone-600/50 text-stone-400 dark:text-stone-500'}"
          title="Profil"
        >
          <span class="text-sm">👤</span>
        </button>
        {#if isOwnProfile}
          <button
            on:click={() => dispatch('setSection', 'account')}
            class="p-1.5 rounded-lg transition-colors
              {activeSection === 'account'
              ? 'bg-orange-200 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400'
              : 'hover:bg-stone-200/50 dark:hover:bg-stone-600/50 text-stone-400 dark:text-stone-500'}"
            title="Konto"
          >
            <span class="text-sm">🔐</span>
          </button>
          <button
            on:click={() => dispatch('setSection', 'settings')}
            class="p-1.5 rounded-lg transition-colors
              {activeSection === 'settings'
              ? 'bg-orange-200 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400'
              : 'hover:bg-stone-200/50 dark:hover:bg-stone-600/50 text-stone-400 dark:text-stone-500'}"
            title="Inställningar"
          >
            <span class="text-sm">⚙️</span>
          </button>
        {/if}
      </div>

      <!-- User section: Avatar + Name as Overview button -->
      <button
        on:click={() => dispatch('setSection', 'overview')}
        class="w-full flex items-center gap-2.5 pr-20 py-1 rounded-xl transition-colors text-left
          {activeSection === 'overview'
          ? 'bg-orange-100/50 dark:bg-orange-900/20'
          : 'hover:bg-stone-100/50 dark:hover:bg-stone-700/30'}"
      >
        <div
          class="{bgColor} w-9 h-9 rounded-full flex items-center justify-center text-lg shadow-md flex-shrink-0"
        >
          {profile.avatarEmoji || '👤'}
        </div>
        <div class="min-w-0 flex-1">
          <span class="font-semibold text-sm text-stone-800 dark:text-white truncate block">
            {profile.displayName || profile.username}
          </span>
          <span class="text-[11px] text-stone-400 dark:text-stone-500 truncate block">
            @{profile.username}
          </span>
        </div>
      </button>
    </div>

    <!-- Message button (only show if viewing someone else's profile) -->
    {#if !isOwnProfile}
      <button
        on:click={() => dispatch('toggleMessageForm')}
        class="w-full flex items-center gap-2 px-2 py-1.5 mt-2 rounded-lg transition-colors text-sm
          {showMessageForm
          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
          : 'hover:bg-stone-100 dark:hover:bg-stone-700/50 text-stone-500 dark:text-stone-400'}"
      >
        <span>💬</span>
        <span class="font-medium">Meddelande</span>
      </button>
    {/if}
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
