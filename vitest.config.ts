import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    pool: 'forks',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
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
      '@stillwater/db': resolve(__dirname, 'packages/db/src'),
      '@stillwater/api': resolve(__dirname, 'packages/api/src'),
      '@stillwater/auth': resolve(__dirname, 'packages/auth/src'),
      '@stillwater/config': resolve(__dirname, 'packages/config/src'),
      '@stillwater/ui': resolve(__dirname, 'packages/ui/src'),
      '@stillwater/payments': resolve(__dirname, 'packages/payments/src'),
      '@stillwater/email': resolve(__dirname, 'packages/email/src'),
    },
  },
});
