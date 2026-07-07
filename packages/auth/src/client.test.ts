/**
 * F2-02 — Better Auth React client test suite (RED phase)
 *
 * Tests for the client-side auth API.
 * Per MEP Phase 2 F2-02 + guide_auth-v5_vs_better-auth.md G4.
 *
 * Better Auth client API (DIFFERENT from Auth.js):
 * - authClient.signIn.social({ provider, callbackURL }) — NOT signIn('github')
 * - authClient.signIn.magicLink({ email, callbackURL }) — magic link flow
 * - authClient.signOut() — NOT signOut()
 * - authClient.useSession() returns { data, error, refetch, isPending }
 *   (NOT { data, status, update } from next-auth/react)
 */

import { describe, it, expect } from 'vitest';
import { authClient, signIn, signOut, useSession } from './client';

describe('F2-02: Better Auth React client', () => {
  it('exports authClient (function or object — Better Auth createAuthClient)', () => {
    expect(authClient).toBeDefined();
    // Better Auth's createAuthClient returns a callable function/object hybrid
    expect(typeof authClient === 'object' || typeof authClient === 'function').toBe(true);
  });

  it('exports signIn, signOut, useSession destructured from authClient', () => {
    expect(signIn).toBeDefined();
    expect(signOut).toBeDefined();
    expect(useSession).toBeDefined();
  });

  it('authClient.signIn.social is a function (Better Auth namespace pattern)', () => {
    expect(authClient.signIn).toBeDefined();
    expect(typeof authClient.signIn.social).toBe('function');
  });

  it('authClient.signIn.magicLink is a function', () => {
    expect(typeof authClient.signIn.magicLink).toBe('function');
  });

  it('authClient.signOut is a function', () => {
    expect(typeof authClient.signOut).toBe('function');
  });

  it('authClient.useSession is a function', () => {
    expect(typeof authClient.useSession).toBe('function');
  });

  it('useSession is the same function as authClient.useSession', () => {
    expect(useSession).toBe(authClient.useSession);
  });
});
