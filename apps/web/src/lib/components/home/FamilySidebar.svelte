<script lang="ts">
  import { t } from '$lib/i18n';
  import type { TaskCategory } from '@family-hub/shared/types';

  export let familyMembers: FamilyMember[] = [];
  export let loadingMembers = true;
  export let memberTaskInfo: Record<number, MemberTaskInfo> = {};
  export let memberGroceryNotifications: Record<number, number> = {};

  interface FamilyMember {
    id: number;
    username: string;
    displayName: string | null;
    role: string | null;
    avatarEmoji: string | null;
    color: string | null;
  }

  interface MemberTaskInfo {
    total: number;
    overdue: number;
    categories: TaskCategory[];
    primaryCategory: TaskCategory | null;
  }

  const colorClasses: Record<string, string> = {
    orange: 'bg-orange-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    green: 'bg-emerald-400',
    blue: 'bg-sky-400',
    purple: 'bg-violet-400',
    stone: 'bg-stone-400',
  };

  function getTaskBadgeColor(category: TaskCategory | null): string {
    if (!category) return 'bg-orange-500';
    if (category === 'shopping') return 'bg-pink-500';
    if (category === 'outdoor' || category === 'pets') return 'bg-blue-500';
    return 'bg-orange-500';
  }
</script>

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
                  title="{taskInfo.total} uppgift{taskInfo.total > 1 ? 'er' : ''}{taskInfo.overdue >
                  0
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
                  title={$t('groceries.assignedToList')}
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
