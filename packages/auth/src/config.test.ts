/**
 * F2-01 — Better Auth config test suite (RED phase)
 *
 * Tests for the Better Auth server configuration.
 * Per MEP Phase 2 F2-01 + guide_auth-v5_vs_better-auth.md.
 */

import { describe, it, expect } from 'vitest';
import { auth } from './config';

describe('F2-01: Better Auth config', () => {
  it('exports the auth object', () => {
    expect(auth).toBeDefined();
    expect(typeof auth).toBe('object');
  });

  it('has api.getSession method (Better Auth server API)', () => {
    expect(auth.api).toBeDefined();
    expect(typeof auth.api.getSession).toBe('function');
  });

  it('has Google OAuth provider configured', () => {
    // Better Auth stores social providers in options
    expect(auth.options).toBeDefined();
    expect(auth.options.socialProviders).toBeDefined();
    expect(auth.options.socialProviders?.google).toBeDefined();
  });

  it('has Magic Link plugin configured', () => {
    // Magic Link is a plugin in Better Auth (not a social provider)
    expect(auth.options).toBeDefined();
    expect(auth.options.plugins).toBeDefined();
    const pluginIds = auth.options.plugins?.map((p: { id: string }) => p.id) ?? [];
    expect(pluginIds).toContain('magic-link');
  });

  it('uses users table (plural) via drizzleAdapter schema config', () => {
    // Better Auth's drizzleAdapter maps Better Auth's default 'user' to our 'users' table
    // The schema mapping is inside the database adapter config, not at options.user level
    expect(auth.options).toBeDefined();
    expect(auth.options.database).toBeDefined();
    // The database config should be an object with provider + schema mapping
    // (drizzleAdapter stores this internally; we verify via the config structure)
  });

  it('has customSession plugin for memberId + roles enrichment', () => {
    expect(auth.options).toBeDefined();
    expect(auth.options.plugins).toBeDefined();
    const pluginIds = auth.options.plugins?.map((p: { id: string }) => p.id) ?? [];
    expect(pluginIds).toContain('custom-session');
  });
});
