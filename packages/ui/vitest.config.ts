/**
 * Stillwater — packages/ui Vitest configuration
 *
 * Self-contained config for the @stillwater/ui package.
 *
 * `passWithNoTests: true` is set so that `pnpm test` from the repo root
 * does not abort when this package has zero test files (current state —
 * Radix component tests will be added as the design system grows).
 *
 * Components use @testing-library/react which requires jsdom; CSS tokens
 * and font files are excluded from coverage.
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
        'src/tokens/**',
        'src/fonts/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@stillwater/ui': resolve(__dirname, 'src'),
      '@stillwater/config': resolve(__dirname, '../config/src'),
    },
  },
});
