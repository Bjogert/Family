<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { get, put } from '$lib/api/client';
  import { currentUser, currentFamily } from '$lib/stores/auth';
  import { t } from '$lib/i18n';
  import {
    isPushSupported,
    getPermissionStatus,
    subscribeToPush,
    unsubscribeFromPush,
    isSubscribed,
    sendTestNotification,
  } from '$lib/utils/pushNotifications';

  // Types
  interface UserProfile {
    id: number;
    username: string;
    displayName: string | null;
    role: string | null;
    birthday: string | null;
    gender: string | null;
    avatarEmoji: string | null;
    color: string | null;
    createdAt: string;
    lastLogin: string | null;
  }

  interface UserPreferences {
    theme: 'light' | 'dark' | 'system';
    notifications: {
      groceryAssigned: boolean;
      groceryListUpdated: boolean;
      calendarEventCreated: boolean;
      calendarEventReminder: boolean;
    };
  }

  interface GroceryItem {
    id: number;
    name: string;
    quantity: number | null;
    unit: string | null;
    isBought: boolean;
    assignedTo: number | null;
  }

  interface AssignedTask {
    id: number;
    title: string;
    category: string;
    difficulty: string;
    points: number;
    status: 'open' | 'in_progress' | 'done' | 'verified';
    dueDate: string | null;
    dueTime: string | null;
    requiresValidation: boolean;
    createdBy: number | null;
    assignedTo: number | null;
    creator?: { displayName: string | null };
  }

  interface CalendarEvent {
    id: number;
    title: string;
    startDate: string;
    endDate: string | null;
    allDay: boolean;
  }

  // Color mapping
  const colorClasses: Record<string, string> = {
    orange: 'bg-orange-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    green: 'bg-emerald-400',
    blue: 'bg-sky-400',
    purple: 'bg-violet-400',
    stone: 'bg-stone-400',
  };

  // These will be set reactively with translations
  let colorOptions: Array<{ value: string; label: string; class: string }> = [];
  let roleOptions: Array<{ value: string; label: string }> = [];
  let genderOptions: Array<{ value: string; label: string }> = [];

  let emojiOptions = [
    '🐻',
    '🐱',
    '🐶',
    '🦊',
    '🐰',
    '🐼',
    '🐨',
    '🐷',
    '🐸',
    '🦁',
    '🐯',
    '🐮',
    '🐵',
    '🦄',
    '🐲',
    '👤',
    '👩',
    '👨',
    '👧',
    '👦',
    '👶',
    '🧑',
    '😊',
    '😎',
    '🤓',
    '🥳',
  ];

  $: {
    colorOptions = [
      { value: 'orange', label: $t('color.orange'), class: 'bg-orange-400' },
      { value: 'amber', label: $t('color.amber'), class: 'bg-amber-400' },
      { value: 'rose', label: $t('color.rose'), class: 'bg-rose-400' },
      { value: 'green', label: $t('color.green'), class: 'bg-emerald-400' },
      { value: 'blue', label: $t('color.blue'), class: 'bg-sky-400' },
      { value: 'purple', label: $t('color.purple'), class: 'bg-violet-400' },
      { value: 'stone', label: $t('color.stone'), class: 'bg-stone-400' },
    ];

    roleOptions = [
      { value: 'pappa', label: $t('role.father') },
      { value: 'mamma', label: $t('role.mother') },
      { value: 'barn', label: $t('role.child') },
      { value: 'bebis', label: $t('role.other') },
      { value: 'farfar', label: $t('role.grandfather') },
      { value: 'farmor', label: $t('role.grandmother') },
      { value: 'morfar', label: $t('role.grandfather2') },
      { value: 'mormor', label: $t('role.grandmother2') },
    ];

    genderOptions = [
      { value: 'male', label: $t('gender.male') },
      { value: 'female', label: $t('gender.female') },
      { value: 'other', label: $t('gender.other') },
    ];
  }

  // State
  let userId: number;
  let profile: UserProfile | null = null;
  let preferences: UserPreferences = {
    theme: 'system',
    notifications: {
      groceryAssigned: true,
      groceryListUpdated: true,
      calendarEventCreated: true,
      calendarEventReminder: true,
    },
  };
  let assignedGroceries: GroceryItem[] = [];
  let assignedTasks: AssignedTask[] = [];
  let earnedPoints = 0; // Total points from verified tasks
  let upcomingEvents: CalendarEvent[] = [];
  let loading = true;
  let saving = false;
  let taskUpdating = false;
  let error: string | null = null;
  let successMessage: string | null = null;

  // Current section
  let activeSection: 'overview' | 'profile' | 'settings' | 'account' = 'overview';

  // Edit mode for profile
  let editMode = false;
  let editForm = {
    displayName: '',
    role: '',
    birthday: '',
    gender: '',
    avatarEmoji: '',
    color: '',
  };

  // Password change
  let passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };
  let passwordError: string | null = null;
  let passwordSuccess = false;

  // Push notifications
  let pushSupported = false;
  let pushSubscribed = false;
  let pushPermission: NotificationPermission = 'default';
  let pushLoading = false;
  let pushTestSent = false;

  // Computed
  $: isOwnProfile = $currentUser?.id === userId;
  $: bgColor = colorClasses[profile?.color || 'orange'];

  // Navigation items
  $: navItems = [
    { id: 'overview', label: 'Översikt', icon: '📊', show: true },
    { id: 'profile', label: 'Profil', icon: '👤', show: true },
    { id: 'settings', label: 'Inställningar', icon: '⚙️', show: isOwnProfile },
    { id: 'account', label: 'Konto', icon: '🔐', show: isOwnProfile },
  ].filter((item) => item.show);

  onMount(async () => {
    userId = parseInt($page.params.userId || '');

    if (isNaN(userId)) {
      error = 'Ogiltigt användar-ID';
      loading = false;
      return;
    }

    await loadProfile();
  });

  async function loadProfile() {
    loading = true;
    error = null;

    try {
      // Load user profile
      const profileRes = await get<{ success: boolean; user: UserProfile }>(
        `/auth/users/${userId}`
      );
      profile = profileRes.user;

      // Initialize edit form
      editForm = {
        displayName: profile.displayName || '',
        role: profile.role || '',
        birthday: profile.birthday || '',
        gender: profile.gender || '',
        avatarEmoji: profile.avatarEmoji || '👤',
        color: profile.color || 'orange',
      };

      // Load preferences if own profile
      if (isOwnProfile) {
        try {
          const prefsRes = await get<{ success: boolean; preferences: UserPreferences }>(
            `/auth/users/${userId}/preferences`
          );
          if (prefsRes.preferences) {
            preferences = prefsRes.preferences;
          }
        } catch {
          // Use defaults if no preferences exist
        }

        // Check push notification status
        if (browser) {
          pushSupported = isPushSupported();
          pushPermission = getPermissionStatus();
          if (pushSupported) {
            pushSubscribed = await isSubscribed();
          }
        }
      }

      // Load assigned groceries
      try {
        const groceriesRes = await get<{ success: boolean; items: GroceryItem[] }>('/groceries');
        assignedGroceries = groceriesRes.items.filter(
          (item) => item.assignedTo === userId && !item.isBought
        );
      } catch {
        // Ignore
      }

      // Load assigned tasks and calculate earned points
      if ($currentFamily) {
        try {
          const tasksResponse = await fetch('/api/tasks', {
            headers: { 'x-family-id': String($currentFamily.id) },
            credentials: 'include',
          });
          if (tasksResponse.ok) {
            const tasksRes: AssignedTask[] = await tasksResponse.json();
            // Active tasks (not yet verified)
            assignedTasks = tasksRes.filter(
              (task) => task.assignedTo === userId && task.status !== 'verified'
            );
            // Calculate earned points from verified tasks
            earnedPoints = tasksRes
              .filter((task) => task.assignedTo === userId && task.status === 'verified')
              .reduce((sum, task) => sum + (task.points || 0), 0);
          }
        } catch {
          // Ignore
        }
      }

      // Load upcoming events for this user
      try {
        const eventsRes = await get<{ success: boolean; events: CalendarEvent[] }>(
          `/calendar/events?userId=${userId}&upcoming=true`
        );
        upcomingEvents = eventsRes.events?.slice(0, 5) || [];
      } catch {
        // Ignore
      }
    } catch (err) {
      error = 'Kunde inte ladda profilen';
    } finally {
      loading = false;
    }
  }

  async function saveProfile() {
    if (!profile) return;
    saving = true;
    error = null;
    successMessage = null;

    try {
      await put(`/auth/users/${userId}`, editForm);
      profile = { ...profile, ...editForm };
      editMode = false;
      successMessage = 'Profilen har sparats!';
      setTimeout(() => (successMessage = null), 3000);
    } catch (err) {
      error = 'Kunde inte spara profilen';
    } finally {
      saving = false;
    }
  }

  async function savePreferences() {
    saving = true;
    error = null;
    successMessage = null;

    try {
      await put(`/auth/users/${userId}/preferences`, preferences);
      successMessage = 'Inställningarna har sparats!';
      setTimeout(() => (successMessage = null), 3000);
    } catch (err) {
      error = 'Kunde inte spara inställningarna';
    } finally {
      saving = false;
    }
  }

  // Mark a task as done
  async function markTaskDone(taskId: number) {
    if (!$currentFamily) return;
    taskUpdating = true;
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-family-id': String($currentFamily.id),
        },
        credentials: 'include',
        body: JSON.stringify({ status: 'done' }),
      });
      if (!response.ok) throw new Error('Failed to update task');

      // Refresh the tasks list
      const tasksResponse = await fetch('/api/tasks', {
        headers: { 'x-family-id': String($currentFamily.id) },
        credentials: 'include',
      });
      if (tasksResponse.ok) {
        const tasks: AssignedTask[] = await tasksResponse.json();
        assignedTasks = tasks.filter(
          (task) => task.assignedTo === userId && task.status !== 'verified'
        );
        // Recalculate earned points
        earnedPoints = tasks
          .filter((task) => task.assignedTo === userId && task.status === 'verified')
          .reduce((sum, task) => sum + (task.points || 0), 0);
      }
      successMessage = $t('tasks.markedAsDone');
      setTimeout(() => (successMessage = null), 3000);
    } catch (err) {
      error = $t('tasks.errorUpdating');
      setTimeout(() => (error = null), 3000);
    } finally {
      taskUpdating = false;
    }
  }

  // Reopen a task (change status back to 'open')
  async function reopenTask(taskId: number) {
    if (!$currentFamily) return;
    taskUpdating = true;
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-family-id': String($currentFamily.id),
        },
        credentials: 'include',
        body: JSON.stringify({ status: 'open' }),
      });
      if (!response.ok) throw new Error('Failed to update task');

      // Refresh the tasks list
      const tasksResponse = await fetch('/api/tasks', {
        headers: { 'x-family-id': String($currentFamily.id) },
        credentials: 'include',
      });
      if (tasksResponse.ok) {
        const tasks: AssignedTask[] = await tasksResponse.json();
        assignedTasks = tasks.filter(
          (task) => task.assignedTo === userId && task.status !== 'verified'
        );
        // Recalculate earned points
        earnedPoints = tasks
          .filter((task) => task.assignedTo === userId && task.status === 'verified')
          .reduce((sum, task) => sum + (task.points || 0), 0);
      }
      successMessage = $t('tasks.reopened');
      setTimeout(() => (successMessage = null), 3000);
    } catch (err) {
      error = $t('tasks.errorUpdating');
      setTimeout(() => (error = null), 3000);
    } finally {
      taskUpdating = false;
    }
  }

  // Verify/approve a task (for parents/creator)
  async function verifyTask(taskId: number) {
    if (!$currentFamily) return;
    taskUpdating = true;
    try {
      const response = await fetch(`/api/tasks/${taskId}/verify`, {
        method: 'POST',
        headers: {
          'x-family-id': String($currentFamily.id),
          'x-user-id': String($currentUser?.id),
        },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to verify task');

      // Refresh the tasks list
      const tasksResponse = await fetch('/api/tasks', {
        headers: { 'x-family-id': String($currentFamily.id) },
        credentials: 'include',
      });
      if (tasksResponse.ok) {
        const tasks: AssignedTask[] = await tasksResponse.json();
        assignedTasks = tasks.filter(
          (task) => task.assignedTo === userId && task.status !== 'verified'
        );
        // Recalculate earned points
        earnedPoints = tasks
          .filter((task) => task.assignedTo === userId && task.status === 'verified')
          .reduce((sum, task) => sum + (task.points || 0), 0);
      }
      successMessage = $t('tasks.verified');
      setTimeout(() => (successMessage = null), 3000);
    } catch (err) {
      error = $t('tasks.errorUpdating');
      setTimeout(() => (error = null), 3000);
    } finally {
      taskUpdating = false;
    }
  }

  async function togglePushNotifications() {
    pushLoading = true;
    pushTestSent = false;

    try {
      if (pushSubscribed) {
        const success = await unsubscribeFromPush();
        if (success) {
          pushSubscribed = false;
        }
      } else {
        const success = await subscribeToPush();
        if (success) {
          pushSubscribed = true;
          pushPermission = getPermissionStatus();
        } else {
          pushPermission = getPermissionStatus();
          if (pushPermission === 'denied') {
            error = 'Notifikationer blockerade i webbläsaren. Ändra i webbläsarens inställningar.';
            setTimeout(() => (error = null), 5000);
          }
        }
      }
    } catch (err) {
      error = 'Kunde inte ändra notifikationsinställningar';
    } finally {
      pushLoading = false;
    }
  }

  async function handleTestNotification() {
    pushLoading = true;
    const success = await sendTestNotification();
    pushTestSent = success;
    pushLoading = false;

    if (!success) {
      error = 'Kunde inte skicka testnotifikation';
      setTimeout(() => (error = null), 3000);
    } else {
      setTimeout(() => (pushTestSent = false), 3000);
    }
  }

  async function changePassword() {
    passwordError = null;
    passwordSuccess = false;

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      passwordError = $t('profile.passwordMismatchError');
      return;
    }

    if (passwordForm.newPassword.length < 4) {
      passwordError = $t('profile.passwordTooShortError');
      return;
    }

    saving = true;

    try {
      await put(`/auth/users/${userId}/password`, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      passwordSuccess = true;
      passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
      setTimeout(() => (passwordSuccess = false), 3000);
    } catch (err: any) {
      passwordError = err.message || 'Kunde inte ändra lösenordet';
    } finally {
      saving = false;
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function formatEventDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('sv-SE', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  function setSection(sectionId: string) {
    activeSection = sectionId as 'overview' | 'profile' | 'settings' | 'account';
  }

  function applyTheme(theme: 'light' | 'dark' | 'system') {
    if (!browser) return;

    const root = document.documentElement;

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }

    localStorage.setItem('theme', theme);
  }

  function setTheme(themeValue: string) {
    const theme = themeValue as 'light' | 'dark' | 'system';
    preferences.theme = theme;
    applyTheme(theme);
  }
</script>

<svelte:head>
  <title>{profile?.displayName || profile?.username || $t('profile.title')} - Family Hub</title>
</svelte:head>

<main
  class="flex-1 bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 dark:from-stone-900 dark:via-stone-800 dark:to-stone-900"
>
  <div class="h-full flex flex-col lg:flex-row gap-4 lg:gap-6 p-3 lg:p-6 max-w-7xl mx-auto">
    {#if loading}
      <div class="flex-1 flex items-center justify-center">
        <div
          class="animate-spin w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full"
        ></div>
      </div>
    {:else if error && !profile}
      <div class="flex-1 flex items-center justify-center">
        <div class="text-center">
          <p class="text-red-500 dark:text-red-400 mb-4">{error}</p>
          <button
            on:click={() => goto('/')}
            class="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            {$t('profile.backToHome')}
          </button>
        </div>
      </div>
    {:else if profile}
      <!-- Sidebar Navigation -->
      <aside class="lg:w-64 flex-shrink-0">
        <div
          class="bg-white/90 dark:bg-stone-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-orange-200 dark:border-stone-700 p-4 lg:p-6"
        >
          <!-- Profile Header -->
          <div class="text-center mb-4 lg:mb-6">
            <div
              class="{bgColor} w-16 h-16 lg:w-20 lg:h-20 rounded-full flex items-center justify-center text-3xl lg:text-4xl shadow-lg mx-auto mb-2 lg:mb-3"
            >
              {profile.avatarEmoji || '👤'}
            </div>
            <h2 class="text-lg lg:text-xl font-bold text-stone-800 dark:text-white">
              {profile.displayName || profile.username}
            </h2>
            {#if profile.role}
              <p class="text-sm text-stone-500 dark:text-stone-400 capitalize">
                {roleOptions.find((r) => r.value === profile?.role)?.label || profile.role}
              </p>
            {/if}
            {#if !isOwnProfile}
              <p class="text-xs text-stone-400 dark:text-stone-500 mt-1">
                @{profile.username}
              </p>
            {/if}
          </div>

          <!-- Navigation -->
          <nav class="space-y-1">
            {#each navItems as item}
              <button
                on:click={() => setSection(item.id)}
                class="w-full flex items-center gap-3 px-3 py-2 lg:px-4 lg:py-3 rounded-xl transition-colors text-left
                  {activeSection === item.id
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                  : 'hover:bg-stone-100 dark:hover:bg-stone-700/50 text-stone-600 dark:text-stone-300'}"
              >
                <span class="text-lg lg:text-xl">{item.icon}</span>
                <span class="font-medium text-sm lg:text-base">{item.label}</span>
              </button>
            {/each}
          </nav>

          <!-- Back button -->
          <div class="mt-4 pt-4 lg:mt-6 lg:pt-6 border-t border-stone-200 dark:border-stone-700">
            <button
              on:click={() => goto('/')}
              class="w-full flex items-center gap-3 px-3 py-2 lg:px-4 lg:py-3 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-700/50 text-stone-500 dark:text-stone-400 transition-colors"
            >
              <span class="text-lg lg:text-xl">←</span>
              <span class="font-medium text-sm lg:text-base">Tillbaka</span>
            </button>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <div class="flex-1 min-w-0">
        <div
          class="bg-white/90 dark:bg-stone-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-orange-200 dark:border-stone-700 p-4 lg:p-6"
        >
          <!-- Success/Error Messages -->
          {#if successMessage}
            <div
              class="mb-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg"
            >
              {successMessage}
            </div>
          {/if}
          {#if error && profile}
            <div
              class="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg"
            >
              {error}
            </div>
          {/if}

          <!-- Overview Section -->
          {#if activeSection === 'overview'}
            <!-- Points Badge - only show if has points -->
            {#if earnedPoints > 0}
              <div
                class="flex items-center justify-end gap-2 mb-4"
                title={$t('profile.earnedPoints')}
              >
                <span class="text-sm text-stone-500 dark:text-stone-400">🏆</span>
                <span
                  class="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg"
                >
                  {earnedPoints}
                </span>
              </div>
            {/if}

            <div class="grid gap-4 md:grid-cols-2">
              <!-- Assigned Groceries - only show if has items -->
              {#if assignedGroceries.length > 0}
                <div class="bg-stone-50 dark:bg-stone-700/50 rounded-xl p-3">
                  <h3
                    class="font-semibold text-stone-700 dark:text-stone-300 mb-2 flex items-center gap-2 text-sm"
                  >
                    <span>🛒</span>
                    <span>Inköpslista</span>
                    <span class="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {assignedGroceries.length}
                    </span>
                  </h3>
                  <ul class="space-y-1">
                    {#each assignedGroceries as item}
                      <li
                        class="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300"
                      >
                        <span class="w-1.5 h-1.5 bg-orange-400 rounded-full"></span>
                        <span>{item.name}</span>
                        {#if item.quantity}
                          <span class="text-stone-400">({item.quantity}{item.unit || ''})</span>
                        {/if}
                      </li>
                    {/each}
                  </ul>
                  <a
                    href="/groceries"
                    class="inline-block mt-2 text-xs text-orange-500 hover:text-orange-600 dark:text-orange-400"
                  >
                    Visa hela listan →
                  </a>
                </div>
              {/if}

              <!-- Assigned Tasks -->
              <div class="bg-stone-50 dark:bg-stone-700/50 rounded-xl p-3">
                <h3
                  class="font-semibold text-stone-700 dark:text-stone-300 mb-2 flex items-center gap-2 text-sm"
                >
                  <span>📋</span>
                  <span>{$t('profile.myTasks')}</span>
                  {#if assignedTasks.length > 0}
                    <span class="bg-teal-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {assignedTasks.length}
                    </span>
                  {/if}
                </h3>
                {#if assignedTasks.length === 0}
                  <p class="text-sm text-stone-500 dark:text-stone-400">{$t('profile.noTasks')}</p>
                {:else}
                  <ul class="space-y-2">
                    {#each assignedTasks as task}
                      <li class="bg-white dark:bg-stone-600/50 rounded-lg p-2">
                        <div class="flex items-start justify-between gap-2">
                          <div class="flex-1 min-w-0">
                            <span
                              class="text-sm font-medium text-stone-700 dark:text-stone-200 block truncate"
                            >
                              {task.title}
                            </span>
                            <div class="flex items-center gap-2 mt-1 flex-wrap">
                              <span class="text-xs text-stone-500 dark:text-stone-400">
                                🏆 {task.points}
                                {$t('tasks.points')}
                              </span>
                              {#if task.dueDate}
                                <span class="text-xs text-stone-500 dark:text-stone-400">
                                  📅 {formatDate(task.dueDate)}
                                </span>
                              {/if}
                              {#if task.status === 'done'}
                                <span
                                  class="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full"
                                >
                                  {task.requiresValidation
                                    ? $t('tasks.awaitingApproval')
                                    : $t('tasks.statusDone')}
                                </span>
                                <button
                                  on:click={() => reopenTask(task.id)}
                                  disabled={taskUpdating}
                                  class="text-xs text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 transition-colors disabled:opacity-50"
                                  title={$t('tasks.reopen')}
                                >
                                  ↩️
                                </button>
                              {:else if task.status === 'in_progress'}
                                <span
                                  class="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full"
                                >
                                  {$t('tasks.statusInProgress')}
                                </span>
                              {/if}
                            </div>
                          </div>

                          <!-- Actions -->
                          {#if task.status !== 'done'}
                            <button
                              on:click={() => markTaskDone(task.id)}
                              disabled={taskUpdating}
                              class="shrink-0 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white text-xs rounded-lg transition-colors disabled:opacity-50"
                            >
                              ✓ {$t('tasks.markDone')}
                            </button>
                          {:else if task.requiresValidation && task.createdBy === $currentUser?.id}
                            <!-- Show verify button if current user is the creator -->
                            <button
                              on:click={() => verifyTask(task.id)}
                              disabled={taskUpdating}
                              class="shrink-0 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs rounded-lg transition-colors disabled:opacity-50"
                            >
                              ✅ {$t('tasks.approve')}
                            </button>
                          {/if}
                        </div>
                      </li>
                    {/each}
                  </ul>
                  <a
                    href="/tasks"
                    class="inline-block mt-2 text-xs text-teal-500 hover:text-teal-600 dark:text-teal-400"
                  >
                    {$t('tasks.viewAll')} →
                  </a>
                {/if}
              </div>

              <!-- Upcoming Events - only show if has events -->
              {#if upcomingEvents.length > 0}
                <div class="bg-stone-50 dark:bg-stone-700/50 rounded-xl p-3">
                  <h3
                    class="font-semibold text-stone-700 dark:text-stone-300 mb-2 flex items-center gap-2 text-sm"
                  >
                    <span>📅</span>
                    <span>Kommande händelser</span>
                  </h3>
                  <ul class="space-y-1">
                    {#each upcomingEvents as event}
                      <li class="text-sm">
                        <span class="text-stone-600 dark:text-stone-300">{event.title}</span>
                        <span class="text-stone-400 dark:text-stone-500 block text-xs">
                          {formatEventDate(event.startDate)}
                        </span>
                      </li>
                    {/each}
                  </ul>
                  <a
                    href="/calendar"
                    class="inline-block mt-2 text-xs text-orange-500 hover:text-orange-600 dark:text-orange-400"
                  >
                    Visa kalender →
                  </a>
                </div>
              {/if}
            </div>

            <!-- Profile Section -->
          {:else if activeSection === 'profile'}
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-xl font-bold text-stone-800 dark:text-white">
                {isOwnProfile ? 'Min profil' : 'Profil'}
              </h2>
              {#if isOwnProfile && !editMode}
                <button
                  on:click={() => (editMode = true)}
                  class="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  {$t('common.edit')}
                </button>
              {/if}
            </div>

            {#if editMode}
              <!-- Edit Form -->
              <form on:submit|preventDefault={saveProfile} class="space-y-6">
                <!-- Avatar Selection -->
                <div>
                  <span class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                    Avatar
                  </span>
                  <div class="flex flex-wrap gap-2">
                    {#each emojiOptions as emoji}
                      <button
                        type="button"
                        on:click={() => (editForm.avatarEmoji = emoji)}
                        class="w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all
                          {editForm.avatarEmoji === emoji
                          ? 'ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-stone-800'
                          : 'hover:bg-stone-100 dark:hover:bg-stone-700'}"
                      >
                        {emoji}
                      </button>
                    {/each}
                  </div>
                </div>

                <!-- Color Selection -->
                <div>
                  <span class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                    Färg
                  </span>
                  <div class="flex flex-wrap gap-2">
                    {#each colorOptions as color}
                      <button
                        type="button"
                        on:click={() => (editForm.color = color.value)}
                        class="{color.class} w-10 h-10 rounded-full transition-all
                          {editForm.color === color.value
                          ? 'ring-2 ring-offset-2 ring-stone-600 dark:ring-offset-stone-800'
                          : 'hover:scale-110'}"
                        title={color.label}
                      ></button>
                    {/each}
                  </div>
                </div>

                <!-- Display Name -->
                <div>
                  <label
                    for="displayName"
                    class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2"
                  >
                    {$t('profile.displayName')}
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    bind:value={editForm.displayName}
                    class="w-full px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-800 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder={$t('profile.displayName')}
                  />
                </div>

                <!-- Role -->
                <div>
                  <label
                    for="role"
                    class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2"
                  >
                    {$t('profile.role')}
                  </label>
                  <select
                    id="role"
                    bind:value={editForm.role}
                    class="w-full px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-800 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">{$t('common.selectRole')}...</option>
                    {#each roleOptions as role}
                      <option value={role.value}>{role.label}</option>
                    {/each}
                  </select>
                </div>

                <!-- Birthday -->
                <div>
                  <label
                    for="birthday"
                    class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2"
                  >
                    {$t('profile.birthday')}
                  </label>
                  <input
                    type="date"
                    id="birthday"
                    bind:value={editForm.birthday}
                    class="w-full px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-800 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <!-- Gender -->
                <div>
                  <label
                    for="gender"
                    class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2"
                  >
                    {$t('profile.gender')}
                  </label>
                  <select
                    id="gender"
                    bind:value={editForm.gender}
                    class="w-full px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-800 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Välj...</option>
                    {#each genderOptions as gender}
                      <option value={gender.value}>{gender.label}</option>
                    {/each}
                  </select>
                </div>

                <!-- Buttons -->
                <div class="flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    class="flex-1 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                  >
                    {saving ? $t('common.saving') : $t('common.save')}
                  </button>
                  <button
                    type="button"
                    on:click={() => {
                      editMode = false;
                      editForm = {
                        displayName: profile?.displayName || '',
                        role: profile?.role || '',
                        birthday: profile?.birthday || '',
                        gender: profile?.gender || '',
                        avatarEmoji: profile?.avatarEmoji || '👤',
                        color: profile?.color || 'orange',
                      };
                    }}
                    class="px-6 py-2 border border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-300 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
                  >
                    {$t('common.cancel')}
                  </button>
                </div>
              </form>
            {:else}
              <!-- Read-only Profile View -->
              <div class="space-y-6">
                <div class="flex items-center gap-6">
                  <div
                    class="{bgColor} w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-lg"
                  >
                    {profile.avatarEmoji || '👤'}
                  </div>
                  <div>
                    <h3 class="text-2xl font-bold text-stone-800 dark:text-white">
                      {profile.displayName || profile.username}
                    </h3>
                    <p class="text-stone-500 dark:text-stone-400">@{profile.username}</p>
                    {#if profile.role}
                      <p class="text-stone-600 dark:text-stone-300 capitalize mt-1">
                        {roleOptions.find((r) => r.value === profile?.role)?.label || profile.role}
                      </p>
                    {/if}
                  </div>
                </div>

                <div class="grid gap-4 sm:grid-cols-2">
                  {#if profile.birthday}
                    <div class="bg-stone-50 dark:bg-stone-700/50 rounded-xl p-4">
                      <p class="text-sm text-stone-500 dark:text-stone-400">
                        {$t('profile.birthday')}
                      </p>
                      <p class="text-lg font-medium text-stone-800 dark:text-white">
                        {formatDate(profile.birthday)}
                      </p>
                    </div>
                  {/if}
                  {#if profile.gender}
                    <div class="bg-stone-50 dark:bg-stone-700/50 rounded-xl p-4">
                      <p class="text-sm text-stone-500 dark:text-stone-400">
                        {$t('profile.gender')}
                      </p>
                      <p class="text-lg font-medium text-stone-800 dark:text-white">
                        {genderOptions.find((g) => g.value === profile?.gender)?.label ||
                          profile.gender}
                      </p>
                    </div>
                  {/if}
                  <div class="bg-stone-50 dark:bg-stone-700/50 rounded-xl p-4">
                    <p class="text-sm text-stone-500 dark:text-stone-400">
                      {$t('profile.memberSince')}
                    </p>
                    <p class="text-lg font-medium text-stone-800 dark:text-white">
                      {formatDate(profile.createdAt)}
                    </p>
                  </div>
                  {#if profile.lastLogin}
                    <div class="bg-stone-50 dark:bg-stone-700/50 rounded-xl p-4">
                      <p class="text-sm text-stone-500 dark:text-stone-400">Senast aktiv</p>
                      <p class="text-lg font-medium text-stone-800 dark:text-white">
                        {formatDate(profile.lastLogin)}
                      </p>
                    </div>
                  {/if}
                </div>
              </div>
            {/if}

            <!-- Settings Section -->
          {:else if activeSection === 'settings' && isOwnProfile}
            <h2 class="text-xl font-bold text-stone-800 dark:text-white mb-6">Inställningar</h2>

            <!-- Notification Settings -->
            <div class="space-y-6">
              <!-- Push Notifications Master Toggle -->
              {#if pushSupported}
                <div>
                  <h3 class="font-semibold text-stone-700 dark:text-stone-300 mb-4">
                    Push-notifikationer
                  </h3>
                  <div class="space-y-3">
                    <div
                      class="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-700/50 rounded-xl"
                    >
                      <div>
                        <p class="font-medium text-stone-800 dark:text-white">
                          Aktivera push-notifikationer
                        </p>
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
                        on:click={togglePushNotifications}
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

                    {#if pushSubscribed}
                      <button
                        type="button"
                        on:click={handleTestNotification}
                        disabled={pushLoading}
                        class="w-full py-2 text-sm bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {#if pushTestSent}
                          <span>✅ Testnotifikation skickad!</span>
                        {:else if pushLoading}
                          <span>Skickar...</span>
                        {:else}
                          <span>🔔 Skicka testnotifikation</span>
                        {/if}
                      </button>
                    {/if}
                  </div>
                </div>
              {/if}

              <!-- Notification Types -->
              <div>
                <h3 class="font-semibold text-stone-700 dark:text-stone-300 mb-4">
                  Notifikationer
                </h3>
                <div class="space-y-3">
                  <label
                    class="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-700/50 rounded-xl cursor-pointer"
                  >
                    <div>
                      <p class="font-medium text-stone-800 dark:text-white">Tilldelade varor</p>
                      <p class="text-sm text-stone-500 dark:text-stone-400">
                        När någon tilldelar dig en vara
                      </p>
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
                      <p class="font-medium text-stone-800 dark:text-white">
                        Inköpslistan uppdaterad
                      </p>
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
                      <p class="font-medium text-stone-800 dark:text-white">
                        Nya kalenderhändelser
                      </p>
                      <p class="text-sm text-stone-500 dark:text-stone-400">
                        När nya händelser skapas
                      </p>
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
                      on:click={() => setTheme(theme.value)}
                      class="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors
                        {preferences.theme === theme.value
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-stone-200 dark:border-stone-700 hover:border-orange-300'}"
                    >
                      <span class="text-2xl">{theme.icon}</span>
                      <span class="text-sm font-medium text-stone-700 dark:text-stone-300"
                        >{theme.label}</span
                      >
                    </button>
                  {/each}
                </div>
              </div>

              <button
                on:click={savePreferences}
                disabled={saving}
                class="w-full py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {saving ? $t('common.saving') : $t('profile.save')}
              </button>
            </div>

            <!-- Account Section -->
          {:else if activeSection === 'account' && isOwnProfile}
            <h2 class="text-xl font-bold text-stone-800 dark:text-white mb-6">Konto</h2>

            <div class="space-y-6">
              <!-- Change Password -->
              <div class="bg-stone-50 dark:bg-stone-700/50 rounded-xl p-6">
                <h3 class="font-semibold text-stone-700 dark:text-stone-300 mb-4">Byt lösenord</h3>

                {#if passwordError}
                  <div
                    class="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm"
                  >
                    {passwordError}
                  </div>
                {/if}
                {#if passwordSuccess}
                  <div
                    class="mb-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm"
                  >
                    {$t('profile.passwordChanged')}
                  </div>
                {/if}

                <form on:submit|preventDefault={changePassword} class="space-y-4">
                  <div>
                    <label
                      for="currentPassword"
                      class="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1"
                    >
                      Nuvarande lösenord
                    </label>
                    <input
                      type="password"
                      id="currentPassword"
                      bind:value={passwordForm.currentPassword}
                      class="w-full px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-800 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label
                      for="newPassword"
                      class="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1"
                    >
                      Nytt lösenord
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      bind:value={passwordForm.newPassword}
                      class="w-full px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-800 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label
                      for="confirmPassword"
                      class="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1"
                    >
                      {$t('profile.confirmPasswordLabel')}
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      bind:value={passwordForm.confirmPassword}
                      class="w-full px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-800 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    class="w-full py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                  >
                    {saving ? $t('common.saving') : $t('profile.changePassword')}
                  </button>
                </form>
              </div>

              <!-- Delete Account -->
              <div
                class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6"
              >
                <h3 class="font-semibold text-red-700 dark:text-red-400 mb-2">
                  {$t('profile.deleteAccountTitle')}
                </h3>
                <p class="text-sm text-red-600 dark:text-red-400/80 mb-4">
                  {$t('profile.deleteAccountDescription')}
                </p>
                <a
                  href="/settings"
                  class="inline-block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  {$t('profile.goToAccountSettings')}
                </a>
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</main>
