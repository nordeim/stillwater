/**
 * Vitest global setup — runs before all tests.
 * Loads env vars from .env.test (if present) or .env.local.
 */

import { config } from 'dotenv';
import { vi } from 'vitest';

// Register @testing-library/jest-dom matchers (toBeInTheDocument, etc.)
import '@testing-library/jest-dom/vitest';

// Mock 'server-only' package — it throws when imported outside Server Components.
// Tests that transitively import modules containing `import 'server-only'` (e.g.
// lib/auth.ts, lib/observability/logger.ts) would otherwise fail with
// "cannot be imported from a Client Component". (vercel/next.js#60038)
vi.mock('server-only', () => ({}));

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
