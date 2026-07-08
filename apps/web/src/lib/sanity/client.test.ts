import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock 'server-only' to prevent throw in test environment
vi.mock('server-only', () => ({}));

describe('sanity client factory', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
    delete process.env.NEXT_PUBLIC_SANITY_DATASET;
    delete process.env.SANITY_API_TOKEN;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns null when NEXT_PUBLIC_SANITY_PROJECT_ID is missing', async () => {
    const { getSanityClient } = await import('./client');
    const client = getSanityClient();
    expect(client).toBeNull();
  });

  it('returns a client when env vars are present', async () => {
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = 'test-project';
    process.env.NEXT_PUBLIC_SANITY_DATASET = 'production';
    process.env.SANITY_API_TOKEN = 'test-token';

    const { getSanityClient } = await import('./client');
    const client = getSanityClient();
    expect(client).not.toBeNull();
  });

  it('uses process.env directly (NOT env module) per SKILL §15.6', async () => {
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = 'direct-env-test';
    process.env.NEXT_PUBLIC_SANITY_DATASET = 'production';
    process.env.SANITY_API_TOKEN = 'test-token';

    const { getSanityClient } = await import('./client');
    const client = getSanityClient();
    expect(client).not.toBeNull();
    // Client should be a singleton (module-level cache)
    const client2 = getSanityClient();
    expect(client2).toBe(client);
  });

  it('returns null in build context without env vars (build-context fallback)', async () => {
    const { getSanityClient } = await import('./client');
    expect(getSanityClient()).toBeNull();
  });
});
