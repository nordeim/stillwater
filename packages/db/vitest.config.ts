/**
 * Stillwater — packages/db Vitest configuration
 *
 * Self-contained config for the @stillwater/db package.
 * Excludes integration tests (*.integration.test.ts) from the default run —
 * those require a live Postgres (via testcontainers or docker-compose) and
 * are run explicitly via `pnpm test:integration`.
 */

import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    pool: 'forks',
    // Exclude integration tests from default run — they need Docker/Postgres
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
      '@stillwater/db': resolve(__dirname, 'src'),
      '@stillwater/config': resolve(__dirname, '../config/src'),
    },
  },
});
