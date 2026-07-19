import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

describe('Cloudflare Images URL signer', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // V13-7: renamed from CLOUDFLARE_IMAGES_KEY to CLOUDFLARE_IMAGES_TOKEN
    delete process.env.CLOUDFLARE_IMAGES_TOKEN;
    delete process.env.CLOUDFLARE_IMAGES_KEY; // clean up old name too (transition period)
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('module loads in server environment (server-only guard passes)', async () => {
    // The 'server-only' mock prevents the actual throw in test env.
    // In production, importing this module in a client component throws at build time.
    const mod = await import('./images');
    expect(mod.getSignedImageUrl).toBeDefined();
  });

  it('returns null when CLOUDFLARE_IMAGES_TOKEN is missing (null fallback)', async () => {
    const { getSignedImageUrl } = await import('./images');
    const url = getSignedImageUrl('image-id-123', { width: 800 });
    expect(url).toBeNull();
  });

  it('returns a signed URL when env vars are present', async () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account';
    process.env.CLOUDFLARE_IMAGES_TOKEN = 'test-key';

    const { getSignedImageUrl } = await import('./images');
    const url = getSignedImageUrl('image-id-123', { width: 800 });
    expect(url).not.toBeNull();
    expect(url).toContain('imagedelivery.net');
    expect(url).toContain('image-id-123');
    expect(url).toContain('w=800');
    expect(url).toContain('sig=');
    expect(url).toContain('exp=');
  });

  it('supports format=auto for AVIF/WebP negotiation', async () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account';
    process.env.CLOUDFLARE_IMAGES_TOKEN = 'test-key';

    const { getSignedImageUrl } = await import('./images');
    const url = getSignedImageUrl('image-id', { width: 1200, format: 'auto' });
    expect(url).toContain('format=auto');
  });

  it('uses default expiry of 1 hour when not specified', async () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account';
    process.env.CLOUDFLARE_IMAGES_TOKEN = 'test-key';

    const { getSignedImageUrl } = await import('./images');
    const url = getSignedImageUrl('image-id', { width: 800 });
    const expMatch = /exp=(\d+)/.exec((url!));
    expect(expMatch).not.toBeNull();
    const exp = parseInt(expMatch![1]!, 10);
    const now = Math.floor(Date.now() / 1000);
    expect(exp).toBeGreaterThan(now + 3500);
    expect(exp).toBeLessThan(now + 3700);
  });
});
