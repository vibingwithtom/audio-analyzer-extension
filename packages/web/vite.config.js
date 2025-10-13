import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [svelte()],
  root: '.',
  publicDir: 'public',
  base: mode === 'beta' ? '/beta/' : '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020'
  },
  server: {
    port: 3000,
    open: true
  },
  resolve: {
    alias: {
      '@audio-analyzer/core': path.resolve(__dirname, '../core')
    }
  },
  optimizeDeps: {
    exclude: ['@audio-analyzer/core']
  }
}));