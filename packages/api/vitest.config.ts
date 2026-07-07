/**
 * Stillwater — packages/api Vitest configuration
 *
 * Self-contained config for the @stillwater/api package.
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
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@stillwater/api': resolve(__dirname, 'src'),
      '@stillwater/auth': resolve(__dirname, '../auth/src'),
      '@stillwater/db': resolve(__dirname, '../db/src'),
      '@stillwater/config': resolve(__dirname, '../config/src'),
    },
  },
});
