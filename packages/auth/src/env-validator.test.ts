/**
 * V20-4 regression test: auth env var fail-fast validator.
 *
 * Before V20-4, the auth config silently fell back to placeholder strings
 * for BETTER_AUTH_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and
 * RESEND_API_KEY. This caused the production auth 500 outage — Google OAuth
 * rejected the placeholder credentials, and Resend rejected the placeholder
 * API key, causing sign-in/magic-link + sign-in/social to both return 500.
 *
 * This test verifies the validator throws in production context (not build/test)
 * when any of the 4 env vars is missing.
 *
 * Per SKILL.md §11.5 regression test verification cycle.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('V20-4: auth env var fail-fast validator', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset env between tests
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('resend-client throws when RESEND_API_KEY is missing in production', async () => {
    // Simulate production (not build, not test)
    delete process.env['NODE_ENV'];
    delete process.env['NEXT_PHASE'];
    delete process.env['RESEND_API_KEY'];

    // vitest sets NODE_ENV=test by default — we need to override
    vi.resetModules();

    await expect(import('./resend-client')).rejects.toThrow(
      /RESEND_API_KEY is not set/,
    );
  });

  it('config throws when BETTER_AUTH_URL is missing in production', async () => {
    delete process.env['NODE_ENV'];
    delete process.env['NEXT_PHASE'];
    delete process.env['BETTER_AUTH_URL'];
    // Set the other vars so we isolate the BETTER_AUTH_URL check
    process.env['RESEND_API_KEY'] = 're_test';
    process.env['GOOGLE_CLIENT_ID'] = 'test.apps.googleusercontent.com';
    process.env['GOOGLE_CLIENT_SECRET'] = 'test-secret';
    process.env['BETTER_AUTH_SECRET'] = 'test-secret-32-chars-minimum-length!';

    vi.resetModules();

    await expect(import('./config')).rejects.toThrow(
      /BETTER_AUTH_URL/,
    );
  });

  it('config throws when GOOGLE_CLIENT_ID is missing in production', async () => {
    delete process.env['NODE_ENV'];
    delete process.env['NEXT_PHASE'];
    delete process.env['GOOGLE_CLIENT_ID'];
    process.env['RESEND_API_KEY'] = 're_test';
    process.env['BETTER_AUTH_URL'] = 'http://localhost:3000';
    process.env['GOOGLE_CLIENT_SECRET'] = 'test-secret';
    process.env['BETTER_AUTH_SECRET'] = 'test-secret-32-chars-minimum-length!';

    vi.resetModules();

    await expect(import('./config')).rejects.toThrow(
      /GOOGLE_CLIENT_ID/,
    );
  });

  it('config throws when GOOGLE_CLIENT_SECRET is missing in production', async () => {
    delete process.env['NODE_ENV'];
    delete process.env['NEXT_PHASE'];
    delete process.env['GOOGLE_CLIENT_SECRET'];
    process.env['RESEND_API_KEY'] = 're_test';
    process.env['BETTER_AUTH_URL'] = 'http://localhost:3000';
    process.env['GOOGLE_CLIENT_ID'] = 'test.apps.googleusercontent.com';
    process.env['BETTER_AUTH_SECRET'] = 'test-secret-32-chars-minimum-length!';

    vi.resetModules();

    await expect(import('./config')).rejects.toThrow(
      /GOOGLE_CLIENT_SECRET/,
    );
  });

  it('config does NOT throw in build context (NEXT_PHASE=phase-production-build)', async () => {
    process.env['NEXT_PHASE'] = 'phase-production-build';
    delete process.env['RESEND_API_KEY'];
    delete process.env['BETTER_AUTH_URL'];
    delete process.env['GOOGLE_CLIENT_ID'];
    delete process.env['GOOGLE_CLIENT_SECRET'];
    delete process.env['BETTER_AUTH_SECRET'];

    vi.resetModules();

    // Should NOT throw — build context is exempt
    const mod = await import('./config');
    expect(mod.auth).toBeDefined();
  });
});
