<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { login, loading, error } from '$lib/stores/auth';
  import { get } from '$lib/api/client';

  interface FamilyMember {
    id: number;
    username: string;
    displayName: string | null;
  }

  let familyId: number = 0;
  let familyName = '';
  let familyMembers: FamilyMember[] = [];
  let selectedUsername: string | null = null;
  let password = '';
  let showPassword = false;

  $: if ($page.params.familyId) {
    familyId = parseInt($page.params.familyId, 10);
  }

  // Load family name and members when familyId is available
  $: if (familyId > 0 && !familyName) {
    loadFamilyInfo();
  }

  async function loadFamilyInfo() {
    try {
      const [familyData, membersData] = await Promise.all([
        get<{ family: { id: number; name: string } }>(`/families/${familyId}`),
        get<{ users: FamilyMember[] }>(`/families/${familyId}/users`),
      ]);

      familyName = familyData.family.name;
      familyMembers = membersData.users || [];
    } catch (err) {
      console.error('Failed to load family info', err);
    }
  }

  async function handleSubmit() {
    if (familyId === 0) {
      error.set('Family ID is required');
      return;
    }
    if (!selectedUsername) {
      error.set('Please select a family member');
      return;
    }
    // Password is optional - allow empty password
    const success = await login(familyId, selectedUsername, password);
    if (success) {
      goto('/');
    }
  }

  function goBack() {
    goto('/welcome');
  }

  function selectMember(username: string) {
    selectedUsername = username;
  }
</script>

<svelte:head>
  <title>Login - Family Hub</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
  <div class="w-full max-w-sm">
    <div class="card p-8">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Family Hub</h1>
        {#if familyName}
          <p class="text-gray-600 dark:text-gray-400 mt-2">Welcome to {familyName}</p>
        {:else}
          <p class="text-gray-600 dark:text-gray-400 mt-2">Loading...</p>
        {/if}
      </div>

      {#if familyMembers.length === 0 && familyName}
        <div class="text-center text-gray-600 dark:text-gray-400">
          <p>No family members found</p>
        </div>
      {:else if selectedUsername}
        <!-- Password input when member is selected -->
        <form on:submit|preventDefault={handleSubmit} class="space-y-6">
          <div class="text-center mb-6">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Logging in as {familyMembers.find((m) => m.username === selectedUsername)
                ?.displayName || selectedUsername}
            </p>
          </div>

          <div>
            <label
              for="password"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Password <span class="text-gray-400 font-normal">(optional)</span>
            </label>
            <div class="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                on:input={(e) => (password = e.currentTarget.value)}
                class="input w-full pr-12"
                placeholder="Enter password (or leave empty)"
                disabled={$loading}
              />
              <button
                type="button"
                on:click={() => (showPassword = !showPassword)}
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
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
              Logging in...
            {:else}
              Log in
            {/if}
          </button>

          <button
            type="button"
            on:click={() => (selectedUsername = null)}
            class="w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          >
            ← Change member
          </button>
        </form>
      {:else}
        <!-- Member selection view -->
        <div class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Select who you are:</p>
          <div class="space-y-2">
            {#each familyMembers as member (member.id)}
              <button
                on:click={() => selectMember(member.username)}
                disabled={$loading}
                class="w-full p-4 bg-blue-50 dark:bg-blue-900 border-2 border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-lg transition text-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div class="text-lg font-semibold text-gray-900 dark:text-white">
                  👤 {member.displayName || member.username}
                </div>
              </button>
            {/each}
          </div>

          {#if $error}
            <div class="text-red-600 dark:text-red-400 text-sm text-center">
              {$error}
            </div>
          {/if}
        </div>
      {/if}

      <button
        on:click={goBack}
        class="w-full mt-4 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 underline"
      >
        ← Back to Family Selection
      </button>
    </div>
  </div>
</div>
