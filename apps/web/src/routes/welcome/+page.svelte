<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { get, post } from '$lib/api/client';

  let families: Array<{ id: number; name: string }> = [];
  let showCreateForm = false;
  let selectedFamilyId: number | null = null;
  let familyPassword = '';
  let showFamilyPassword = false;
  let newFamilyName = '';
  let newFamilyPassword = '';
  let showNewFamilyPassword = false;
  let newFamilyMembers: Array<{ username: string; password: string; displayName: string }> = [
    { username: '', password: '', displayName: '' },
  ];
  let showMemberPasswords: boolean[] = [];
  let loading = false;
  let error = '';
  let successMessage = '';

  onMount(async () => {
    await loadFamilies();
  });

  async function loadFamilies() {
    try {
      const data = await get<{ families: Array<{ id: number; name: string }> }>('/families');
      families = data.families || [];
    } catch (err) {
      error = 'Failed to load families';
    }
  }

  async function verifyAndProceed() {
    if (!selectedFamilyId || !familyPassword) {
      error = 'Please select a family and enter the password';
      return;
    }

    loading = true;
    error = '';

    try {
      const result = await post<{ success: boolean; valid: boolean }>(
        `/families/${selectedFamilyId}/verify-password`,
        { password: familyPassword }
      );

      if (result.valid) {
        goto(`/login/${selectedFamilyId}`);
      } else {
        error = 'Incorrect family password';
      }
    } catch (err) {
      error = 'Failed to verify password';
    } finally {
      loading = false;
    }
  }

  function addMemberField() {
    newFamilyMembers = [...newFamilyMembers, { username: '', password: '', displayName: '' }];
  }

  function removeMemberField(index: number) {
    newFamilyMembers = newFamilyMembers.filter((_, i) => i !== index);
  }

  async function createFamily() {
    if (!newFamilyName.trim()) {
      error = 'Family name is required';
      return;
    }

    if (!newFamilyPassword.trim()) {
      error = 'Family password is required';
      return;
    }

    // Validate at least one member with username
    const validMembers = newFamilyMembers.filter((m) => m.username.trim());
    if (validMembers.length === 0) {
      error = 'At least one family member is required';
      return;
    }

    loading = true;
    error = '';
    successMessage = '';

    try {
      // Create family first
      const familyData = await post<{ family: { id: number; name: string } }>('/families', {
        name: newFamilyName.trim(),
        password: newFamilyPassword,
      });

      // Then add all members
      for (const member of validMembers) {
        await post(`/families/${familyData.family.id}/users`, {
          username: member.username.trim(),
          password: member.password || undefined,
          displayName: member.displayName.trim() || member.username.trim(),
        });
      }

      successMessage = `Family "${familyData.family.name}" created successfully with ${validMembers.length} member(s)!`;
      newFamilyName = '';
      newFamilyPassword = '';
      newFamilyMembers = [{ username: '', password: '', displayName: '' }];
      showCreateForm = false;
      await loadFamilies();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'statusCode' in err && err.statusCode === 409) {
        error = 'A family with this name already exists';
      } else {
        error = 'Failed to create family';
      }
    } finally {
      loading = false;
    }
  }
</script>

<div
  class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4"
>
  <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
    <h1 class="text-4xl font-bold text-center text-gray-800 mb-2">Family Hub</h1>
    <p class="text-center text-gray-600 mb-8">Select or create your family</p>

    {#if successMessage}
      <div class="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
        {successMessage}
      </div>
    {/if}

    {#if error}
      <div class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
        {error}
      </div>
    {/if}

    {#if families.length > 0 && !showCreateForm}
      <form on:submit|preventDefault={verifyAndProceed} class="mb-8">
        <h2 class="text-lg font-semibold text-gray-700 mb-4">Select your family:</h2>
        <div class="space-y-3">
          <select
            bind:value={selectedFamilyId}
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900"
            disabled={loading}
          >
            <option value={null}>-- Select a family --</option>
            {#each families as family (family.id)}
              <option value={family.id}>👨‍👩‍👧‍👦 {family.name}</option>
            {/each}
          </select>

          <div class="relative">
            <input
              type={showFamilyPassword ? 'text' : 'password'}
              placeholder="Family password"
              value={familyPassword}
              on:input={(e) => (familyPassword = e.currentTarget.value)}
              class="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900"
              disabled={loading}
            />
            <button
              type="button"
              on:click={() => (showFamilyPassword = !showFamilyPassword)}
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {#if showFamilyPassword}
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

          <button
            type="submit"
            disabled={loading || !selectedFamilyId || !familyPassword}
            class="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Continue'}
          </button>
        </div>
      </form>
    {/if}

    <div class="mb-6">
      {#if !showCreateForm}
        <button
          on:click={() => {
            showCreateForm = true;
            error = '';
          }}
          class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition"
        >
          + Create New Family
        </button>
      {:else}
        <div class="space-y-4">
          <div>
            <label for="familyName" class="block text-sm font-medium text-gray-700 mb-1">
              Family Name
            </label>
            <input
              id="familyName"
              name="familyName"
              type="text"
              placeholder="e.g., Familjen Wiesel"
              bind:value={newFamilyName}
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900"
              disabled={loading}
            />
          </div>

          <div>
            <label for="familyPassword" class="block text-sm font-medium text-gray-700 mb-1">
              Family Password
            </label>
            <div class="relative">
              <input
                id="familyPassword"
                name="familyPassword"
                type={showNewFamilyPassword ? 'text' : 'password'}
                placeholder="Password for this family"
                value={newFamilyPassword}
                on:input={(e) => (newFamilyPassword = e.currentTarget.value)}
                class="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900"
                disabled={loading}
              />
              <button
                type="button"
                on:click={() => (showNewFamilyPassword = !showNewFamilyPassword)}
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {#if showNewFamilyPassword}
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

          <div class="border-t pt-4">
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-medium text-gray-700">Family Members</label>
              <button
                type="button"
                on:click={addMemberField}
                class="text-sm text-blue-600 hover:text-blue-700"
                disabled={loading}
              >
                + Add Member
              </button>
            </div>

            {#each newFamilyMembers as member, index (index)}
              <div class="mb-3 p-3 bg-gray-50 rounded-lg">
                <div class="flex justify-between items-center mb-2">
                  <span class="text-sm font-medium text-gray-600">Member {index + 1}</span>
                  {#if newFamilyMembers.length > 1}
                    <button
                      type="button"
                      on:click={() => removeMemberField(index)}
                      class="text-red-600 hover:text-red-700 text-sm"
                      disabled={loading}
                    >
                      Remove
                    </button>
                  {/if}
                </div>
                <div class="space-y-2">
                  <input
                    type="text"
                    placeholder="Username (required)"
                    bind:value={member.username}
                    class="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500 text-gray-900"
                    disabled={loading}
                  />
                  <div class="relative">
                    <input
                      type={showMemberPasswords[index] ? 'text' : 'password'}
                      placeholder="Password (optional)"
                      value={member.password}
                      on:input={(e) => (member.password = e.currentTarget.value)}
                      class="w-full px-3 py-2 pr-10 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500 text-gray-900"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      on:click={() => (showMemberPasswords[index] = !showMemberPasswords[index])}
                      class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {#if showMemberPasswords[index]}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke-width="1.5"
                          stroke="currentColor"
                          class="w-4 h-4"
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
                          class="w-4 h-4"
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
                  <input
                    type="text"
                    placeholder="Display Name (optional)"
                    bind:value={member.displayName}
                    class="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500 text-gray-900"
                    disabled={loading}
                  />
                </div>
              </div>
            {/each}
          </div>

          <div class="flex gap-2">
            <button
              on:click={createFamily}
              disabled={loading || !newFamilyName.trim() || !newFamilyPassword.trim()}
              class="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
            <button
              on:click={() => {
                showCreateForm = false;
                error = '';
                newFamilyName = '';
                newFamilyPassword = '';
                newFamilyMembers = [{ username: '', password: '', displayName: '' }];
              }}
              disabled={loading}
              class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 rounded-lg transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      {/if}
    </div>

    <p class="text-center text-gray-500 text-sm">
      Enter your family name and password to continue to member login.
    </p>
  </div>
</div>
