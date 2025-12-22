<script lang="ts">
  export let selected: string = 'orange';

  const colors = [
    { name: 'orange', hex: '#fb923c', label: 'Orange' },
    { name: 'amber', hex: '#fbbf24', label: 'Gul' },
    { name: 'rose', hex: '#fb7185', label: 'Rosa' },
    { name: 'green', hex: '#4ade80', label: 'Grön' },
    { name: 'blue', hex: '#60a5fa', label: 'Blå' },
    { name: 'purple', hex: '#c084fc', label: 'Lila' },
    { name: 'stone', hex: '#a8a29e', label: 'Grå' },
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
