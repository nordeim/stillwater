/**
 * Stillwater — ESLint v9 Flat Config Entry Point (services/workers)
 *
 * ESLint v9 requires a local eslint.config.{js,mjs,cjs} file.
 * Imports the shared Stillwater ESLint config.
 *
 * Note: This package has no src/ directory yet (Phase 8 creates it).
 * ESLint will simply find zero files to lint and exit cleanly.
 */

import sharedConfig from '@stillwater/eslint-config';

export default sharedConfig;
