import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/pokemini/',
  resolve: {
    alias: {
      '#': resolve(__dirname, './src'),
    },
  },
});