<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { login, loading, error } from '$lib/stores/auth';
  import { get } from '$lib/api/client';
  import { t } from '$lib/i18n';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

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
    orange: 'from-orange-300 to-amber-300 hover:from-orange-400 hover:to-amber-400',
    amber: 'from-amber-300 to-yellow-300 hover:from-amber-400 hover:to-yellow-400',
    rose: 'from-rose-300 to-pink-300 hover:from-rose-400 hover:to-pink-400',
    green: 'from-emerald-300 to-teal-300 hover:from-emerald-400 hover:to-teal-400',
    blue: 'from-sky-300 to-blue-300 hover:from-sky-400 hover:to-blue-400',
    purple: 'from-violet-300 to-purple-300 hover:from-violet-400 hover:to-purple-400',
    stone: 'from-stone-300 to-zinc-300 hover:from-stone-400 hover:to-zinc-400',
  };

  function calculateAge(birthday: string | null): number | null {
    if (!birthday) return null;
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  function getRoleLabel(role: string | null): string {
    switch (role) {
      case 'pappa':
        return $t('role.father');
      case 'mamma':
        return $t('role.mother');
      case 'barn':
        return $t('role.child');
      case 'bebis':
        return $t('role.other');
      case 'annan':
        return $t('role.other');
      default:
        return '';
    }
  }

  let familyId: number = 0;
  let familyName = '';
  let familyMembers: FamilyMember[] = [];
  let selectedMemberForPassword: string | null = null;
  let password = '';
  let showPassword = false;
  let loadingFamily = true;

  $: if ($page.params.familyId) {
    familyId = parseInt($page.params.familyId, 10);
  }

  // Load family name and members when familyId is available
  $: if (familyId > 0 && !familyName) {
    loadFamilyInfo();
  }

  async function loadFamilyInfo() {
    loadingFamily = true;
    try {
      const [familyData, membersData] = await Promise.all([
        get<{ family: { id: number; name: string } }>(`/families/${familyId}`),
        get<{ users: FamilyMember[] }>(`/families/${familyId}/users`),
      ]);

      familyName = familyData.family.name;
      familyMembers = membersData.users || [];
    } catch (err) {
      console.error('Failed to load family info', err);
    } finally {
      loadingFamily = false;
    }
  }

  async function handleSubmit() {
    if (familyId === 0) {
      error.set('Family ID is required');
      return;
    }
    if (!selectedMemberForPassword) {
      error.set('Please select a family member');
      return;
    }
    // Password is required when this form is shown
    const success = await login(familyId, selectedMemberForPassword, password);
    if (success) {
      goto('/');
    } else {
      password = ''; // Clear password on failed attempt
    }
  }

  async function loginWithoutPassword(username: string) {
    const success = await login(familyId, username, '');
    if (success) {
      goto('/');
    }
  }

  function showPasswordPrompt(username: string) {
    selectedMemberForPassword = username;
    password = '';
  }

  function cancelPasswordPrompt() {
    selectedMemberForPassword = null;
    password = '';
    showPassword = false;
  }
</script>

<svelte:head>
  <title>Login - Family Hub</title>
</svelte:head>

<div
  class="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 dark:from-stone-900 dark:via-stone-800 dark:to-stone-900 px-4 py-8"
>
  <div class="w-full max-w-5xl">
    <div class="flex flex-col lg:flex-row gap-8 items-stretch">
      <!-- Left side - Welcome message -->
      <div class="flex-1 flex flex-col justify-center lg:pr-8">
        <div class="text-center lg:text-left mb-8 lg:mb-0">
          <h1
            class="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent mb-4"
          >
            Family Hub
          </h1>
          {#if familyName}
            <p class="text-xl lg:text-2xl text-stone-700 dark:text-stone-300 font-medium">
              Välkommen till {familyName}
            </p>
            <p class="text-stone-600 dark:text-stone-400 mt-4">Välj din profil för att fortsätta</p>
          {:else}
            <p class="text-xl text-stone-600 dark:text-stone-400">{$t('common.loading')}</p>
          {/if}
        </div>

        <button
          on:click={() => goto('/welcome')}
          class="hidden lg:inline-flex items-center gap-2 text-stone-600 dark:text-stone-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors mt-8"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clip-rule="evenodd"
            />
          </svg>
          Tillbaka till familjeväljaren
        </button>
      </div>

      <!-- Right side - Member cards -->
      <div class="flex-1 lg:max-w-md">
        <div
          class="bg-white/90 dark:bg-stone-800/90 backdrop-blur-lg rounded-2xl shadow-2xl p-6 lg:p-8 border border-orange-200 dark:border-stone-700"
        >
          {#if loadingFamily}
            <!-- Loading spinner while fetching family data -->
            <div class="py-8">
              <LoadingSpinner size="lg" text={$t('login.loadingMembers')} />
            </div>
          {:else if familyMembers.length === 0 && familyName}
            <div class="text-center text-stone-600 dark:text-stone-400 py-8">
              <p>Inga familjemedlemmar hittades</p>
            </div>
          {:else if selectedMemberForPassword}
            <!-- Password input modal/overlay -->
            {@const selectedMember = familyMembers.find(
              (m) => m.username === selectedMemberForPassword
            )}
            <form on:submit|preventDefault={handleSubmit} class="space-y-6">
              <div class="text-center mb-6">
                <div class="text-5xl mb-4">{selectedMember?.avatarEmoji || '🔐'}</div>
                <p class="text-sm text-stone-600 dark:text-stone-400">
                  Loggar in som <span class="font-semibold text-stone-900 dark:text-white"
                    >{selectedMember?.displayName || selectedMemberForPassword}</span
                  >
                </p>
              </div>

              <div>
                <label
                  for="password"
                  class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2"
                >
                  {$t('login.passwordLabel')}
                </label>
                <div class="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    on:input={(e) => (password = e.currentTarget.value)}
                    class="input w-full pr-12 bg-white dark:bg-stone-700"
                    placeholder="Ange lösenord"
                    disabled={$loading}
                  />
                  <button
                    type="button"
                    on:click={() => (showPassword = !showPassword)}
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300"
                  >
                    {#if showPassword}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="currentColor"
                        class="w-5 h-5"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      </svg>
                    {:else}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="currentColor"
                        class="w-5 h-5"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                        />
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    {/if}
                  </button>
                </div>
              </div>

              {#if $error}
                <div class="text-red-600 dark:text-red-400 text-sm text-center">
                  {$error}
                </div>
              {/if}

              <button type="submit" class="btn-primary w-full" disabled={$loading}>
                {#if $loading}
                  Loggar in...
                {:else}
                  Logga in
                {/if}
              </button>

              <div class="flex items-center justify-between text-sm">
                <button
                  type="button"
                  on:click={cancelPasswordPrompt}
                  class="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                >
                  {$t('login.cancelButton')}
                </button>
                <a
                  href="/forgot-password"
                  class="text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                >
                  Glömt lösenord?
                </a>
              </div>
            </form>
          {:else}
            <!-- Member selection view -->
            <div class="space-y-3">
              <p class="text-sm font-medium text-stone-600 dark:text-stone-400 mb-4">Vem är du?</p>
              {#each familyMembers as member (member.id)}
                {@const age = calculateAge(member.birthday)}
                {@const cardColor = colorClasses[member.color || 'orange']}
                <div
                  class="group relative overflow-hidden bg-gradient-to-br {cardColor} rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                >
                  <div class="p-4 flex items-center justify-between">
                    <button
                      on:click={() =>
                        member.hasPassword
                          ? showPasswordPrompt(member.username)
                          : loginWithoutPassword(member.username)}
                      disabled={$loading}
                      class="flex-1 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div class="flex items-center gap-3">
                        <span class="text-3xl">{member.avatarEmoji || '👤'}</span>
                        <div>
                          <div class="text-lg font-semibold text-stone-800">
                            {member.displayName || member.username}
                          </div>
                          <div class="text-sm text-stone-600 flex items-center gap-2">
                            {#if member.role}
                              <span>{getRoleLabel(member.role)}</span>
                            {/if}
                            {#if age !== null && member.role !== 'pappa' && member.role !== 'mamma'}
                              <span class="opacity-75">• {age} år</span>
                            {/if}
                          </div>
                        </div>
                      </div>
                    </button>
                    {#if member.hasPassword}
                      <button
                        on:click={() => showPasswordPrompt(member.username)}
                        disabled={$loading}
                        class="ml-4 px-3 py-1.5 bg-white/30 hover:bg-white/40 backdrop-blur-sm rounded-lg text-xs font-medium text-stone-800 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                            clip-rule="evenodd"
                          />
                        </svg>
                        {$t('login.passwordLabel')}
                      </button>
                    {/if}
                  </div>
                </div>
              {/each}

              {#if $error}
                <div class="text-red-600 dark:text-red-400 text-sm text-center mt-4">
                  {$error}
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Mobile back button -->
        <button
          on:click={() => goto('/welcome')}
          class="lg:hidden w-full mt-6 text-center text-stone-600 dark:text-stone-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors flex items-center justify-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clip-rule="evenodd"
            />
          </svg>
          Tillbaka till familjeväljaren
        </button>
      </div>
    </div>
  </div>
</div>
