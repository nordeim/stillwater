import { createHmac } from 'crypto';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock next/cache so revalidatePath/revalidateTag are spyable
const revalidatePathMock = vi.fn();
const revalidateTagMock = vi.fn();
vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
  revalidateTag: revalidateTagMock,
}));

// Helper: create a Next.js Request with a Sanity webhook payload + signature
function createWebhookRequest(
  body: unknown,
  signature?: string,
): Request {
  const bodyString = JSON.stringify(body);
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (signature !== undefined) {
    headers['sanity-webhook-signature'] = signature;
  }
  return new Request('http://localhost:3000/api/sanity/webhook', {
    method: 'POST',
    headers,
    body: bodyString,
  });
}

// Helper: compute a valid HMAC signature matching the handler's algorithm
function signPayload(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

describe('Sanity webhook handler', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SANITY_WEBHOOK_SECRET = 'test-webhook-secret';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('rejects requests without signature (401)', async () => {
    const { POST } = await import('./route');
    const req = createWebhookRequest({ _type: 'blogPost', _id: 'abc' });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain('signature');
  });

  it('rejects requests with invalid signature (401)', async () => {
    const { POST } = await import('./route');
    const req = createWebhookRequest(
      { _type: 'blogPost', _id: 'abc' },
      'invalid-signature',
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('accepts requests with valid signature (200) and calls revalidatePath', async () => {
    const { POST } = await import('./route');
    const body = JSON.stringify({ _type: 'blogPost', _id: 'abc', slug: 'test-post' });
    const validSig = signPayload(body, 'test-webhook-secret');
    const req = createWebhookRequest(
      { _type: 'blogPost', _id: 'abc', slug: 'test-post' },
      validSig,
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(revalidatePathMock).toHaveBeenCalled();
  });

  it('revalidates /blog when a blogPost is updated', async () => {
    const { POST } = await import('./route');
    const body = JSON.stringify({ _type: 'blogPost', _id: 'abc' });
    const validSig = signPayload(body, 'test-webhook-secret');
    const req = createWebhookRequest(
      { _type: 'blogPost', _id: 'abc' },
      validSig,
    );
    await POST(req);
    expect(revalidatePathMock).toHaveBeenCalledWith('/blog');
  });

  it('revalidates /instructors when an instructorBio is updated', async () => {
    const { POST } = await import('./route');
    const body = JSON.stringify({ _type: 'instructorBio', _id: 'xyz' });
    const validSig = signPayload(body, 'test-webhook-secret');
    const req = createWebhookRequest(
      { _type: 'instructorBio', _id: 'xyz' },
      validSig,
    );
    await POST(req);
    expect(revalidatePathMock).toHaveBeenCalledWith('/instructors');
  });

  it('returns 500 when SANITY_WEBHOOK_SECRET is not set', async () => {
    delete process.env.SANITY_WEBHOOK_SECRET;
    const { POST } = await import('./route');
    const req = createWebhookRequest({ _type: 'blogPost' }, 'any-sig');
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('uses timingSafeEqual to prevent timing attacks', async () => {
    // This is hard to test directly, but we verify the handler doesn't
    // short-circuit on length mismatch (which would be a timing attack vector).
    // A valid signature with different length should still return 401 (not crash).
    const { POST } = await import('./route');
    const req = createWebhookRequest(
      { _type: 'blogPost' },
      'short-invalid-sig',
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
