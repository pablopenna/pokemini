import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/pokemini/',
  resolve: {
    alias: {
      '#': resolve(import.meta.dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
  },
});