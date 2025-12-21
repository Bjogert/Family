import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Enable preprocessing for TypeScript and PostCSS
  preprocess: vitePreprocess(),

  kit: {
    // Node adapter for running on Raspberry Pi
    adapter: adapter({
      out: 'build',
    }),

    // Alias for cleaner imports
    alias: {
      $components: 'src/lib/components',
      $stores: 'src/lib/stores',
      $api: 'src/lib/api',
    },
  },
};

export default config;
