/**
 * Stillwater — apps/web Vitest configuration
 *
 * Self-contained config for the @stillwater/web app.
 * Excludes integration tests (*.integration.test.ts) and E2E tests (*.spec.ts).
 */

import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    pool: 'forks',
    exclude: [
      '**/node_modules/**',
      '**/.git/**',
      '**/*.integration.test.ts',
      '**/*.integration.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      'e2e/**',
      'playwright-report/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    },
  },
  resolve: {
    alias: {
      '@stillwater/auth': resolve(__dirname, '../../packages/auth/src'),
      '@stillwater/db': resolve(__dirname, '../../packages/db/src'),
      '@stillwater/config': resolve(__dirname, '../../packages/config/src'),
      '@stillwater/ui': resolve(__dirname, '../../packages/ui/src'),
      '@': resolve(__dirname, 'src'),
    },
  },
});
