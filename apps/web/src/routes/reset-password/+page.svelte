<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { post } from '$lib/api/client';

  let newPassword = '';
  let confirmPassword = '';
  let loading = false;
  let success = false;
  let error = '';

  $: token = $page.url.searchParams.get('token') || '';

  async function handleSubmit() {
    error = '';

    if (!token) {
      error = 'Ogiltig återställningslänk';
      return;
    }

    if (!newPassword || newPassword.length < 4) {
      error = 'Lösenordet måste vara minst 4 tecken';
      return;
    }

    if (newPassword !== confirmPassword) {
      error = 'Lösenorden matchar inte';
      return;
    }

    loading = true;

    try {
      const response = await post<{ success: boolean; message?: string }>('/auth/reset-password', {
        token,
        newPassword,
      });

      if (response.success) {
        success = true;
      } else {
        error = response.message || 'Kunde inte återställa lösenordet';
      }
    } catch (err) {
      error = 'Något gick fel. Försök igen.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Återställ lösenord - Familjehubben</title>
</svelte:head>

<div
  class="min-h-screen bg-gradient-to-br from-violet-100 via-purple-50 to-fuchsia-100 flex items-center justify-center p-4"
>
  <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
    <div class="text-center mb-8">
      <div class="text-5xl mb-4">🔐</div>
      <h1 class="text-2xl font-bold text-gray-800">Välj nytt lösenord</h1>
    </div>

    {#if !token}
      <div class="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <div class="text-4xl mb-3">❌</div>
        <h2 class="text-lg font-semibold text-red-800 mb-2">Ogiltig länk</h2>
        <p class="text-red-700 text-sm">
          Återställningslänken saknas eller är felaktig. Begär en ny länk.
        </p>
      </div>
      <div class="mt-6 text-center">
        <a href="/forgot-password" class="text-violet-600 hover:text-violet-700 font-medium">
          Begär ny återställningslänk →
        </a>
      </div>
    {:else if success}
      <div class="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <div class="text-4xl mb-3">✅</div>
        <h2 class="text-lg font-semibold text-green-800 mb-2">Lösenordet har återställts!</h2>
        <p class="text-green-700 text-sm">Du kan nu logga in med ditt nya lösenord.</p>
      </div>
      <div class="mt-6 text-center">
        <a
          href="/"
          class="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 px-6 rounded-xl inline-block transition-colors"
        >
          Gå till inloggning
        </a>
      </div>
    {:else}
      <form on:submit|preventDefault={handleSubmit} class="space-y-6">
        {#if error}
          <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        {/if}

        <div>
          <label for="newPassword" class="block text-sm font-medium text-gray-700 mb-2">
            Nytt lösenord
          </label>
          <input
            type="password"
            id="newPassword"
            bind:value={newPassword}
            placeholder="Minst 4 tecken"
            class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all"
            disabled={loading}
          />
        </div>

        <div>
          <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-2">
            Bekräfta lösenord
          </label>
          <input
            type="password"
            id="confirmPassword"
            bind:value={confirmPassword}
            placeholder="Skriv lösenordet igen"
            class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          class="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
        >
          {#if loading}
            <span class="inline-flex items-center gap-2">
              <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                  fill="none"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Sparar...
            </span>
          {:else}
            Spara nytt lösenord
          {/if}
        </button>
      </form>

      <div class="mt-6 text-center text-sm text-gray-600">
        <a href="/" class="text-violet-600 hover:text-violet-700 font-medium">
          ← Tillbaka till inloggning
        </a>
      </div>
    {/if}
  </div>
</div>
