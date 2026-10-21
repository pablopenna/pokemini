import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  base: '/pokemini/',
  resolve: {
    alias: {
      '#': resolve(import.meta.dirname, './src'),
    },
    conditions: ['browser', 'svelte', 'module'],
  },
  define: {
    global: 'globalThis',
  },
  plugins: [
    svelte()
  ],
});