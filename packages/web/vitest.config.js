import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  // Note: Svelte plugin removed from test config due to compatibility issue
  // with @sveltejs/vite-plugin-svelte v6.x + Vitest
  // Phase 5.2b: Svelte component tests exist in tests/components but will be
  // tested manually via dev server until ecosystem stabilizes
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'tests/components/**', // Exclude Svelte component tests until plugin compatible
      'tests/e2e/**' // Exclude Playwright E2E tests (run separately)
    ],
    // Limit parallelism to reduce memory usage
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true  // Run tests in single process to prevent memory bloat
      }
    },
    // Limit concurrent tests
    maxConcurrency: 5,
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
