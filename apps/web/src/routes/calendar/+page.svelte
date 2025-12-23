<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { t } from '$lib/i18n';
  import { currentUser, currentFamily } from '$lib/stores/auth';
  import type { GoogleCalendar, GoogleCalendarEvent } from '@family-hub/shared/types';

  let connected = false;
  let googleEmail = '';
  let calendars: GoogleCalendar[] = [];
  let events: GoogleCalendarEvent[] = [];
  let selectedCalendarIds: string[] = [];
  let familyCalendarId: string | null = null;
  let loading = true;
  let loadingEvents = false;
  let showSettings = false;

  // Calendar view state
  let currentDate = new Date();
  let viewMode: 'week' | 'month' = 'week';

  $: currentMonth = currentDate.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' });
  $: weekDays = getWeekDays(currentDate);
  $: monthDays = getMonthDays(currentDate);

  onMount(async () => {
    // Check for successful connection redirect
    if ($page.url.searchParams.get('connected') === 'true') {
      // Remove the query param
      window.history.replaceState({}, '', '/calendar');
    }

    await checkConnectionStatus();
  });

  async function checkConnectionStatus() {
    loading = true;
    try {
      const res = await fetch('/api/calendar/google/status', {
        headers: { 'x-user-id': String($currentUser?.id || '') },
      });
      if (res.ok) {
        const data = await res.json();
        connected = data.connected;
        googleEmail = data.email || '';
        selectedCalendarIds = data.selectedCalendarIds || [];
        familyCalendarId = data.familyCalendarId;

        if (connected) {
          await loadCalendars();
          await loadEvents();
        }
      }
    } catch (err) {
      console.error('Failed to check connection status:', err);
    } finally {
      loading = false;
    }
  }

  async function connectGoogle() {
    try {
      const res = await fetch('/api/calendar/google/auth', {
        headers: {
          'x-user-id': String($currentUser?.id || ''),
          'x-family-id': String($currentFamily?.id || ''),
        },
      });
      if (res.ok) {
        const { authUrl } = await res.json();
        window.location.href = authUrl;
      }
    } catch (err) {
      console.error('Failed to get auth URL:', err);
    }
  }

  async function disconnectGoogle() {
    if (!confirm('Är du säker på att du vill koppla bort Google Calendar?')) return;

    try {
      const res = await fetch('/api/calendar/google/disconnect', {
        method: 'DELETE',
        headers: { 'x-user-id': String($currentUser?.id || '') },
      });
      if (res.ok) {
        connected = false;
        googleEmail = '';
        calendars = [];
        events = [];
        selectedCalendarIds = [];
        familyCalendarId = null;
      }
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  }

  async function loadCalendars() {
    try {
      const res = await fetch('/api/calendar/google/calendars', {
        headers: { 'x-user-id': String($currentUser?.id || '') },
      });
      if (res.ok) {
        calendars = await res.json();
      }
    } catch (err) {
      console.error('Failed to load calendars:', err);
    }
  }

  async function loadEvents() {
    if (selectedCalendarIds.length === 0) {
      events = [];
      return;
    }

    loadingEvents = true;
    try {
      const timeMin = getViewStart().toISOString();
      const timeMax = getViewEnd().toISOString();

      const res = await fetch(`/api/calendar/google/events?timeMin=${timeMin}&timeMax=${timeMax}`, {
        headers: { 'x-user-id': String($currentUser?.id || '') },
      });
      if (res.ok) {
        events = await res.json();
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      loadingEvents = false;
    }
  }

  async function saveSettings() {
    try {
      const res = await fetch('/api/calendar/google/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String($currentUser?.id || ''),
        },
        body: JSON.stringify({
          selectedCalendarIds,
          familyCalendarId,
        }),
      });
      if (res.ok) {
        showSettings = false;
        await loadEvents();
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  }

  function toggleCalendar(calendarId: string) {
    if (selectedCalendarIds.includes(calendarId)) {
      selectedCalendarIds = selectedCalendarIds.filter((id) => id !== calendarId);
    } else {
      selectedCalendarIds = [...selectedCalendarIds, calendarId];
    }
  }

  function getViewStart(): Date {
    if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - d.getDay() + 1); // Monday
      d.setHours(0, 0, 0, 0);
      return d;
    } else {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      d.setHours(0, 0, 0, 0);
      return d;
    }
  }

  function getViewEnd(): Date {
    if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - d.getDay() + 7); // Sunday
      d.setHours(23, 59, 59, 999);
      return d;
    } else {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      d.setHours(23, 59, 59, 999);
      return d;
    }
  }

  function getWeekDays(date: Date): Date[] {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay() + 1); // Monday
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }

  function getMonthDays(date: Date): Date[] {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Start from Monday of the first week
    const start = new Date(firstDay);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));

    const days: Date[] = [];
    const current = new Date(start);
    while (current <= lastDay || days.length % 7 !== 0) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }

  function getEventsForDay(day: Date): GoogleCalendarEvent[] {
    const dayStr = day.toISOString().slice(0, 10);
    return events.filter((event) => {
      const eventDate = (event.start.dateTime || event.start.date || '').slice(0, 10);
      return eventDate === dayStr;
    });
  }

  function formatEventTime(event: GoogleCalendarEvent): string {
    if (event.start.date) return 'Heldag';
    if (event.start.dateTime) {
      return new Date(event.start.dateTime).toLocaleTimeString('sv-SE', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return '';
  }

  function getCalendarColor(calendarId: string): string {
    const calendar = calendars.find((c) => c.id === calendarId);
    return calendar?.backgroundColor || '#4285f4';
  }

  function prevPeriod() {
    const d = new Date(currentDate);
    if (viewMode === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setMonth(d.getMonth() - 1);
    }
    currentDate = d;
    loadEvents();
  }

  function nextPeriod() {
    const d = new Date(currentDate);
    if (viewMode === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    currentDate = d;
    loadEvents();
  }

  function goToToday() {
    currentDate = new Date();
    loadEvents();
  }

  function isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  function isCurrentMonth(date: Date): boolean {
    return date.getMonth() === currentDate.getMonth();
  }
</script>

<svelte:head>
  <title>Kalender - Family Hub</title>
</svelte:head>

<div class="flex-1 p-4 max-w-6xl mx-auto w-full">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-2xl font-bold text-stone-800 dark:text-stone-100">
      📅 {$t('calendar.title')}
    </h1>
    {#if connected}
      <button
        on:click={() => (showSettings = true)}
        class="px-4 py-2 bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
      >
        ⚙️ Inställningar
      </button>
    {/if}
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="text-stone-500">{$t('common.loading')}</div>
    </div>
  {:else if !connected}
    <!-- Connect Google Account -->
    <div class="bg-white dark:bg-stone-800 rounded-2xl shadow-md p-8 text-center">
      <div class="text-6xl mb-4">🔗</div>
      <h2 class="text-xl font-bold text-stone-800 dark:text-stone-100 mb-2">
        Anslut Google Calendar
      </h2>
      <p class="text-stone-600 dark:text-stone-400 mb-6 max-w-md mx-auto">
        Koppla ditt Google-konto för att se alla dina kalendrar och aktiviteter på ett ställe.
      </p>
      <button
        on:click={connectGoogle}
        class="px-6 py-3 bg-gradient-to-r from-orange-400 to-amber-400 text-white rounded-xl font-medium hover:from-orange-500 hover:to-amber-500 transition-all shadow-md inline-flex items-center gap-2"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Anslut med Google
      </button>
    </div>
  {:else}
    <!-- Calendar Navigation -->
    <div class="bg-white dark:bg-stone-800 rounded-2xl shadow-md p-4 mb-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button
            on:click={prevPeriod}
            class="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors"
          >
            ←
          </button>
          <button
            on:click={goToToday}
            class="px-3 py-1 text-sm bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors"
          >
            Idag
          </button>
          <button
            on:click={nextPeriod}
            class="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors"
          >
            →
          </button>
          <span class="ml-4 text-lg font-semibold text-stone-800 dark:text-stone-100 capitalize">
            {currentMonth}
          </span>
        </div>

        <div class="flex items-center gap-2">
          <button
            on:click={() => {
              viewMode = 'week';
              loadEvents();
            }}
            class="px-3 py-1 rounded-lg transition-colors {viewMode === 'week'
              ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
              : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700'}"
          >
            Vecka
          </button>
          <button
            on:click={() => {
              viewMode = 'month';
              loadEvents();
            }}
            class="px-3 py-1 rounded-lg transition-colors {viewMode === 'month'
              ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
              : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700'}"
          >
            Månad
          </button>
        </div>
      </div>
    </div>

    <!-- Calendar Grid -->
    {#if loadingEvents}
      <div class="bg-white dark:bg-stone-800 rounded-2xl shadow-md p-8 text-center">
        <div class="text-stone-500">{$t('common.loading')}</div>
      </div>
    {:else if viewMode === 'week'}
      <!-- Week View -->
      <div class="bg-white dark:bg-stone-800 rounded-2xl shadow-md overflow-hidden">
        <div class="grid grid-cols-7 border-b border-stone-200 dark:border-stone-700">
          {#each ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'] as day, i}
            <div
              class="p-3 text-center border-r border-stone-200 dark:border-stone-700 last:border-r-0"
            >
              <div class="text-xs text-stone-500 dark:text-stone-400 uppercase">{day}</div>
              <div
                class="text-lg font-semibold mt-1 {isToday(weekDays[i])
                  ? 'bg-amber-400 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto'
                  : 'text-stone-800 dark:text-stone-100'}"
              >
                {weekDays[i].getDate()}
              </div>
            </div>
          {/each}
        </div>
        <div class="grid grid-cols-7 min-h-[400px]">
          {#each weekDays as day, i}
            {@const dayEvents = getEventsForDay(day)}
            <div
              class="p-2 border-r border-stone-200 dark:border-stone-700 last:border-r-0 {isToday(
                day
              )
                ? 'bg-amber-50 dark:bg-amber-900/20'
                : ''}"
            >
              {#each dayEvents as event}
                <div
                  class="text-xs p-1.5 mb-1 rounded-lg truncate"
                  style="background-color: {getCalendarColor(
                    event.calendarId
                  )}20; border-left: 3px solid {getCalendarColor(event.calendarId)};"
                  title={event.summary}
                >
                  <span class="font-medium text-stone-700 dark:text-stone-200"
                    >{formatEventTime(event)}</span
                  >
                  <span class="text-stone-600 dark:text-stone-300 ml-1">{event.summary}</span>
                </div>
              {/each}
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <!-- Month View -->
      <div class="bg-white dark:bg-stone-800 rounded-2xl shadow-md overflow-hidden">
        <div class="grid grid-cols-7 border-b border-stone-200 dark:border-stone-700">
          {#each ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'] as day}
            <div
              class="p-2 text-center text-xs text-stone-500 dark:text-stone-400 uppercase font-medium"
            >
              {day}
            </div>
          {/each}
        </div>
        <div class="grid grid-cols-7">
          {#each monthDays as day}
            {@const dayEvents = getEventsForDay(day)}
            <div
              class="min-h-[100px] p-1 border-r border-b border-stone-200 dark:border-stone-700 {!isCurrentMonth(
                day
              )
                ? 'bg-stone-50 dark:bg-stone-800/50'
                : ''} {isToday(day) ? 'bg-amber-50 dark:bg-amber-900/20' : ''}"
            >
              <div
                class="text-sm font-medium mb-1 {isToday(day)
                  ? 'bg-amber-400 text-white rounded-full w-6 h-6 flex items-center justify-center'
                  : isCurrentMonth(day)
                    ? 'text-stone-800 dark:text-stone-100'
                    : 'text-stone-400 dark:text-stone-600'}"
              >
                {day.getDate()}
              </div>
              {#each dayEvents.slice(0, 3) as event}
                <div
                  class="text-xs p-1 mb-0.5 rounded truncate"
                  style="background-color: {getCalendarColor(
                    event.calendarId
                  )}30; color: {getCalendarColor(event.calendarId)};"
                  title={event.summary}
                >
                  {event.summary}
                </div>
              {/each}
              {#if dayEvents.length > 3}
                <div class="text-xs text-stone-500 dark:text-stone-400 pl-1">
                  +{dayEvents.length - 3} till
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Connection Info -->
    <div class="mt-4 text-center text-sm text-stone-500 dark:text-stone-400">
      Ansluten som: {googleEmail}
    </div>
  {/if}
</div>

<!-- Settings Modal -->
{#if showSettings}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div
      class="bg-white dark:bg-stone-800 rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto"
    >
      <div class="p-6">
        <h2 class="text-xl font-bold text-stone-800 dark:text-stone-100 mb-4">
          Kalenderinställningar
        </h2>

        <!-- Select Calendars -->
        <div class="mb-6">
          <h3 class="font-medium text-stone-700 dark:text-stone-200 mb-2">Visa kalendrar</h3>
          <div class="space-y-2">
            {#each calendars as calendar}
              <label
                class="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedCalendarIds.includes(calendar.id)}
                  on:change={() => toggleCalendar(calendar.id)}
                  class="w-4 h-4 rounded border-stone-300 text-amber-500 focus:ring-amber-500"
                />
                <span
                  class="w-3 h-3 rounded-full"
                  style="background-color: {calendar.backgroundColor}"
                ></span>
                <span class="text-stone-700 dark:text-stone-200">{calendar.summary}</span>
                {#if calendar.primary}
                  <span class="text-xs text-stone-500">(Primär)</span>
                {/if}
              </label>
            {/each}
          </div>
        </div>

        <!-- Family Calendar -->
        <div class="mb-6">
          <h3 class="font-medium text-stone-700 dark:text-stone-200 mb-2">Familjekalender</h3>
          <p class="text-sm text-stone-500 dark:text-stone-400 mb-2">
            Aktiviteter läggs till i denna kalender
          </p>
          <select
            bind:value={familyCalendarId}
            class="w-full px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100"
          >
            <option value={null}>Välj kalender...</option>
            {#each calendars.filter((c) => c.accessRole === 'owner' || c.accessRole === 'writer') as calendar}
              <option value={calendar.id}>{calendar.summary}</option>
            {/each}
          </select>
        </div>

        <!-- Actions -->
        <div class="flex gap-3">
          <button
            on:click={() => (showSettings = false)}
            class="flex-1 px-4 py-2 bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
          >
            Avbryt
          </button>
          <button
            on:click={saveSettings}
            class="flex-1 px-4 py-2 bg-gradient-to-r from-orange-400 to-amber-400 text-white rounded-xl font-medium hover:from-orange-500 hover:to-amber-500 transition-all"
          >
            Spara
          </button>
        </div>

        <!-- Disconnect -->
        <div class="mt-6 pt-6 border-t border-stone-200 dark:border-stone-700">
          <button
            on:click={disconnectGoogle}
            class="w-full px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
          >
            Koppla bort Google Calendar
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
