<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from '$lib/api/client';
  import { t } from '$lib/i18n';
  import { groceryWs } from '$lib/stores/groceryWs';
  import { currentFamily } from '$lib/stores/auth';
  import type { GroceryItem } from '$lib/types/grocery';
  import type { Task, TaskCategory, TaskStatus, Activity } from '@family-hub/shared/types';

  interface FamilyMember {
    id: number;
    username: string;
    displayName: string | null;
    hasPassword: boolean;
    role: string | null;
    birthday: string | null;
    gender: string | null;
    avatarEmoji: string | null;
    color: string | null;
  }

  // Color mapping for member cards
  const colorClasses: Record<string, string> = {
    orange: 'bg-orange-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    green: 'bg-emerald-400',
    blue: 'bg-sky-400',
    purple: 'bg-violet-400',
    stone: 'bg-stone-400',
  };

  // Simplified task indicator colors:
  // - Shopping (pink) for shopping tasks
  // - Blue for activity-type (outdoor, pets)
  // - Orange for regular tasks (cleaning, kitchen, laundry, other)
  function getTaskBadgeColor(category: TaskCategory | null): string {
    if (!category) return 'bg-orange-500';
    if (category === 'shopping') return 'bg-pink-500';
    if (category === 'outdoor' || category === 'pets') return 'bg-blue-500';
    return 'bg-orange-500'; // cleaning, kitchen, laundry, other
  }

  interface GroceryAssignment {
    userId: number;
  }

  interface MemberTaskInfo {
    total: number;
    overdue: number;
    categories: TaskCategory[];
    primaryCategory: TaskCategory | null;
  }

  let apiStatus = 'Checking...';
  let groceryItems: GroceryItem[] = [];
  let loadingGroceries = true;
  let familyMembers: FamilyMember[] = [];
  let loadingMembers = true;
  let groceryAssignments: GroceryAssignment[] = [];
  let tasks: Task[] = [];
  let activities: Activity[] = [];

  // Get upcoming activities (next 7 days)
  $: upcomingActivities = activities
    .filter((a) => {
      const start = new Date(a.startTime);
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return start >= now && start <= weekFromNow;
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 5);

  // Get open tasks grouped by assignee
  $: openTasks = tasks.filter((t) => t.status === 'open' || t.status === 'in_progress');
  $: unassignedTasks = openTasks.filter((t) => !t.assignedTo);
  $: overdueTasks = openTasks.filter((t) => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < new Date();
  });

  // Format date for display
  function formatActivityDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    if (isToday) return `Idag ${date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`;
    if (isTomorrow) return `Imorgon ${date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`;

    return date.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  // Get category emoji for activities
  function getActivityEmoji(category: string): string {
    const emojis: Record<string, string> = {
      sports: '⚽',
      music: '🎵',
      school: '📚',
      hobbies: '🎨',
      social: '👥',
      medical: '🏥',
      other: '📅',
    };
    return emojis[category] || '📅';
  }

  // Get who the grocery list is assigned to
  $: groceryAssignedMembers = familyMembers.filter((m) =>
    groceryAssignments.some((a) => a.userId === m.id)
  );

  // Calculate task info per member (only open/in_progress tasks)
  $: memberTaskInfo = familyMembers.reduce(
    (acc, member) => {
      const memberTasks = tasks.filter(
        (t) => t.assignedTo === member.id && (t.status === 'open' || t.status === 'in_progress')
      );

      const now = new Date();
      const overdueTasks = memberTasks.filter((t) => {
        if (!t.dueDate) return false;
        const dueDate = new Date(t.dueDate);
        return dueDate < now;
      });

      // Get unique categories
      const categories = [...new Set(memberTasks.map((t) => t.category))];

      // Primary category is the most common one
      const categoryCount = memberTasks.reduce(
        (counts, t) => {
          counts[t.category] = (counts[t.category] || 0) + 1;
          return counts;
        },
        {} as Record<TaskCategory, number>
      );

      const primaryCategory =
        categories.length > 0
          ? categories.reduce((a, b) => (categoryCount[a] >= categoryCount[b] ? a : b))
          : null;

      acc[member.id] = {
        total: memberTasks.length,
        overdue: overdueTasks.length,
        categories,
        primaryCategory,
      };
      return acc;
    },
    {} as Record<number, MemberTaskInfo>
  );

  // Notification counts per user based on actual grocery assignments
  $: memberGroceryNotifications = groceryAssignments.reduce(
    (acc, assignment) => {
      acc[assignment.userId] = pendingCount;
      return acc;
    },
    {} as Record<number, number>
  );

  interface ApiInfo {
    name: string;
    version: string;
    status: string;
  }

  $: pendingItems = groceryItems.filter((i) => !i.isBought);
  $: pendingCount = pendingItems.length;

  // Get the most recent item to show who updated the list
  $: latestItem =
    groceryItems.length > 0
      ? groceryItems.reduce((latest, item) => {
          const latestDate = new Date(latest.updatedAt || latest.createdAt);
          const itemDate = new Date(item.updatedAt || item.createdAt);
          return itemDate > latestDate ? item : latest;
        })
      : null;

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

  function handleWebSocketMessage(message: any) {
    switch (message.type) {
      case 'grocery:added':
        const newItem = message.payload.item;
        if (!groceryItems.find((i) => i.id === newItem.id)) {
          groceryItems = [newItem, ...groceryItems];
        }
        break;
      case 'grocery:updated':
        const updatedItem = message.payload.item;
        groceryItems = groceryItems.map((i) => (i.id === updatedItem.id ? updatedItem : i));
        break;
      case 'grocery:deleted':
        const deletedId = message.payload.id;
        groceryItems = groceryItems.filter((i) => i.id !== deletedId);
        break;
      case 'grocery:cleared':
        groceryItems = groceryItems.filter((i) => !i.isBought);
        break;
      case 'grocery:assigned':
        // Add assignment if not already present
        const assignedUserId = message.payload.userId;
        if (!groceryAssignments.find((a) => a.userId === assignedUserId)) {
          groceryAssignments = [...groceryAssignments, { userId: assignedUserId }];
        }
        break;
      case 'grocery:unassigned':
        // Remove assignment
        const unassignedUserId = message.payload.userId;
        groceryAssignments = groceryAssignments.filter((a) => a.userId !== unassignedUserId);
        break;
    }
  }

  onMount(() => {
    // Fetch API status, groceries, and family members
    (async () => {
      try {
        const data = await get<ApiInfo>('');
        apiStatus = `Connected - ${data.name} v${data.version}`;
      } catch {
        apiStatus = 'Cannot reach API (is it running?)';
      }

      try {
        const groceriesRes = await get<{ success: boolean; items: GroceryItem[] }>('/groceries');
        groceryItems = groceriesRes.items;
      } catch {
        // Ignore errors
      } finally {
        loadingGroceries = false;
      }

      // Fetch family members and tasks
      if ($currentFamily) {
        try {
          const membersRes = await get<{ users: FamilyMember[] }>(
            `/families/${$currentFamily.id}/users`
          );
          familyMembers = membersRes.users || [];

          // Fetch actual grocery assignments
          const assignmentsRes = await get<{ success: boolean; assignments: GroceryAssignment[] }>(
            '/groceries/assignments'
          );
          groceryAssignments = assignmentsRes.assignments || [];

          // Fetch tasks (requires x-family-id header)
          try {
            const tasksResponse = await fetch('/api/tasks', {
              headers: { 'x-family-id': String($currentFamily.id) },
              credentials: 'include',
            });
            if (tasksResponse.ok) {
              tasks = await tasksResponse.json();
            }
          } catch {
            // Tasks fetch failed, continue without
          }

          // Fetch activities
          try {
            const activitiesResponse = await fetch('/api/activities', {
              headers: { 'x-family-id': String($currentFamily.id) },
              credentials: 'include',
            });
            if (activitiesResponse.ok) {
              activities = await activitiesResponse.json();
            }
          } catch {
            // Activities fetch failed, continue without
          }
        } catch {
          // Ignore errors
        } finally {
          loadingMembers = false;
        }
      } else {
        loadingMembers = false;
      }
    })();

    // Connect to WebSocket for real-time updates
    groceryWs.connect();
    const unsubscribe = groceryWs.subscribe((state) => {
      if (state.lastMessage) {
        handleWebSocketMessage(state.lastMessage);
      }
    });

    return () => {
      unsubscribe();
    };
  });

  onDestroy(() => {
    groceryWs.disconnect();
  });
</script>

<svelte:head>
  <title>Family Hub</title>
</svelte:head>

<main
  class="flex-1 bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 dark:from-stone-900 dark:via-stone-800 dark:to-stone-900"
>
  <div class="h-full flex flex-col lg:flex-row gap-6 p-4 lg:p-6 max-w-7xl mx-auto">
    <!-- Left Sidebar - Family Members -->
    <aside class="lg:w-64 flex-shrink-0">
      <div
        class="bg-white/90 dark:bg-stone-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-orange-200 dark:border-stone-700 p-6"
      >
        <h3 class="text-sm font-semibold text-stone-600 dark:text-stone-400 mb-4">Familjen</h3>

        {#if loadingMembers}
          <div class="flex justify-center py-4">
            <div
              class="animate-spin w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full"
            ></div>
          </div>
        {:else if familyMembers.length === 0}
          <p class="text-sm text-stone-500 dark:text-stone-400">Inga medlemmar</p>
        {:else}
          <div class="space-y-2">
            {#each familyMembers as member (member.id)}
              {@const bgColor = colorClasses[member.color || 'orange']}
              {@const groceryCount = memberGroceryNotifications[member.id] || 0}
              {@const taskInfo = memberTaskInfo[member.id] || {
                total: 0,
                overdue: 0,
                categories: [],
                primaryCategory: null,
              }}
              {@const taskBadgeColor =
                taskInfo.overdue > 0 ? 'bg-red-500' : getTaskBadgeColor(taskInfo.primaryCategory)}
              <a
                href="/profile/{member.id}"
                class="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-700/50 transition-colors text-left relative block"
              >
                <!-- Avatar with task/grocery badges -->
                <div class="relative">
                  <div
                    class="{bgColor} w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-md"
                  >
                    {member.avatarEmoji || '👤'}
                  </div>
                  <!-- Task indicator (top-right) -->
                  {#if taskInfo.total > 0}
                    <div
                      class="absolute -top-1 -right-1 w-5 h-5 {taskBadgeColor} rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md border-2 border-white dark:border-stone-800"
                      title="{taskInfo.total} uppgift{taskInfo.total > 1
                        ? 'er'
                        : ''}{taskInfo.overdue > 0
                        ? ` (${taskInfo.overdue} försenad${taskInfo.overdue > 1 ? 'e' : ''})`
                        : ''}"
                    >
                      {taskInfo.total > 9 ? '9+' : taskInfo.total}
                    </div>
                  {/if}
                  <!-- Grocery indicator (bottom-right) -->
                  {#if groceryCount > 0}
                    <div
                      class="absolute -bottom-1 -right-1 w-4 h-4 bg-pink-500 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-md border-2 border-white dark:border-stone-800"
                      title="Tilldelad inköpslistan"
                    >
                      🛒
                    </div>
                  {/if}
                </div>

                <!-- Name and role -->
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-stone-800 dark:text-stone-200 truncate">
                    {member.displayName || member.username}
                  </p>
                  {#if member.role}
                    <p class="text-xs text-stone-500 dark:text-stone-400 capitalize">
                      {member.role === 'pappa'
                        ? 'Pappa'
                        : member.role === 'mamma'
                          ? 'Mamma'
                          : member.role === 'barn'
                            ? 'Barn'
                            : member.role === 'bebis'
                              ? 'Bebis'
                              : member.role}
                    </p>
                  {/if}
                </div>
              </a>
            {/each}
          </div>
        {/if}
      </div>
    </aside>

    <!-- Main Content - Bulletin Board (Anslagstavla) -->
    <div class="flex-1 min-w-0 space-y-3">
      
      <!-- Upcoming Activities - Compact -->
      <div
        class="bg-white/90 dark:bg-stone-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-orange-200 dark:border-stone-700 p-4"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-semibold text-stone-600 dark:text-stone-400">📅</span>
          <a href="/calendar" class="text-xs text-teal-600 dark:text-teal-400 hover:underline">Kalender →</a>
        </div>

        {#if loadingMembers}
          <div class="flex justify-center py-2">
            <div class="animate-spin w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full"></div>
          </div>
        {:else if upcomingActivities.length === 0}
          <p class="text-xs text-stone-400 dark:text-stone-500">Inget planerat denna vecka</p>
        {:else}
          <div class="space-y-1">
            {#each upcomingActivities as activity (activity.id)}
              <a
                href="/calendar"
                class="flex items-center gap-2 py-1 hover:bg-stone-50 dark:hover:bg-stone-700/50 rounded px-1 -mx-1 transition-colors"
              >
                <span class="text-sm flex-shrink-0">{getActivityEmoji(activity.category)}</span>
                <span class="text-sm text-stone-700 dark:text-stone-300 truncate flex-1">{activity.title}</span>
                <span class="text-[10px] text-stone-400 dark:text-stone-500 flex-shrink-0">
                  {formatActivityDate(activity.startTime)}
                </span>
              </a>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Tasks - Compact List -->
      <div
        class="bg-white/90 dark:bg-stone-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-orange-200 dark:border-stone-700 p-4"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-semibold text-stone-600 dark:text-stone-400">📋</span>
          <a href="/tasks" class="text-xs text-teal-600 dark:text-teal-400 hover:underline">Alla uppgifter →</a>
        </div>

        {#if loadingMembers}
          <div class="flex justify-center py-2">
            <div class="animate-spin w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full"></div>
          </div>
        {:else if openTasks.length === 0}
          <p class="text-xs text-stone-400 dark:text-stone-500">Inga uppgifter ✓</p>
        {:else}
          <div class="space-y-1">
            {#each openTasks.slice(0, 6) as task (task.id)}
              {@const assignee = familyMembers.find(m => m.id === task.assignedTo)}
              {@const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()}
              <a
                href="/tasks"
                class="flex items-center gap-2 py-1 hover:bg-stone-50 dark:hover:bg-stone-700/50 rounded px-1 -mx-1 transition-colors"
              >
                <span class="text-sm flex-shrink-0">{assignee?.avatarEmoji || '·'}</span>
                <span class="text-sm text-stone-700 dark:text-stone-300 truncate flex-1 {isOverdue ? 'text-red-600 dark:text-red-400' : ''}">{task.title}</span>
                {#if task.dueDate}
                  <span class="text-[10px] text-stone-400 dark:text-stone-500 flex-shrink-0">
                    {new Date(task.dueDate).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
                  </span>
                {/if}
              </a>
            {/each}
            {#if openTasks.length > 6}
              <p class="text-[10px] text-stone-400 dark:text-stone-500 pt-1">+{openTasks.length - 6} till...</p>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Shopping List - Compact -->
      <div
        class="bg-white/90 dark:bg-stone-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-orange-200 dark:border-stone-700 p-4"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-semibold text-stone-600 dark:text-stone-400">🛒</span>
          <a href="/groceries" class="text-xs text-teal-600 dark:text-teal-400 hover:underline">Visa lista →</a>
        </div>

        {#if loadingGroceries}
          <div class="flex justify-center py-2">
            <div class="animate-spin w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full"></div>
          </div>
        {:else if pendingCount === 0}
          <p class="text-xs text-stone-400 dark:text-stone-500">Listan är tom ✓</p>
        {:else}
          <a
            href="/groceries"
            class="flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-700/50 rounded px-1 -mx-1 py-1 transition-colors"
          >
            <span class="text-sm text-stone-700 dark:text-stone-300">
              <span class="font-semibold text-orange-500 dark:text-amber-400">{pendingCount}</span> varor
            </span>
            {#if groceryAssignedMembers.length > 0}
              <div class="flex items-center gap-1">
                {#each groceryAssignedMembers as member}
                  <span class="text-sm" title={member.displayName || member.username}>{member.avatarEmoji || '👤'}</span>
                {/each}
              </div>
            {/if}
          </a>
        {/if}
      </div>

    </div>

    <!-- API Status - Bottom Right Corner -->
    <div class="fixed bottom-2 right-2 text-[10px] text-stone-400 dark:text-stone-600">
      {apiStatus}
    </div>
  </div>
</main>
