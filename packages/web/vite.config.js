import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => ({
  root: '.',
  publicDir: 'public',
  base: mode === 'beta' ? '/beta/' : '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true
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