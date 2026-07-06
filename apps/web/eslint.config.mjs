/**
 * Stillwater — ESLint v9 Flat Config Entry Point (apps/web)
 *
 * ESLint v9 requires a local eslint.config.{js,mjs,cjs} file in the
 * project root. This file imports the shared Stillwater ESLint config
 * from @stillwater/eslint-config (tooling/eslint/index.js).
 *
 * The shared config includes: TypeScript strict, React 19, Next.js 16,
 * Tailwind CSS v4, Import order, and Tailwind class validation rules.
 *
 * App-specific overrides can be appended here if needed:
 *   import sharedConfig from '@stillwater/eslint-config';
 *   export default [
 *     ...sharedConfig,
 *     { rules: { 'no-console': 'warn' } },
 *   ];
 */

import sharedConfig from '@stillwater/eslint-config';

export default sharedConfig;
