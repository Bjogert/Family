<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { t } from '$lib/i18n';

  interface UserPreferences {
    theme: 'light' | 'dark' | 'system';
    notifications: {
      groceryAssigned: boolean;
      groceryListUpdated: boolean;
      calendarEventCreated: boolean;
      calendarEventReminder: boolean;
    };
  }

  export let preferences: UserPreferences;
  export let pushSupported: boolean;
  export let pushSubscribed: boolean;
  export let pushPermission: NotificationPermission;
  export let pushLoading: boolean;
  export let pushTestSent: boolean;
  export let saving: boolean;

  const dispatch = createEventDispatcher<{
    togglePush: void;
    testNotification: void;
    setTheme: string;
    save: void;
  }>();
</script>

<h2 class="text-xl font-bold text-stone-800 dark:text-white mb-6">Inställningar</h2>

<!-- Notification Settings -->
<div class="space-y-6">
  <!-- Push Notifications Master Toggle -->
  {#if pushSupported}
    <div>
      <h3 class="font-semibold text-stone-700 dark:text-stone-300 mb-4">Push-notifikationer</h3>
      <div class="space-y-3">
        <div
          class="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-700/50 rounded-xl"
        >
          <div>
            <p class="font-medium text-stone-800 dark:text-white">Aktivera push-notifikationer</p>
            <p class="text-sm text-stone-500 dark:text-stone-400">
              {#if pushPermission === 'denied'}
                Blockerad i webbläsaren - ändra i inställningarna
              {:else if pushSubscribed}
                Notifikationer är aktiverade på denna enhet
              {:else}
                Få notifikationer även när appen är stängd
              {/if}
            </p>
          </div>
          <button
            type="button"
            on:click={() => dispatch('togglePush')}
            disabled={pushLoading || pushPermission === 'denied'}
            class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
              {pushSubscribed ? 'bg-orange-500' : 'bg-stone-300 dark:bg-stone-600'}"
          >
            <span
              class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                {pushSubscribed ? 'translate-x-5' : 'translate-x-0'}"
            />
          </button>
        </div>

        <!-- Test notification button - always visible when push is supported -->
        <button
          type="button"
          on:click={() => dispatch('testNotification')}
          disabled={pushLoading || !pushSubscribed}
          class="w-full py-2 text-sm bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {#if pushTestSent}
            <span>✅ Testnotifikation skickad!</span>
          {:else if pushLoading}
            <span>Skickar...</span>
          {:else if !pushSubscribed}
            <span>🔔 Aktivera push först för att testa</span>
          {:else}
            <span>🔔 Skicka testnotifikation</span>
          {/if}
        </button>
      </div>
    </div>
  {/if}

  <!-- Notification Types -->
  <div>
    <h3 class="font-semibold text-stone-700 dark:text-stone-300 mb-4">Notifikationer</h3>
    <div class="space-y-3">
      <label
        class="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-700/50 rounded-xl cursor-pointer"
      >
        <div>
          <p class="font-medium text-stone-800 dark:text-white">Tilldelade varor</p>
          <p class="text-sm text-stone-500 dark:text-stone-400">När någon tilldelar dig en vara</p>
        </div>
        <input
          type="checkbox"
          bind:checked={preferences.notifications.groceryAssigned}
          class="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
        />
      </label>

      <label
        class="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-700/50 rounded-xl cursor-pointer"
      >
        <div>
          <p class="font-medium text-stone-800 dark:text-white">Inköpslistan uppdaterad</p>
          <p class="text-sm text-stone-500 dark:text-stone-400">
            När varor läggs till eller tas bort
          </p>
        </div>
        <input
          type="checkbox"
          bind:checked={preferences.notifications.groceryListUpdated}
          class="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
        />
      </label>

      <label
        class="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-700/50 rounded-xl cursor-pointer"
      >
        <div>
          <p class="font-medium text-stone-800 dark:text-white">Nya kalenderhändelser</p>
          <p class="text-sm text-stone-500 dark:text-stone-400">När nya händelser skapas</p>
        </div>
        <input
          type="checkbox"
          bind:checked={preferences.notifications.calendarEventCreated}
          class="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
        />
      </label>

      <label
        class="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-700/50 rounded-xl cursor-pointer"
      >
        <div>
          <p class="font-medium text-stone-800 dark:text-white">Påminnelser</p>
          <p class="text-sm text-stone-500 dark:text-stone-400">
            Påminnelser för kommande händelser
          </p>
        </div>
        <input
          type="checkbox"
          bind:checked={preferences.notifications.calendarEventReminder}
          class="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
        />
      </label>
    </div>
  </div>

  <!-- Theme Settings -->
  <div>
    <h3 class="font-semibold text-stone-700 dark:text-stone-300 mb-4">Utseende</h3>
    <div class="flex gap-3">
      {#each [{ value: 'light', label: 'Ljust', icon: '☀️' }, { value: 'dark', label: 'Mörkt', icon: '🌙' }, { value: 'system', label: 'System', icon: '💻' }] as theme}
        <button
          type="button"
          on:click={() => dispatch('setTheme', theme.value)}
          class="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors
            {preferences.theme === theme.value
            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
            : 'border-stone-200 dark:border-stone-700 hover:border-orange-300'}"
        >
          <span class="text-2xl">{theme.icon}</span>
          <span class="text-sm font-medium text-stone-700 dark:text-stone-300">{theme.label}</span>
        </button>
      {/each}
    </div>
  </div>

  <button
    on:click={() => dispatch('save')}
    disabled={saving}
    class="w-full py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
  >
    {saving ? $t('common.saving') : $t('profile.save')}
  </button>
</div>
