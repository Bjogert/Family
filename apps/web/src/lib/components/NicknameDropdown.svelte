<script lang="ts">
  import { t, currentLanguage } from '$lib/i18n';

  export let role: string = '';
  export let value: string = '';

  // Define nicknames per role per language
  const roleNicknames: Record<string, Record<string, string[]>> = {
    sv: {
      pappa: ['Far', 'Pappa', 'Farsan', 'Papa', 'Paps', 'Annan...'],
      mamma: ['Mor', 'Mamma', 'Morsan', 'Mama', 'Mams', 'Annan...'],
    },
    en: {
      pappa: ['Father', 'Dad', 'Daddy', 'Papa', 'Pops', 'Other...'],
      mamma: ['Mother', 'Mom', 'Mommy', 'Mama', 'Mum', 'Other...'],
    },
    pt: {
      pappa: ['Pai', 'Papai', 'Paizinho', 'Papa', 'Papi', 'Outro...'],
      mamma: ['Mãe', 'Mamãe', 'Mãezinha', 'Mama', 'Mami', 'Outro...'],
    },
  };

  let isCustom = false;
  let selectedNickname = '';

  $: nicknames = roleNicknames[$currentLanguage] || roleNicknames.sv;
  $: otherText = $t('nickname.other');

  $: {
    if (role === 'pappa' || role === 'mamma') {
      const options = nicknames[role] || [];
      if (!options.includes(value) && value !== '') {
        isCustom = true;
        selectedNickname = otherText;
      } else {
        isCustom = false;
        selectedNickname = value;
      }
    }
  }

  function handleNicknameChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    if (select.value === otherText) {
      isCustom = true;
      value = '';
    } else {
      isCustom = false;
      value = select.value;
    }
  }
</script>

{#if role === 'pappa' || role === 'mamma'}
  {#if !isCustom}
    <select
      class="w-full px-4 py-2 rounded-lg border border-orange-200 dark:border-stone-700 bg-white dark:bg-stone-700 text-stone-800 dark:text-white focus:outline-none focus:border-orange-400 transition-colors"
      bind:value={selectedNickname}
      on:change={handleNicknameChange}
    >
      <option value="">{$t('nickname.selectNickname')}</option>
      {#each nicknames[role] || [] as nickname}
        <option value={nickname}>{nickname}</option>
      {/each}
    </select>
  {:else}
    <div class="flex gap-2">
      <input
        type="text"
        class="flex-1 px-4 py-2 rounded-lg border border-orange-200 dark:border-stone-700 bg-white dark:bg-stone-700 text-stone-800 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:border-orange-400 transition-colors"
        placeholder={$t('nickname.writeNickname')}
        bind:value
      />
      <button
        type="button"
        class="px-4 py-2 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
        on:click={() => {
          isCustom = false;
          value = '';
        }}
      >
        {$t('nickname.back')}
      </button>
    </div>
  {/if}
{:else}
  <input
    type="text"
    class="w-full px-4 py-2 rounded-lg border border-orange-200 dark:border-stone-700 bg-white dark:bg-stone-700 text-stone-800 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:border-orange-400 transition-colors"
    placeholder={$t('nickname.nicknameOptional')}
    bind:value
  />
{/if}
