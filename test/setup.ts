/**
 * Vitest global setup — runs before all tests.
 * Loads env vars from .env.test (if present) or .env.local.
 */

import { config } from 'dotenv';

// Load .env.local first (monorepo root), then .env.test if present
config({ path: '.env.local' });
config({ path: '.env.test' });

// Ensure NODE_ENV is 'test' for all test runs
process.env['NODE_ENV'] = 'test';

// Suppress console.log in tests (keep console.warn + console.error)
if (process.env['NODE_ENV'] === 'test') {
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    if (process.env['VERBOSE_TESTS'] === 'true') {
      originalLog(...args);
    }
  };
}
