import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/dyson-co-anda-2x/' : '/',
  build: {
    rollupOptions: {
      input: {
        guide: resolve(import.meta.dirname, 'guia-visual.html'),
        landing: resolve(import.meta.dirname, 'index.html'),
        viewer: resolve(import.meta.dirname, 'viewer.html'),
      },
    },
  },
});
