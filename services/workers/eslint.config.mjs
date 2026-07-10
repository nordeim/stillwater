/**
 * Stillwater — ESLint v9 Flat Config Entry Point (services/workers)
 *
 * ESLint v9 requires a local eslint.config.{js,mjs,cjs} file.
 * Imports the shared Stillwater ESLint config.
 *
 * Workers tsconfig excludes test files from tsc (per Lesson 28 — test files
 * are run by vitest, not tsc). However, ESLint's projectService still needs
 * to parse them. This override allows linting test files without requiring
 * them in tsconfig.json.
 *
 * Workers use `db.query.X as any` casts per Gotcha 64 / Lesson 71 —
 * Drizzle 0.45 relational query types infer as `never` without
 * defineRelations() (requires Drizzle ≥1.0.0-beta). The casts produce
 * `no-explicit-any`, `no-unsafe-call`, `no-unsafe-member-access`, and
 * `no-unsafe-return` errors that are false positives given the documented
 * limitation. These are suppressed via a scoped override.
 */

import sharedConfig from '@stillwater/eslint-config';

export default [
  ...sharedConfig,
  {
    // Test files + vitest.config.ts are excluded from tsconfig but still need linting
    files: ['src/**/*.test.ts', 'vitest.config.ts'],
    languageOptions: {
      parserOptions: {
        projectService: false,
      },
    },
  },
  {
    // Worker source files use `db.query.X as any` casts (Gotcha 64 / Lesson 71)
    // — Drizzle 0.45 relational query types infer as `never` in NodeNext.
    // These will be removed when upgrading to Drizzle 1.0+ with defineRelations().
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
];
