<script lang="ts">
  import { t } from '$lib/i18n';

  export let selected: string = 'orange';

  let colors: Array<{ name: string; hex: string; label: string }> = [];

  $: colors = [
    { name: 'orange', hex: '#fb923c', label: $t('color.orange') },
    { name: 'amber', hex: '#fbbf24', label: $t('color.amber') },
    { name: 'rose', hex: '#fb7185', label: $t('color.rose') },
    { name: 'green', hex: '#4ade80', label: $t('color.green') },
    { name: 'blue', hex: '#60a5fa', label: $t('color.blue') },
    { name: 'purple', hex: '#c084fc', label: $t('color.purple') },
    { name: 'stone', hex: '#a8a29e', label: $t('color.stone') },
  ];
</script>

<div class="color-picker">
  <div class="grid grid-cols-7 gap-3">
    {#each colors as color}
      <button
        type="button"
        class="flex flex-col items-center gap-1 transition-transform {selected === color.name
          ? 'scale-110'
          : 'hover:scale-105'}"
        on:click={() => (selected = color.name)}
      >
        <div
          class="w-12 h-12 rounded-full border-4 transition-all {selected === color.name
            ? 'border-stone-800 dark:border-white shadow-lg'
            : 'border-stone-300 dark:border-stone-600 hover:border-stone-400'}"
          style="background-color: {color.hex}"
        ></div>
        <span
          class="text-xs {selected === color.name
            ? 'text-stone-800 dark:text-white font-semibold'
            : 'text-stone-600 dark:text-stone-400'}"
        >
          {color.label}
        </span>
      </button>
    {/each}
  </div>
</div>

<style>
  .color-picker {
    padding: 1rem;
  }
</style>
