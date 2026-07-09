/**
 * Stillwater — packages/payments Vitest configuration
 *
 * Self-contained config for the @stillwater/payments package.
 *
 * `passWithNoTests: true` is set so that `pnpm test` from the repo root
 * does not abort when this package has zero test files (current state —
 * Phase 7 Stripe implementation will add STRIPE-001…005 tests).
 *
 * Stripe is server-only; all tests run in the `node` environment.
 */

import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    pool: 'forks',
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
    },
  },
  resolve: {
    alias: {
      '@stillwater/payments': resolve(__dirname, 'src'),
      '@stillwater/config': resolve(__dirname, '../config/src'),
      '@stillwater/db': resolve(__dirname, '../db/src'),
    },
  },
});
