import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.js',
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
