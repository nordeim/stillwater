/**
 * F2-10 — Server-side auth helpers test suite (RED phase)
 *
 * Tests for getSession, requireAuth, requireRole.
 * Per MEP Phase 2 F2-10 + SKILL §5.6.
 *
 * Note: requireAuth/requireRole throw NEXT_REDIRECT (not catchable).
 * Tests mock the auth.api.getSession and verify redirect behavior.
 */

import { headers } from 'next/headers';

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server-only (throws in test environment — only valid in Next.js server context)
vi.mock('server-only', () => ({}));

// Mock next/headers and next/navigation BEFORE importing auth helpers
vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    // Simulate NEXT_REDIRECT by throwing (Next.js pattern)
    throw new Error(`NEXT_REDIRECT: ${url}`);
  }),
}));

// Mock @stillwater/auth
vi.mock('@stillwater/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

import { auth } from '@stillwater/auth';

import { getSession, requireAuth, requireRole } from './auth';

describe('F2-10: Server-side auth helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(headers).mockResolvedValue(new Headers());
  });

  it('getSession() returns null when no session', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const session = await getSession();
    expect(session).toBeNull();
  });

  it('requireAuth() redirects to /auth/sign-in when unauthenticated', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    await expect(requireAuth()).rejects.toThrow('NEXT_REDIRECT: /auth/sign-in');
  });

  it('requireRole("owner") redirects to /dashboard when user is only "member"', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: 'test', email: 'test@test.test', name: 'Test', roles: ['member'] },
      session: { expires: '2026-08-01' },
    } as never);

    await expect(requireRole('owner')).rejects.toThrow('NEXT_REDIRECT: /dashboard');
  });

  it('requireAuth() returns session when authenticated', async () => {
    const mockSession = {
      user: { id: 'test', email: 'test@test.test', name: 'Test', roles: ['member'] },
      session: { expires: '2026-08-01' },
    };
    vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as never);

    const session = await requireAuth();
    expect(session).toEqual(mockSession);
  });

  it('requireRole("member") returns session when user has "member" role', async () => {
    const mockSession = {
      user: { id: 'test', email: 'test@test.test', name: 'Test', roles: ['member'] },
      session: { expires: '2026-08-01' },
    };
    vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as never);

    const session = await requireRole('member');
    expect(session).toEqual(mockSession);
  });
});
