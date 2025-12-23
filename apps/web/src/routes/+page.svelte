<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get, post, put, del } from '$lib/api/client';
  import { t } from '$lib/i18n';
  import { groceryWs } from '$lib/stores/groceryWs';
  import { currentFamily, currentUser } from '$lib/stores/auth';
  import type { GroceryItem } from '$lib/types/grocery';
  import type {
    Task,
    TaskCategory,
    TaskStatus,
    Activity,
    BulletinNote,
    BulletinListItem,
  } from '@family-hub/shared/types';
  import BulletinNoteForm from '$lib/components/BulletinNoteForm.svelte';

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
  let bulletinNotes: BulletinNote[] = [];
  let showNoteForm = false;
  let editingNote: BulletinNote | null = null;

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

    if (isToday)
      return `Idag ${date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`;
    if (isTomorrow)
      return `Imorgon ${date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`;

    return date.toLocaleDateString('sv-SE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  // Bulletin note color classes
  const noteColorClasses: Record<string, string> = {
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700',
    pink: 'bg-pink-100 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700',
    blue: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
    green: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700',
    purple: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700',
    orange: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700',
  };

  // Bulletin CRUD
  async function createNote(data: any) {
    if (!$currentFamily) return;
    try {
      const response = await fetch('/api/bulletin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-family-id': String($currentFamily.id),
          'x-user-id': String($currentUser?.id),
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (response.ok) {
        const newNote = await response.json();
        bulletinNotes = [
          newNote,
          ...bulletinNotes.filter((n) => !n.isPinned),
          ...bulletinNotes.filter((n) => n.isPinned && n.id !== newNote.id),
        ];
        // Re-sort: pinned first, then by date
        bulletinNotes = bulletinNotes.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      }
    } catch (e) {
      console.error('Failed to create note:', e);
    }
    showNoteForm = false;
  }

  async function updateNote(id: number, data: any) {
    if (!$currentFamily) return;
    try {
      const response = await fetch(`/api/bulletin/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-family-id': String($currentFamily.id),
          'x-user-id': String($currentUser?.id),
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (response.ok) {
        const updatedNote = await response.json();
        bulletinNotes = bulletinNotes.map((n) => (n.id === id ? updatedNote : n));
        // Re-sort
        bulletinNotes = bulletinNotes.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      }
    } catch (e) {
      console.error('Failed to update note:', e);
    }
    editingNote = null;
    showNoteForm = false;
  }

  async function deleteNote(id: number) {
    if (!$currentFamily) return;
    if (!confirm('Ta bort denna notis?')) return;
    try {
      const response = await fetch(`/api/bulletin/${id}`, {
        method: 'DELETE',
        headers: { 'x-family-id': String($currentFamily.id) },
        credentials: 'include',
      });
      if (response.ok) {
        bulletinNotes = bulletinNotes.filter((n) => n.id !== id);
      }
    } catch (e) {
      console.error('Failed to delete note:', e);
    }
  }

  async function toggleListItem(note: BulletinNote, itemId: string) {
    if (!note.listItems) return;
    const updatedItems = note.listItems.map((item) =>
      item.id === itemId ? { ...item, isChecked: !item.isChecked } : item
    );
    await updateNote(note.id, { listItems: updatedItems });
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

          // Fetch bulletin notes
          try {
            const bulletinResponse = await fetch('/api/bulletin', {
              headers: { 'x-family-id': String($currentFamily.id) },
              credentials: 'include',
            });
            if (bulletinResponse.ok) {
              bulletinNotes = await bulletinResponse.json();
            }
          } catch {
            // Bulletin fetch failed, continue without
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
      <!-- Add Note Button -->
      <button
        on:click={() => {
          editingNote = null;
          showNoteForm = true;
        }}
        class="w-full bg-white/90 dark:bg-stone-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-orange-200 dark:border-stone-700 p-3 flex items-center justify-center gap-2 text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors"
      >
        <span class="text-lg">📌</span>
        <span class="text-sm">Lägg till notis...</span>
      </button>

      {#if loadingMembers || loadingGroceries}
        <!-- Loading state -->
        <div
          class="bg-white/90 dark:bg-stone-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-orange-200 dark:border-stone-700 p-4"
        >
          <div class="flex justify-center py-4">
            <div
              class="animate-spin w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full"
            ></div>
          </div>
        </div>
      {:else}
        <!-- Bulletin Notes -->
        {#each bulletinNotes as note (note.id)}
          <div
            class="rounded-2xl shadow-xl border p-4 {noteColorClasses[note.color] ||
              noteColorClasses.yellow}"
          >
            <!-- Header: Creator + Pin + Actions -->
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center gap-2">
                {#if note.isPinned}
                  <span class="text-sm">📌</span>
                {/if}
                <span class="text-xs text-stone-500 dark:text-stone-400">
                  {note.creator?.avatarEmoji || '👤'}
                  {note.creator?.displayName || 'Någon'} · {timeAgo(note.createdAt)}
                </span>
              </div>
              <div class="flex items-center gap-1">
                <button
                  on:click={() => {
                    editingNote = note;
                    showNoteForm = true;
                  }}
                  class="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                  title="Redigera"
                >
                  ✏️
                </button>
                <button
                  on:click={() => deleteNote(note.id)}
                  class="p-1 text-stone-400 hover:text-red-500"
                  title="Ta bort"
                >
                  🗑️
                </button>
              </div>
            </div>

            <!-- Title -->
            <h3 class="font-semibold text-stone-800 dark:text-stone-100 mb-1">{note.title}</h3>

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
                    on:click={() => toggleListItem(note, item.id)}
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
        {/each}

        <!-- Upcoming Activities - Only show if there are activities -->
        {#if upcomingActivities.length > 0}
          <div
            class="bg-white/90 dark:bg-stone-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-orange-200 dark:border-stone-700 p-4"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-semibold text-stone-600 dark:text-stone-400">📅</span>
              <a href="/calendar" class="text-xs text-teal-600 dark:text-teal-400 hover:underline"
                >Kalender →</a
              >
            </div>
            <div class="space-y-1">
              {#each upcomingActivities as activity (activity.id)}
                <a
                  href="/calendar"
                  class="flex items-center gap-2 py-1 hover:bg-stone-50 dark:hover:bg-stone-700/50 rounded px-1 -mx-1 transition-colors"
                >
                  <span class="text-sm flex-shrink-0">{getActivityEmoji(activity.category)}</span>
                  <span class="text-sm text-stone-700 dark:text-stone-300 truncate flex-1"
                    >{activity.title}</span
                  >
                  <span class="text-[10px] text-stone-400 dark:text-stone-500 flex-shrink-0">
                    {formatActivityDate(activity.startTime)}
                  </span>
                </a>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Tasks - Only show if there are open tasks -->
        {#if openTasks.length > 0}
          <div
            class="bg-white/90 dark:bg-stone-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-orange-200 dark:border-stone-700 p-4"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-semibold text-stone-600 dark:text-stone-400">📋</span>
              <a href="/tasks" class="text-xs text-teal-600 dark:text-teal-400 hover:underline"
                >Alla uppgifter →</a
              >
            </div>
            <div class="space-y-1">
              {#each openTasks.slice(0, 6) as task (task.id)}
                {@const assignee = familyMembers.find((m) => m.id === task.assignedTo)}
                {@const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()}
                <a
                  href="/tasks"
                  class="flex items-center gap-2 py-1 hover:bg-stone-50 dark:hover:bg-stone-700/50 rounded px-1 -mx-1 transition-colors"
                >
                  <span class="text-sm flex-shrink-0">{assignee?.avatarEmoji || '·'}</span>
                  <span
                    class="text-sm text-stone-700 dark:text-stone-300 truncate flex-1 {isOverdue
                      ? 'text-red-600 dark:text-red-400'
                      : ''}">{task.title}</span
                  >
                  {#if task.dueDate}
                    <span class="text-[10px] text-stone-400 dark:text-stone-500 flex-shrink-0">
                      {new Date(task.dueDate).toLocaleDateString('sv-SE', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  {/if}
                </a>
              {/each}
              {#if openTasks.length > 6}
                <p class="text-[10px] text-stone-400 dark:text-stone-500 pt-1">
                  +{openTasks.length - 6} till...
                </p>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Shopping List - Only show if there are items -->
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
                <span class="font-semibold text-orange-500 dark:text-amber-400">{pendingCount}</span
                > varor
              </span>
              {#if groceryAssignedMembers.length > 0}
                <div class="flex items-center gap-1">
                  {#each groceryAssignedMembers as member}
                    <span class="text-sm" title={member.displayName || member.username}
                      >{member.avatarEmoji || '👤'}</span
                    >
                  {/each}
                </div>
              {/if}
            </a>
          </div>
        {/if}

        <!-- Empty state - show when nothing is happening -->
        {#if upcomingActivities.length === 0 && openTasks.length === 0 && pendingCount === 0 && bulletinNotes.length === 0}
          <div
            class="bg-white/90 dark:bg-stone-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-orange-200 dark:border-stone-700 p-6 text-center"
          >
            <p class="text-4xl mb-2">✨</p>
            <p class="text-sm text-stone-500 dark:text-stone-400">
              Allt klart! Inget att göra just nu.
            </p>
          </div>
        {/if}
      {/if}
    </div>

    <!-- Note Form Modal -->
    {#if showNoteForm}
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="w-full max-w-md max-h-[90vh] overflow-y-auto">
          <BulletinNoteForm
            note={editingNote}
            {familyMembers}
            on:save={(e) =>
              editingNote ? updateNote(editingNote.id, e.detail) : createNote(e.detail)}
            on:cancel={() => {
              showNoteForm = false;
              editingNote = null;
            }}
          />
        </div>
      </div>
    {/if}

    <!-- API Status - Bottom Right Corner -->
    <div class="fixed bottom-2 right-2 text-[10px] text-stone-400 dark:text-stone-600">
      {apiStatus}
    </div>
  </div>
</main>
