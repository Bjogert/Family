<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { get, post } from '$lib/api/client';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import EmojiPicker from '$lib/components/EmojiPicker.svelte';
  import ColorPicker from '$lib/components/ColorPicker.svelte';

  interface FamilyMember {
    name: string;
    password: string;
    passwordConfirm: string;
    displayName: string;
    role: string;
    birthday: string;
    gender: string;
    avatarEmoji: string;
    color: string;
    showPassword: boolean;
    showPasswordFields: boolean;
    showEmojiPicker: boolean;
    showColorPicker: boolean;
  }

  const defaultMember = (): FamilyMember => ({
    name: '',
    password: '',
    passwordConfirm: '',
    displayName: '',
    role: '',
    birthday: '',
    gender: '',
    avatarEmoji: '😊',
    color: 'orange',
    showPassword: false,
    showPasswordFields: false,
    showEmojiPicker: false,
    showColorPicker: false,
  });

  const roleNicknames: Record<string, string[]> = {
    pappa: ['Pappa', 'Far', 'Farsan', 'Papa', 'Paps'],
    mamma: ['Mamma', 'Mor', 'Morsan', 'Mama', 'Mams'],
  };

  let families: Array<{ id: number; name: string }> = [];
  let showCreateForm = false;
  let selectedFamilyId: number | null = null;
  let familyPassword = '';
  let showFamilyPassword = false;
  let newFamilyName = '';
  let newFamilyPassword = '';
  let newFamilyPasswordConfirm = '';
  let showNewFamilyPassword = false;
  let showNewFamilyPasswordConfirm = false;
  // Autocomplete for family selection
  let familySearchText = '';
  let showFamilySuggestions = false;
  // Saved members (completed) and current member being edited
  let savedMembers: FamilyMember[] = [];
  let currentMember: FamilyMember = defaultMember();
  let loading = false;
  let loadingFamilies = true;
  let error = '';
  let successMessage = '';

  onMount(async () => {
    await loadFamilies();
  });

  async function loadFamilies() {
    loadingFamilies = true;
    try {
      const data = await get<{ families: Array<{ id: number; name: string }> }>('/families');
      families = data.families || [];
    } catch (err) {
      error = 'Failed to load families';
    } finally {
      loadingFamilies = false;
    }
  }

  // Reactive filtered families for autocomplete
  $: filteredFamilies = familySearchText.trim()
    ? families.filter((f) =>
        f.name.toLowerCase().startsWith(familySearchText.toLowerCase())
      )
    : families;

  function selectFamily(family: { id: number; name: string }) {
    selectedFamilyId = family.id;
    familySearchText = family.name;
    showFamilySuggestions = false;
  }

  function handleFamilyInput(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    familySearchText = input.value;
    showFamilySuggestions = true;
    
    // Auto-select if exact match (case insensitive)
    const exactMatch = families.find(
      (f) => f.name.toLowerCase() === familySearchText.toLowerCase()
    );
    if (exactMatch) {
      selectedFamilyId = exactMatch.id;
    } else {
      selectedFamilyId = null;
    }
  }

  function handleFamilyBlur() {
    // Delay to allow click on suggestion
    setTimeout(() => {
      showFamilySuggestions = false;
    }, 200);
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

  function addMember() {
    // Validate current member
    if (!currentMember.name.trim()) {
      error = 'Förnamn krävs';
      return;
    }
    if (currentMember.password && currentMember.password !== currentMember.passwordConfirm) {
      error = 'Lösenorden matchar inte';
      return;
    }
    error = '';
    // Save current member to saved list
    savedMembers = [...savedMembers, { ...currentMember }];
    // Reset form for next member
    currentMember = defaultMember();
  }

  function removeSavedMember(index: number) {
    savedMembers = savedMembers.filter((_, i) => i !== index);
  }

  function editSavedMember(index: number) {
    // Move saved member back to current form for editing
    currentMember = { ...savedMembers[index] };
    savedMembers = savedMembers.filter((_, i) => i !== index);
  }

  function togglePasswordField() {
    currentMember.showPasswordFields = !currentMember.showPasswordFields;
    // If hiding and password is empty, clear it
    if (!currentMember.showPasswordFields && !currentMember.password) {
      currentMember.password = '';
      currentMember.passwordConfirm = '';
    }
  }

  function getDisplayNameForRole(member: FamilyMember): string {
    if (member.displayName) return member.displayName;
    if (member.role === 'pappa') return 'Pappa';
    if (member.role === 'mamma') return 'Mamma';
    return member.name;
  }

  async function createFamily() {
    if (!newFamilyName.trim()) {
      error = 'Familjenamn krävs';
      return;
    }

    if (!newFamilyPassword.trim()) {
      error = 'Familjens lösenord krävs';
      return;
    }

    if (newFamilyPassword !== newFamilyPasswordConfirm) {
      error = 'Lösenorden matchar inte';
      return;
    }

    // Check if there are saved members
    if (savedMembers.length === 0) {
      error = 'Minst en familjemedlem krävs. Klicka "Lägg till" för att spara medlemmen.';
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

      // Then add all saved members
      for (const member of savedMembers) {
        await post(`/families/${familyData.family.id}/users`, {
          username: member.name.trim().toLowerCase().replace(/\s+/g, ''),
          password: member.password || undefined,
          displayName: getDisplayNameForRole(member),
          role: member.role || undefined,
          birthday: member.birthday || undefined,
          gender: member.gender || undefined,
          avatarEmoji: member.avatarEmoji || undefined,
          color: member.color || undefined,
        });
      }

      successMessage = `Familjen "${familyData.family.name}" skapades med ${savedMembers.length} medlem(mar)!`;
      newFamilyName = '';
      newFamilyPassword = '';
      newFamilyPasswordConfirm = '';
      savedMembers = [];
      currentMember = defaultMember();
      showCreateForm = false;
      await loadFamilies();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'statusCode' in err && err.statusCode === 409) {
        error = 'En familj med detta namn finns redan';
      } else {
        error = 'Kunde inte skapa familjen';
      }
    } finally {
      loading = false;
    }
  }
</script>

<div
  class="min-h-screen bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 dark:from-stone-900 dark:via-stone-800 dark:to-stone-900 flex items-center justify-center p-4"
>
  <div
    class="bg-white/90 dark:bg-stone-800/90 backdrop-blur-lg rounded-2xl shadow-2xl max-w-md w-full p-8 border border-orange-200 dark:border-stone-700"
  >
    <h1
      class="text-4xl font-bold text-center bg-gradient-to-r from-orange-400 to-amber-400 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent mb-2"
    >
      Family Hub
    </h1>
    <p class="text-center text-stone-600 dark:text-stone-400 mb-8">Select or create your family</p>

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

    {#if loadingFamilies}
      <div class="py-8">
        <LoadingSpinner size="lg" text="Loading families..." />
      </div>
    {:else if families.length > 0 && !showCreateForm}
      <form on:submit|preventDefault={verifyAndProceed} class="mb-8">
        <h2 class="text-lg font-semibold text-stone-700 dark:text-stone-300 mb-4">
          Select your family:
        </h2>
        <div class="space-y-3">
          <!-- Autocomplete family input -->
          <div class="relative">
            <div class="absolute left-3 top-1/2 -translate-y-1/2 text-lg">👨‍👩‍👧‍👦</div>
            <input
              type="text"
              placeholder="Type family name..."
              value={familySearchText}
              on:input={handleFamilyInput}
              on:focus={() => (showFamilySuggestions = true)}
              on:blur={handleFamilyBlur}
              class="w-full pl-10 pr-4 py-3 border border-orange-200 dark:border-stone-600 bg-white dark:bg-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 dark:focus:ring-amber-500 text-stone-900 dark:text-white"
              disabled={loading}
            />
            {#if showFamilySuggestions && filteredFamilies.length > 0}
              <div class="absolute z-10 w-full mt-1 bg-white dark:bg-stone-700 border border-orange-200 dark:border-stone-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {#each filteredFamilies as family (family.id)}
                  <button
                    type="button"
                    on:click={() => selectFamily(family)}
                    class="w-full text-left px-4 py-2 hover:bg-orange-100 dark:hover:bg-stone-600 text-stone-900 dark:text-white flex items-center gap-2"
                  >
                    <span>👨‍👩‍👧‍👦</span>
                    <span>{family.name}</span>
                  </button>
                {/each}
              </div>
            {/if}
          </div>

          <div class="relative">
            <input
              type={showFamilyPassword ? 'text' : 'password'}
              placeholder="Family password"
              value={familyPassword}
              on:input={(e) => (familyPassword = e.currentTarget.value)}
              class="w-full px-4 py-3 pr-12 border border-orange-200 dark:border-stone-600 bg-white dark:bg-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 dark:focus:ring-amber-500 text-stone-900 dark:text-white"
              disabled={loading}
            />
            <button
              type="button"
              on:click={() => (showFamilyPassword = !showFamilyPassword)}
              class="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300"
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
            class="w-full bg-gradient-to-br from-orange-400 to-amber-400 hover:from-orange-500 hover:to-amber-500 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
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
          class="w-full bg-gradient-to-br from-orange-400 to-amber-400 hover:from-orange-500 hover:to-amber-500 text-white font-bold py-3 rounded-lg transition shadow-md"
        >
          + Create New Family
        </button>
      {:else}
        <div class="space-y-4">
          <div>
            <label
              for="familyName"
              class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1"
            >
              Family Name
            </label>
            <input
              id="familyName"
              name="familyName"
              type="text"
              placeholder="e.g., Familjen Wiesel"
              bind:value={newFamilyName}
              class="w-full px-4 py-2 border border-orange-200 dark:border-stone-600 bg-white dark:bg-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 dark:focus:ring-amber-500 text-stone-900 dark:text-white"
              disabled={loading}
            />
          </div>

          <div>
            <label
              for="familyPassword"
              class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1"
            >
              Familjens Lösenord
            </label>
            <div class="relative">
              <input
                id="familyPassword"
                name="familyPassword"
                type={showNewFamilyPassword ? 'text' : 'password'}
                placeholder="Lösenord för familjen"
                value={newFamilyPassword}
                on:input={(e) => (newFamilyPassword = e.currentTarget.value)}
                class="w-full px-4 py-2 pr-12 border border-orange-200 dark:border-stone-600 bg-white dark:bg-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 dark:focus:ring-amber-500 text-stone-900 dark:text-white"
                disabled={loading}
              />
              <button
                type="button"
                on:click={() => (showNewFamilyPassword = !showNewFamilyPassword)}
                class="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300"
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

          <!-- Password Confirmation -->
          <div>
            <label
              for="familyPasswordConfirm"
              class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1"
            >
              Bekräfta Lösenord
            </label>
            <div class="relative">
              <input
                id="familyPasswordConfirm"
                name="familyPasswordConfirm"
                type={showNewFamilyPasswordConfirm ? 'text' : 'password'}
                placeholder="Upprepa lösenordet"
                value={newFamilyPasswordConfirm}
                on:input={(e) => (newFamilyPasswordConfirm = e.currentTarget.value)}
                class="w-full px-4 py-2 pr-12 border {newFamilyPassword &&
                newFamilyPasswordConfirm &&
                newFamilyPassword !== newFamilyPasswordConfirm
                  ? 'border-red-400'
                  : 'border-orange-200'} dark:border-stone-600 bg-white dark:bg-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 dark:focus:ring-amber-500 text-stone-900 dark:text-white"
                disabled={loading}
              />
              <button
                type="button"
                on:click={() => (showNewFamilyPasswordConfirm = !showNewFamilyPasswordConfirm)}
                class="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300"
              >
                {#if showNewFamilyPasswordConfirm}
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
            {#if newFamilyPassword && newFamilyPasswordConfirm && newFamilyPassword !== newFamilyPasswordConfirm}
              <p class="text-red-500 text-sm mt-1">Lösenorden matchar inte</p>
            {/if}
          </div>

          <div class="border-t border-orange-200 dark:border-stone-600 pt-4">
            <!-- svelte-ignore a11y-label-has-associated-control -->
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-3"
              >Familjemedlemmar {#if savedMembers.length > 0}<span class="text-orange-500">({savedMembers.length} sparad{savedMembers.length > 1 ? 'e' : ''})</span>{/if}</label
            >

            <!-- Saved members displayed as compact cards -->
            {#if savedMembers.length > 0}
              <div class="space-y-2 mb-4">
                {#each savedMembers as member, index (index)}
                  <div
                    class="flex items-center justify-between p-3 rounded-lg border-2"
                    style="background-color: {member.color === 'orange'
                      ? '#fff7ed'
                      : member.color === 'amber'
                        ? '#fffbeb'
                        : member.color === 'rose'
                          ? '#fff1f2'
                          : member.color === 'green'
                            ? '#f0fdf4'
                            : member.color === 'blue'
                              ? '#eff6ff'
                              : member.color === 'purple'
                                ? '#faf5ff'
                                : '#fafaf9'}; border-color: {member.color === 'orange'
                      ? '#fb923c'
                      : member.color === 'amber'
                        ? '#fbbf24'
                        : member.color === 'rose'
                          ? '#fb7185'
                          : member.color === 'green'
                            ? '#4ade80'
                            : member.color === 'blue'
                              ? '#60a5fa'
                              : member.color === 'purple'
                                ? '#c084fc'
                                : '#a8a29e'}"
                  >
                    <div class="flex items-center gap-3">
                      <span class="text-2xl">{member.avatarEmoji}</span>
                      <div>
                        <span class="font-medium text-stone-800">{member.name}</span>
                        {#if member.role}
                          <span class="text-stone-500 text-sm ml-2">
                            ({member.role === 'pappa' ? '👨 Pappa' : member.role === 'mamma' ? '👩 Mamma' : member.role === 'barn' ? '🧒 Barn' : member.role === 'bebis' ? '👶 Bebis' : '🙂 Annan'})
                          </span>
                        {/if}
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        on:click={() => editSavedMember(index)}
                        class="text-orange-500 hover:text-orange-600 text-sm font-medium"
                        disabled={loading}
                      >
                        ✏️ Ändra
                      </button>
                      <button
                        type="button"
                        on:click={() => removeSavedMember(index)}
                        class="text-red-500 hover:text-red-600 text-sm font-medium"
                        disabled={loading}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}

            <!-- Current member form -->
            <div
              class="mb-4 p-5 bg-orange-50 dark:bg-stone-700/50 rounded-xl border border-orange-100 dark:border-stone-600 shadow-sm"
            >
              <div class="flex justify-between items-center mb-4">
                <span
                  class="text-sm font-medium text-stone-700 dark:text-stone-300 flex items-center gap-2"
                >
                  <span class="text-2xl">{currentMember.avatarEmoji || '😊'}</span>
                  <span>{savedMembers.length === 0 ? 'Första medlemmen' : 'Ny medlem'}</span>
                </span>
              </div>

              <div class="space-y-4">
                <!-- Name - full width -->
                <input
                  type="text"
                  placeholder="Förnamn *"
                  bind:value={currentMember.name}
                  class="w-full px-4 py-3 border border-orange-200 dark:border-stone-600 bg-white dark:bg-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 dark:focus:ring-amber-500 text-stone-900 dark:text-white"
                  disabled={loading}
                />

                <!-- Role - full width -->
                <select
                  bind:value={currentMember.role}
                  class="w-full px-4 py-3 border border-orange-200 dark:border-stone-600 bg-white dark:bg-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 dark:focus:ring-amber-500 text-stone-900 dark:text-white"
                  disabled={loading}
                >
                  <option value="">Välj roll...</option>
                  <option value="pappa">👨 Pappa</option>
                  <option value="mamma">👩 Mamma</option>
                  <option value="barn">🧒 Barn</option>
                  <option value="bebis">👶 Bebis</option>
                  <option value="annan">🙂 Annan</option>
                </select>

                <!-- Avatar & Color - inline compact with separate toggles -->
                <div
                  class="flex items-center gap-4 p-3 bg-white dark:bg-stone-800 rounded-lg border border-orange-100 dark:border-stone-700"
                >
                  <button
                    type="button"
                    on:click={() => {
                      currentMember.showEmojiPicker = !currentMember.showEmojiPicker;
                      currentMember.showColorPicker = false;
                    }}
                    class="text-3xl p-2 bg-orange-50 dark:bg-stone-700 rounded-lg border-2 {currentMember.showEmojiPicker
                      ? 'border-orange-400'
                      : 'border-transparent'} hover:border-orange-300 transition-colors"
                    title="Välj avatar"
                  >
                    {currentMember.avatarEmoji || '😊'}
                  </button>
                  <button
                    type="button"
                    on:click={() => {
                      currentMember.showColorPicker = !currentMember.showColorPicker;
                      currentMember.showEmojiPicker = false;
                    }}
                    class="w-12 h-12 rounded-full border-4 {currentMember.showColorPicker
                      ? 'border-stone-800 dark:border-white'
                      : 'border-stone-300 dark:border-stone-600'} hover:border-stone-400 transition-colors shadow-sm"
                    style="background-color: {currentMember.color === 'orange'
                      ? '#fb923c'
                      : currentMember.color === 'amber'
                        ? '#fbbf24'
                        : currentMember.color === 'rose'
                          ? '#fb7185'
                          : currentMember.color === 'green'
                            ? '#4ade80'
                            : currentMember.color === 'blue'
                              ? '#60a5fa'
                              : currentMember.color === 'purple'
                                ? '#c084fc'
                                : '#a8a29e'}"
                    title="Välj färg"
                  ></button>
                  <span class="text-xs text-stone-400 ml-auto">Tryck för att ändra</span>
                </div>

                <!-- Emoji Picker (shown when avatar is clicked) -->
                {#if currentMember.showEmojiPicker}
                  <div
                    class="p-4 bg-white dark:bg-stone-800 rounded-lg border border-orange-200 dark:border-stone-700"
                  >
                    <EmojiPicker bind:selected={currentMember.avatarEmoji} />
                  </div>
                {/if}

                <!-- Color Picker (shown when color is clicked) -->
                {#if currentMember.showColorPicker}
                  <div
                    class="p-4 bg-white dark:bg-stone-800 rounded-lg border border-orange-200 dark:border-stone-700"
                  >
                    <ColorPicker bind:selected={currentMember.color} />
                  </div>
                {/if}

                <!-- Birthday & Gender Row (gender only for children) -->
                <div
                  class="grid {currentMember.role === 'barn' || currentMember.role === 'bebis'
                    ? 'grid-cols-2'
                    : 'grid-cols-1'} gap-3"
                >
                  <div>
                    <!-- svelte-ignore a11y-label-has-associated-control -->
                    <label class="block text-xs text-stone-500 dark:text-stone-400 mb-1"
                      >Födelsedag</label
                    >
                    <input
                      type="date"
                      bind:value={currentMember.birthday}
                      class="w-full px-4 py-3 border border-orange-200 dark:border-stone-600 bg-white dark:bg-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 dark:focus:ring-amber-500 text-stone-900 dark:text-white"
                      disabled={loading}
                    />
                  </div>
                  {#if currentMember.role === 'barn' || currentMember.role === 'bebis'}
                    <div>
                      <!-- svelte-ignore a11y-label-has-associated-control -->
                      <label class="block text-xs text-stone-500 dark:text-stone-400 mb-1"
                        >Kön</label
                      >
                      <select
                        bind:value={currentMember.gender}
                        class="w-full px-4 py-3 border border-orange-200 dark:border-stone-600 bg-white dark:bg-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 dark:focus:ring-amber-500 text-stone-900 dark:text-white"
                        disabled={loading}
                      >
                        <option value="">Välj...</option>
                        <option value="pojke">👦 Pojke</option>
                        <option value="flicka">👧 Flicka</option>
                        <option value="annat">🧒 Annat</option>
                      </select>
                    </div>
                  {/if}
                </div>

                <!-- Nickname (for parents) -->
                {#if currentMember.role === 'pappa' || currentMember.role === 'mamma'}
                  <div>
                    <!-- svelte-ignore a11y-label-has-associated-control -->
                    <label class="block text-xs text-stone-500 dark:text-stone-400 mb-1"
                      >Smeknamn (visas istället för förnamn)</label
                    >
                    <select
                      bind:value={currentMember.displayName}
                      class="w-full px-4 py-3 border border-orange-200 dark:border-stone-600 bg-white dark:bg-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 dark:focus:ring-amber-500 text-stone-900 dark:text-white"
                      disabled={loading}
                    >
                      <option value="">Använd förnamn</option>
                      {#each roleNicknames[currentMember.role] || [] as nickname}
                        <option value={nickname}>{nickname}</option>
                      {/each}
                    </select>
                  </div>
                {/if}

                <!-- Password field - hidden by default -->
                {#if currentMember.showPasswordFields}
                  <div
                    class="space-y-3 pt-4 mt-2 border-t border-orange-200 dark:border-stone-600"
                  >
                    <div class="relative">
                      <input
                        type={currentMember.showPassword ? 'text' : 'password'}
                        placeholder="Lösenord"
                        value={currentMember.password}
                        on:input={(e) => (currentMember.password = e.currentTarget.value)}
                        class="w-full px-4 py-3 pr-12 border border-orange-200 dark:border-stone-600 bg-white dark:bg-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 dark:focus:ring-amber-500 text-stone-900 dark:text-white"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        on:click={() => (currentMember.showPassword = !currentMember.showPassword)}
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300"
                      >
                        {#if currentMember.showPassword}
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
                    <input
                      type={currentMember.showPassword ? 'text' : 'password'}
                      placeholder="Bekräfta lösenord"
                      value={currentMember.passwordConfirm}
                      on:input={(e) => (currentMember.passwordConfirm = e.currentTarget.value)}
                      class="w-full px-4 py-3 border {currentMember.password &&
                      currentMember.passwordConfirm &&
                      currentMember.password !== currentMember.passwordConfirm
                        ? 'border-red-400'
                        : 'border-orange-200'} dark:border-stone-600 bg-white dark:bg-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 dark:focus:ring-amber-500 text-stone-900 dark:text-white"
                      disabled={loading}
                    />
                    {#if currentMember.password && currentMember.passwordConfirm && currentMember.password !== currentMember.passwordConfirm}
                      <p class="text-red-500 text-sm">Lösenorden matchar inte</p>
                    {/if}
                    <button
                      type="button"
                      on:click={togglePasswordField}
                      class="text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300"
                      disabled={loading}
                    >
                      🔓 Ta bort lösenord
                    </button>
                  </div>
                {:else}
                  <button
                    type="button"
                    on:click={togglePasswordField}
                    class="text-sm text-orange-500 hover:text-orange-600 dark:text-amber-400 dark:hover:text-amber-500 font-medium pt-3"
                    disabled={loading}
                  >
                    🔒 Lägg till lösenord (valfritt)
                  </button>
                {/if}

                <!-- Add member button -->
                <button
                  type="button"
                  on:click={addMember}
                  disabled={loading || !currentMember.name.trim()}
                  class="w-full mt-2 bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-500 hover:to-amber-500 text-white font-bold py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  ➕ Lägg till medlem
                </button>
              </div>
            </div>
          </div>

          <div class="flex gap-3 mt-2">
            <button
              on:click={createFamily}
              disabled={loading || !newFamilyName.trim() || !newFamilyPassword.trim() || savedMembers.length === 0}
              class="flex-1 bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {loading ? 'Skapar...' : `Skapa familj (${savedMembers.length} medlem${savedMembers.length !== 1 ? 'mar' : ''})`}
            </button>
            <button
              on:click={() => {
                showCreateForm = false;
                error = '';
                newFamilyName = '';
                newFamilyPassword = '';
                newFamilyPasswordConfirm = '';
                savedMembers = [];
                currentMember = defaultMember();
              }}
              disabled={loading}
              class="flex-1 bg-stone-200 hover:bg-stone-300 dark:bg-stone-600 dark:hover:bg-stone-500 text-stone-800 dark:text-white font-bold py-2 rounded-lg transition disabled:opacity-50"
            >
              Avbryt
            </button>
          </div>
        </div>
      {/if}
    </div>

    <p class="text-center text-stone-500 dark:text-stone-400 text-sm">
      Ange familjens namn och lösenord för att fortsätta till inloggningen.
    </p>
  </div>
</div>
