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
    // Test files + vitest.config.ts are excluded from tsconfig.json (correct for tsc)
    // but still need linting WITH type information. A dedicated tsconfig.eslint.json
    // extends tsconfig.json and re-includes the test files, so the shared
    // config's typed rules (await-thenable, no-floating-promises, no-misused-
    // promises, require-await) get real type info. We point `project` at it
    // for test files — this REPLACES the base
    // `projectService: true` (which can't find the excluded test files).
    // Do NOT use `projectService: false` (strips type info → crashes typed
    // rules) or `allowDefaultProject` (its globs can't contain `**`).
    files: ['src/**/*.test.ts', 'vitest.config.ts'],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['src/*.test.ts', 'vitest.config.ts'],
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 20,
          defaultProject: './tsconfig.eslint.json',
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Test files now have type information (via allowDefaultProject + defaultProject
    // pointing at tsconfig.eslint.json). vitest mocks return `any`, triggering
    // `no-unsafe-assignment` and `no-unsafe-argument` on test assertions.
    files: ['src/**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
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
