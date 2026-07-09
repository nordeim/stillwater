/**
 * Stillwater — packages/email Vitest configuration
 *
 * Self-contained config for the @stillwater/email package.
 *
 * Email templates use React Email components which require jsdom for
 * rendering tests. `passWithNoTests: true` is set so root `pnpm test`
 * doesn't abort when test files are still being added.
 *
 * Per SKILL §15.21: vi.hoisted() pattern for mocking; afterEach(cleanup)
 * for @testing-library/react jsdom DOM leak prevention.
 */

import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    pool: 'forks',
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/index.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@stillwater/email': resolve(__dirname, 'src'),
      '@stillwater/config': resolve(__dirname, '../config/src'),
    },
  },
});
