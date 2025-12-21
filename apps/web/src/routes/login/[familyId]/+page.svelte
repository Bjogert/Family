<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { login, loading, error } from '$lib/stores/auth';

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

  $: if ($page.params.familyId) {
    familyId = parseInt($page.params.familyId, 10);
  }

  // Load family name and members when familyId is available
  $: if (familyId > 0 && !familyName) {
    loadFamilyInfo();
  }

  async function loadFamilyInfo() {
    try {
      const [familyRes, membersRes] = await Promise.all([
        fetch(`/api/families/${familyId}`),
        fetch(`/api/families/${familyId}/users`),
      ]);

      if (familyRes.ok) {
        const data = await familyRes.json();
        familyName = data.family.name;
      }

      if (membersRes.ok) {
        const data = await membersRes.json();
        familyMembers = data.users || [];
      }
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
    if (!password) {
      error.set('Password is required');
      return;
    }
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
              Password
            </label>
            <input
              type="password"
              id="password"
              bind:value={password}
              class="input w-full"
              placeholder="Enter password"
              disabled={$loading}
              required
            />
          </div>

          {#if $error}
            <div class="text-red-600 dark:text-red-400 text-sm text-center">
              {$error}
            </div>
          {/if}

          <button type="submit" class="btn-primary w-full" disabled={$loading || !password}>
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
