/**
 * next.config.ts CSP verification (v9 audit remediation, V9-2 fix)
 *
 * Verifies that next.config.ts DOES set a Content-Security-Policy header
 * in its `headers()` config. This is the v9 correction of the v8 S1 fix.
 *
 * v8 S1 fix removed CSP from next.config.ts expecting proxy.ts to provide
 * it via per-request nonce. However, live-site E2E testing revealed that
 * proxy.ts response headers do NOT reach production responses on Vercel +
 * Next.js 16.2.10 (per GitHub issues #85711, #86303 — proxy.ts headers
 * dropped in production). The result was a live site with NO CSP at all,
 * which is worse than the v7 state ('unsafe-inline').
 *
 * v9 V9-2 fix: Restore a working CSP in next.config.ts headers() using
 * 'self' 'unsafe-inline' 'strict-dynamic' for script-src. This is weaker
 * than the nonce-based target state but provides real XSS protection.
 * The nonce-based CSP in proxy.ts is retained for the future when the
 * Vercel/Next.js production proxy.ts header issue is resolved.
 *
 * Source: Stillwater Audit Report v9 §V9-2;
 *         GitHub vercel/next.js#85711, vercel/next.js#86303;
 *         Next.js CSP guide https://nextjs.org/docs/app/guides/content-security-policy
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

const nextConfigContent = readFileSync(
  resolve(__dirname, '../../../../../next.config.ts'),
  'utf-8',
);

describe('next.config.ts CSP verification (v9 V9-2 fix)', () => {
  it('DOES set Content-Security-Policy in headers() config (v9 restoration)', () => {
    // v9: CSP MUST be present in next.config.ts headers() because proxy.ts
    // response headers don't reach production on Vercel + Next.js 16.2.
    const cspKeyPattern = /key:\s*["']Content-Security-Policy["']/;
    expect(cspKeyPattern.test(nextConfigContent)).toBe(true);
  });

  it('CSP includes script-src with self + strict-dynamic', () => {
    // 'strict-dynamic' allows dynamically loaded chunks to execute.
    // 'self' allows same-origin scripts.
    expect(nextConfigContent).toContain("script-src");
    expect(nextConfigContent).toContain("'self'");
    expect(nextConfigContent).toContain("'strict-dynamic'");
  });

  it('CSP includes https://js.stripe.com for Stripe checkout', () => {
    expect(nextConfigContent).toContain('https://js.stripe.com');
  });

  it('CSP includes img-src with Cloudflare + Sanity CDNs', () => {
    expect(nextConfigContent).toContain('img-src');
    expect(nextConfigContent).toContain('https://imagedelivery.net');
    expect(nextConfigContent).toContain('https://cdn.sanity.io');
  });

  it('CSP includes object-src none (blocks Flash/plugin XSS)', () => {
    expect(nextConfigContent).toContain("object-src 'none'");
  });

  it('CSP includes base-uri self + form-action self', () => {
    expect(nextConfigContent).toContain("base-uri 'self'");
    expect(nextConfigContent).toContain("form-action 'self'");
  });

  it('CSP includes upgrade-insecure-requests', () => {
    expect(nextConfigContent).toContain('upgrade-insecure-requests');
  });

  it('retains other security headers in headers() config', () => {
    expect(nextConfigContent).toContain('X-Frame-Options');
    expect(nextConfigContent).toContain('X-Content-Type-Options');
    expect(nextConfigContent).toContain('Referrer-Policy');
    expect(nextConfigContent).toContain('Permissions-Policy');
    expect(nextConfigContent).toContain('Strict-Transport-Security');
    expect(nextConfigContent).toContain('X-DNS-Prefetch-Control');
  });

  it('documents the v9 rationale (proxy.ts CSP not reaching production)', () => {
    // The comment must explain WHY CSP is in next.config.ts despite
    // proxy.ts also generating a nonce-based CSP.
    expect(nextConfigContent).toContain('V9-2');
    expect(nextConfigContent).toContain('proxy.ts');
  });
});
