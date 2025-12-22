<script lang="ts">
  export let selected: string = '😊';

  const emojiCategories: Record<string, string[]> = {
    Ansikten: ['😊', '😀', '😃', '😄', '😁', '🙂', '😉', '😎', '🤓', '🤗', '😇', '🥰'],
    Djur: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸'],
    Aktiviteter: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎨', '🎮', '🎸', '🎹', '🎤', '🎧'],
    Mat: ['🍕', '🍔', '🍟', '🌭', '🍿', '🧁', '🍰', '🎂', '🍪', '🍩', '🍦', '🍎'],
    Natur: ['🌸', '🌺', '🌻', '🌷', '🌹', '🌼', '⭐', '✨', '🌈', '☀️', '🌙', '⚡'],
  };

  let selectedCategory = 'Ansikten';
</script>

<div class="emoji-picker">
  <!-- Category tabs - flex wrap to prevent overflow -->
  <div class="flex flex-wrap gap-2 mb-3 border-b border-orange-200 dark:border-stone-700 pb-2">
    {#each Object.keys(emojiCategories) as category}
      <button
        type="button"
        class="px-3 py-1 text-sm rounded-lg transition-colors whitespace-nowrap {selectedCategory === category
          ? 'bg-gradient-to-r from-orange-400 to-amber-400 text-white'
          : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'}"
        on:click={() => (selectedCategory = category)}
      >
        {category}
      </button>
    {/each}
  </div>

  <!-- Emoji grid - centered emojis -->
  <div class="grid grid-cols-6 gap-2">
    {#each emojiCategories[selectedCategory] as emoji}
      <button
        type="button"
        class="aspect-square flex items-center justify-center text-2xl rounded-lg transition-all {selected === emoji
          ? 'bg-gradient-to-r from-orange-300 to-amber-300 scale-110 ring-2 ring-orange-400'
          : 'bg-white dark:bg-stone-800 hover:bg-orange-100 dark:hover:bg-stone-700 hover:scale-105'} border border-orange-200 dark:border-stone-600"
        on:click={() => (selected = emoji)}
      >
        {emoji}
      </button>
    {/each}
  </div>
</div>

<style>
  .emoji-picker {
    padding: 1rem;
    background: white;
    border-radius: 0.75rem;
    border: 1px solid rgb(254 215 170); /* orange-200 */
  }

  :global(.dark) .emoji-picker {
    background: rgb(41 37 36); /* stone-800 */
    border-color: rgb(68 64 60); /* stone-700 */
  }
</style>
