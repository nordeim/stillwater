/**
 * F2-13 — proxy.ts 2-layer pattern verification test
 *
 * Verifies that proxy.ts follows the 2-layer auth pattern per ADR-009:
 * - Uses getSessionCookie() from better-auth/cookies
 * - Does NOT call auth.api.getSession()
 * - Does NOT import from @stillwater/auth
 * - AUTH_REQUIRED_ROUTES is a flat array (not a role map)
 *
 * Source: MEP Phase 2 F2-13, ADR-009, guide G2.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

const proxyContent = readFileSync(
  resolve(__dirname, '../../../../../proxy.ts'),
  'utf-8',
);

describe('F2-13: proxy.ts 2-layer auth pattern verification', () => {
  it('uses getSessionCookie from better-auth/cookies', () => {
    expect(proxyContent).toContain('getSessionCookie');
    expect(proxyContent).toContain('better-auth/cookies');
  });

  it('does NOT call auth.api.getSession() (grep-verified)', () => {
    // The only mentions of auth.api.getSession should be in comments
    // Remove comments and check
    const withoutComments = proxyContent
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    expect(withoutComments).not.toContain('auth.api.getSession');
  });

  it('does NOT import from @stillwater/auth (grep-verified)', () => {
    expect(proxyContent).not.toContain("from '@stillwater/auth'");
    expect(proxyContent).not.toContain('from "@stillwater/auth"');
  });

  it('has AUTH_REQUIRED_ROUTES as a flat array (not a role map)', () => {
    expect(proxyContent).toContain('AUTH_REQUIRED_ROUTES');
    // Should NOT have ROUTE_ROLE_MAP (the old PAD §9.4 pattern)
    expect(proxyContent).not.toContain('ROUTE_ROLE_MAP');
  });

  it('exports proxy function (NOT middleware)', () => {
    expect(proxyContent).toMatch(/export\s+(?:async\s+)?function\s+proxy\b/);
    expect(proxyContent).not.toMatch(/export\s+(?:async\s+)?function\s+middleware\b/);
  });

  it('has matcher config that excludes static assets', () => {
    expect(proxyContent).toContain('matcher');
    expect(proxyContent).toContain('_next/static');
    expect(proxyContent).toContain('_next/image');
  });
});
