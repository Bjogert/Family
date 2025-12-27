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
  import {
    ProfileSidebar,
    ProfileOverview,
    ProfileSettings,
    ProfileAccount,
  } from '$lib/components/profile';

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

  interface BulletinNote {
    id: number;
    title: string;
    content: string;
    color: string;
    isPinned: boolean;
    createdAt: string;
    author?: { displayName: string | null; avatarEmoji: string | null };
    assignedTo?: { id: number; displayName: string | null; avatarEmoji: string | null }[];
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

  // State - userId is reactive to URL params
  $: userId = parseInt($page.params.userId || '');
  $: isOwnProfile = userId === $currentUser?.id;
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
  let userMessages: BulletinNote[] = [];
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

  // Message form
  let showMessageForm = false;
  let messageText = '';
  let sendingMessage = false;
  let messageType: 'private' | 'pinned' | 'both' = 'private';

  // Computed (isOwnProfile is now defined at the top near userId)
  $: bgColor = colorClasses[profile?.color || 'orange'];

  // Navigation items
  $: navItems = [
    { id: 'overview', label: 'Översikt', icon: '📊', show: true },
    { id: 'profile', label: 'Profil', icon: '👤', show: true },
    { id: 'settings', label: 'Inställningar', icon: '⚙️', show: isOwnProfile },
    { id: 'account', label: 'Konto', icon: '🔐', show: isOwnProfile },
  ].filter((item) => item.show);

  // Reload profile when userId changes (reactive navigation)
  $: if (browser && userId && !isNaN(userId)) {
    loadProfile();
  }

  onMount(async () => {
    // Initial load is handled by the reactive statement above
  });

  async function loadProfile() {
    loading = true;
    error = null;

    // Reset state for new profile
    profile = null;
    assignedGroceries = [];
    assignedTasks = [];
    earnedPoints = 0;
    upcomingEvents = [];
    userMessages = [];
    activeSection = 'overview';
    editMode = false;

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
            // Check both browser subscription AND server subscription
            const browserSubscribed = await isSubscribed();
            // Also check server status
            try {
              const statusRes = await get<{
                success: boolean;
                enabled: boolean;
                subscribed: boolean;
              }>('/push/status');
              pushSubscribed = browserSubscribed || statusRes.subscribed;
            } catch {
              pushSubscribed = browserSubscribed;
            }
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

      // TODO: Upcoming events - endpoint doesn't exist yet
      // The calendar module only has Google Calendar integration at /api/calendar/google/events
      // which requires the user to have connected their Google Calendar.
      // For now, leave upcomingEvents empty to avoid 404 errors.
      // When a proper /api/calendar/events endpoint is added, re-enable this:
      // try {
      //   const eventsRes = await get<{ success: boolean; events: CalendarEvent[] }>(
      //     `/calendar/events?userId=${userId}&upcoming=true`
      //   );
      //   upcomingEvents = eventsRes.events?.slice(0, 5) || [];
      // } catch {
      //   // Ignore
      // }

      // Load messages assigned to this user
      await loadUserMessages();
    } catch (err) {
      error = 'Kunde inte ladda profilen';
    } finally {
      loading = false;
    }
  }

  async function loadUserMessages() {
    if (!$currentFamily) return;
    try {
      // Fetch private messages for this user's wall
      const response = await fetch(`/api/bulletin/user/${userId}`, {
        headers: { 'x-family-id': String($currentFamily.id) },
        credentials: 'include',
      });
      if (response.ok) {
        userMessages = await response.json();
      }
    } catch {
      // Ignore
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

  async function sendMessage() {
    if (!messageText.trim() || !$currentFamily || !$currentUser || !profile) return;
    sendingMessage = true;
    error = null;

    try {
      // Determine what to create based on messageType
      const shouldPin = messageType === 'pinned' || messageType === 'both';
      const shouldBePrivate = messageType === 'private' || messageType === 'both';

      // Create a bulletin note
      const response = await fetch('/api/bulletin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-family-id': String($currentFamily.id),
          'x-user-id': String($currentUser.id),
        },
        credentials: 'include',
        body: JSON.stringify({
          title: '',
          content: messageText,
          color: 'blue',
          isPinned: shouldPin,
          recipientId: shouldBePrivate ? userId : undefined,
          assignedTo: [userId],
        }),
      });

      if (response.ok) {
        // Send push notification
        try {
          const notificationBody =
            messageText.length > 100 ? messageText.substring(0, 100) + '...' : messageText;
          const notificationUrl = shouldBePrivate ? `/profile/${userId}` : '/';

          await fetch('/api/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-family-id': String($currentFamily.id),
              'x-user-id': String($currentUser.id),
            },
            credentials: 'include',
            body: JSON.stringify({
              targetUserId: userId,
              title: `💬 ${$currentUser.displayName || $currentUser.username}`,
              body: notificationBody,
              url: notificationUrl,
            }),
          });
        } catch {
          // Notification failed but message was created
        }

        messageText = '';
        messageType = 'private';
        showMessageForm = false;

        // Build success message based on type
        let successMsg = 'Meddelande skickat!';
        if (messageType === 'private') {
          successMsg = `Privat meddelande skickat till ${profile.displayName || profile.username}!`;
        } else if (messageType === 'pinned') {
          successMsg = 'Meddelande fäst på startsidan!';
        } else {
          successMsg = 'Meddelande skickat och fäst!';
        }
        successMessage = successMsg;
        setTimeout(() => (successMessage = null), 3000);

        // Reload messages to show the new one
        await loadUserMessages();
      } else {
        error = 'Kunde inte skicka meddelandet';
      }
    } catch (err) {
      error = 'Kunde inte skicka meddelandet';
    } finally {
      sendingMessage = false;
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
    } catch (err) {
      passwordError = err instanceof Error ? err.message : 'Kunde inte ändra lösenordet';
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
      <ProfileSidebar
        {profile}
        {bgColor}
        {activeSection}
        {isOwnProfile}
        {showMessageForm}
        bind:messageText
        {sendingMessage}
        {messageType}
        on:setSection={(e) => setSection(e.detail)}
        on:toggleMessageForm={() => (showMessageForm = !showMessageForm)}
        on:sendMessage={sendMessage}
        on:cancelMessage={() => {
          showMessageForm = false;
          messageText = '';
          messageType = 'private';
        }}
        on:setMessageType={(e) => (messageType = e.detail)}
      />

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
            <ProfileOverview
              {earnedPoints}
              {assignedGroceries}
              {assignedTasks}
              {upcomingEvents}
              {userMessages}
              {taskUpdating}
              currentUserId={$currentUser?.id}
              on:markTaskDone={(e) => markTaskDone(e.detail)}
              on:reopenTask={(e) => reopenTask(e.detail)}
              on:verifyTask={(e) => verifyTask(e.detail)}
            />

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
            <ProfileSettings
              bind:preferences
              {pushSupported}
              {pushSubscribed}
              {pushPermission}
              {pushLoading}
              {pushTestSent}
              {saving}
              on:togglePush={togglePushNotifications}
              on:testNotification={handleTestNotification}
              on:setTheme={(e) => setTheme(e.detail)}
              on:save={savePreferences}
            />

            <!-- Account Section -->
          {:else if activeSection === 'account' && isOwnProfile}
            <ProfileAccount
              bind:passwordForm
              {passwordError}
              {passwordSuccess}
              {saving}
              on:changePassword={changePassword}
            />
          {/if}
        </div>
      </div>
    {/if}
  </div>
</main>
