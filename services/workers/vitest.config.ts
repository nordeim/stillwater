/**
 * Stillwater — services/workers Vitest configuration
 *
 * Self-contained config for the @stillwater/workers package.
 *
 * Worker tests mock Trigger.dev's `task()` function and @stillwater/email's
 * `sendEmailNative()` to avoid hitting external services. Tests run in the
 * `node` environment (not jsdom — workers are server-side only).
 *
 * `passWithNoTests: true` is set so root `pnpm test` doesn't abort when
 * test files are still being added.
 *
 * Per MEP Phase 8: 85% coverage target on services/workers/*.
 */

import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    pool: 'forks',
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/index.ts',
      ],
      // MEP Phase 8 acceptance: 85% coverage on services/workers/*
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,
      },
    },
  },
  resolve: {
    alias: {
      '@stillwater/workers': resolve(__dirname, 'src'),
      '@stillwater/config': resolve(__dirname, '../../packages/config/src'),
      '@stillwater/db': resolve(__dirname, '../../packages/db/src'),
      '@stillwater/email': resolve(__dirname, '../../packages/email/src'),
    },
  },
});
