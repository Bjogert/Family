<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { get, post } from '$lib/api/client';

  let families: Array<{ id: number; name: string }> = [];
  let showCreateForm = false;
  let newFamilyName = '';
  let selectedFamilyId: number | null = null;
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

  async function createFamily() {
    if (!newFamilyName.trim()) {
      error = 'Family name is required';
      return;
    }

    loading = true;
    error = '';
    successMessage = '';

    try {
      const data = await post<{ family: { id: number; name: string } }>('/families', {
        name: newFamilyName.trim(),
      });
      successMessage = `Family "${data.family.name}" created successfully!`;
      newFamilyName = '';
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

  function selectFamily(familyId: number) {
    selectedFamilyId = familyId;
    const selected = families.find((f) => f.id === familyId);
    if (selected) {
      goto(`/login/${familyId}`);
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

    {#if families.length > 0}
      <div class="mb-8">
        <h2 class="text-lg font-semibold text-gray-700 mb-4">Select your family:</h2>
        <div class="space-y-2">
          {#each families as family (family.id)}
            <button
              on:click={() => selectFamily(family.id)}
              disabled={loading}
              class="w-full p-3 bg-indigo-50 border-2 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-100 rounded-lg transition text-left font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              👨‍👩‍👧‍👦 {family.name}
            </button>
          {/each}
        </div>
      </div>
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
          <input
            id="familyName"
            name="familyName"
            type="text"
            placeholder="Family name (e.g., Familjen Wiesel)"
            bind:value={newFamilyName}
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            disabled={loading}
          />
          <div class="flex gap-2">
            <button
              on:click={createFamily}
              disabled={loading || !newFamilyName.trim()}
              class="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
            <button
              on:click={() => {
                showCreateForm = false;
                error = '';
                newFamilyName = '';
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
      Once you select a family, you'll be able to log in with your family members.
    </p>
  </div>
</div>
