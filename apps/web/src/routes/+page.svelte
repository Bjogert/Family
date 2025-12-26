<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from '$lib/api/client';
  import { t } from '$lib/i18n';
  import { groceryWs } from '$lib/stores/groceryWs';
  import { currentFamily, currentUser } from '$lib/stores/auth';
  import type { GroceryItem } from '$lib/types/grocery';
  import type { Task, TaskCategory, Activity, BulletinNote } from '@family-hub/shared/types';
  import BulletinNoteForm from '$lib/components/BulletinNoteForm.svelte';
  import {
    FamilySidebar,
    MyTasksCard,
    BulletinNoteCard,
    UpcomingActivities,
    TasksPreview,
    GroceryPreview,
  } from '$lib/components/home';

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

  interface GroceryAssignment {
    userId: number;
  }

  interface MemberTaskInfo {
    total: number;
    overdue: number;
    categories: TaskCategory[];
    primaryCategory: TaskCategory | null;
  }

  interface ApiInfo {
    name: string;
    version: string;
    status: string;
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

  // Computed values
  $: pendingItems = groceryItems.filter((i) => !i.isBought);
  $: pendingCount = pendingItems.length;

  $: upcomingActivities = activities
    .filter((a) => {
      const start = new Date(a.startTime);
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return start >= now && start <= weekFromNow;
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 5);

  $: openTasks = tasks.filter((t) => t.status === 'open' || t.status === 'in_progress');

  $: myAssignedTasks = $currentUser
    ? tasks.filter(
        (t) =>
          t.assignedTo === $currentUser.id && (t.status === 'open' || t.status === 'in_progress')
      )
    : [];

  $: tasksAwaitingMyApproval = $currentUser
    ? tasks.filter(
        (t) => t.createdBy === $currentUser.id && t.status === 'done' && t.requiresValidation
      )
    : [];

  $: groceryAssignedMembers = familyMembers.filter((m) =>
    groceryAssignments.some((a) => a.userId === m.id)
  );

  $: memberGroceryNotifications = groceryAssignments.reduce(
    (acc, assignment) => {
      acc[assignment.userId] = pendingCount;
      return acc;
    },
    {} as Record<number, number>
  );

  $: memberTaskInfo = familyMembers.reduce(
    (acc, member) => {
      const memberTasks = tasks.filter(
        (t) => t.assignedTo === member.id && (t.status === 'open' || t.status === 'in_progress')
      );
      const now = new Date();
      const overdueTasks = memberTasks.filter((t) => {
        if (!t.dueDate) return false;
        return new Date(t.dueDate) < now;
      });
      const categories = [...new Set(memberTasks.map((t) => t.category))];
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

  // Bulletin CRUD functions
  function sortNotes(notes: BulletinNote[]): BulletinNote[] {
    return notes.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

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
        bulletinNotes = sortNotes([newNote, ...bulletinNotes]);
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
        bulletinNotes = sortNotes(bulletinNotes.map((n) => (n.id === id ? updatedNote : n)));
      }
    } catch (e) {
      console.error('Failed to update note:', e);
    }
    editingNote = null;
    showNoteForm = false;
  }

  async function deleteNote(id: number) {
    if (!$currentFamily) return;
    if (!confirm($t('bulletin.deleteConfirm'))) return;
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

  async function toggleListItem(noteId: number, itemId: string) {
    const note = bulletinNotes.find((n) => n.id === noteId);
    if (!note?.listItems) return;
    const updatedItems = note.listItems.map((item) =>
      item.id === itemId ? { ...item, isChecked: !item.isChecked } : item
    );
    await updateNote(noteId, { listItems: updatedItems });
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
        groceryItems = groceryItems.filter((i) => i.id !== message.payload.id);
        break;
      case 'grocery:cleared':
        groceryItems = groceryItems.filter((i) => !i.isBought);
        break;
      case 'grocery:assigned':
        const assignedUserId = message.payload.userId;
        if (!groceryAssignments.find((a) => a.userId === assignedUserId)) {
          groceryAssignments = [...groceryAssignments, { userId: assignedUserId }];
        }
        break;
      case 'grocery:unassigned':
        groceryAssignments = groceryAssignments.filter((a) => a.userId !== message.payload.userId);
        break;
    }
  }

  onMount(() => {
    (async () => {
      // Fetch API status
      try {
        const data = await get<ApiInfo>('');
        apiStatus = `Connected - ${data.name} v${data.version}`;
      } catch {
        apiStatus = 'Cannot reach API (is it running?)';
      }

      // Fetch groceries
      try {
        const groceriesRes = await get<{ success: boolean; items: GroceryItem[] }>('/groceries');
        groceryItems = groceriesRes.items;
      } catch {
        // Ignore errors
      } finally {
        loadingGroceries = false;
      }

      // Fetch family data
      if ($currentFamily) {
        try {
          const membersRes = await get<{ users: FamilyMember[] }>(
            `/families/${$currentFamily.id}/users`
          );
          familyMembers = membersRes.users || [];

          const assignmentsRes = await get<{ success: boolean; assignments: GroceryAssignment[] }>(
            '/groceries/assignments'
          );
          groceryAssignments = assignmentsRes.assignments || [];

          // Fetch tasks
          try {
            const tasksResponse = await fetch('/api/tasks', {
              headers: { 'x-family-id': String($currentFamily.id) },
              credentials: 'include',
            });
            if (tasksResponse.ok) tasks = await tasksResponse.json();
          } catch {}

          // Fetch activities
          try {
            const activitiesResponse = await fetch('/api/activities', {
              headers: { 'x-family-id': String($currentFamily.id) },
              credentials: 'include',
            });
            if (activitiesResponse.ok) activities = await activitiesResponse.json();
          } catch {}

          // Fetch bulletin notes
          try {
            const bulletinResponse = await fetch('/api/bulletin', {
              headers: { 'x-family-id': String($currentFamily.id) },
              credentials: 'include',
            });
            if (bulletinResponse.ok) bulletinNotes = await bulletinResponse.json();
          } catch {}
        } catch {
          // Ignore errors
        } finally {
          loadingMembers = false;
        }
      } else {
        loadingMembers = false;
      }
    })();

    // WebSocket for real-time updates
    groceryWs.connect();
    const unsubscribe = groceryWs.subscribe((state) => {
      if (state.lastMessage) handleWebSocketMessage(state.lastMessage);
    });

    return () => unsubscribe();
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
    <FamilySidebar {familyMembers} {loadingMembers} {memberTaskInfo} {memberGroceryNotifications} />

    <!-- Main Content - Bulletin Board -->
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
        <span class="text-sm">{$t('bulletin.addNote')}</span>
      </button>

      <!-- My Tasks Section -->
      <MyTasksCard {myAssignedTasks} {tasksAwaitingMyApproval} {familyMembers} />

      {#if loadingMembers || loadingGroceries}
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
          <BulletinNoteCard
            {note}
            on:edit={(e) => {
              editingNote = e.detail;
              showNoteForm = true;
            }}
            on:delete={(e) => deleteNote(e.detail)}
            on:toggleItem={(e) => toggleListItem(e.detail.noteId, e.detail.itemId)}
          />
        {/each}

        <!-- Upcoming Activities -->
        <UpcomingActivities activities={upcomingActivities} />

        <!-- Tasks Preview -->
        <TasksPreview tasks={openTasks} {familyMembers} />

        <!-- Grocery Preview -->
        <GroceryPreview {pendingCount} assignedMembers={groceryAssignedMembers} />

        <!-- Empty state -->
        {#if upcomingActivities.length === 0 && openTasks.length === 0 && pendingCount === 0 && bulletinNotes.length === 0}
          <div
            class="bg-white/90 dark:bg-stone-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-orange-200 dark:border-stone-700 p-6 text-center"
          >
            <p class="text-4xl mb-2">✨</p>
            <p class="text-sm text-stone-500 dark:text-stone-400">{$t('home.allDone')}</p>
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

    <!-- API Status -->
    <div class="fixed bottom-2 right-2 text-[10px] text-stone-400 dark:text-stone-600">
      {apiStatus}
    </div>
  </div>
</main>
