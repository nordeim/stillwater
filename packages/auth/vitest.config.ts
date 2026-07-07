/**
 * Stillwater — packages/auth Vitest configuration
 *
 * Self-contained config for the @stillwater/auth package.
 * Excludes integration tests (*.integration.test.ts) from the default run.
 */

import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    pool: 'forks',
    exclude: [
      '**/node_modules/**',
      '**/.git/**',
      '**/*.integration.test.ts',
      '**/*.integration.test.tsx',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.integration.test.ts'],
    },
  },
  resolve: {
    alias: {
      '@stillwater/auth': resolve(__dirname, 'src'),
      '@stillwater/db': resolve(__dirname, '../db/src'),
      '@stillwater/config': resolve(__dirname, '../config/src'),
    },
  },
});
