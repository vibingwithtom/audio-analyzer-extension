import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  // Note: Svelte plugin removed from test config due to compatibility issue
  // with @sveltejs/vite-plugin-svelte v6.x + Vitest
  // Svelte component testing will be added once ecosystem stabilizes
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.js',
        '**/*.test.ts',
        '**/*.spec.js'
      ]
    }
  },
  resolve: {
    alias: {
      '@audio-analyzer/core': path.resolve(__dirname, '../core')
    }
  }
});
