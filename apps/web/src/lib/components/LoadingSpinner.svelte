<script lang="ts">
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let text = '';

  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };
</script>

<div class="flex flex-col items-center justify-center gap-3">
  <div
    class="{sizes[
      size
    ]} border-4 border-orange-200 border-t-orange-500 dark:border-amber-300 dark:border-t-amber-500 rounded-full animate-spin"
  ></div>
  {#if text}
    <p class="text-stone-600 dark:text-stone-400 text-sm">{text}</p>
  {/if}
</div>
