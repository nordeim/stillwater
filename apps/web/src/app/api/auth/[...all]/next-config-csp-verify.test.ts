/**
 * next.config.ts CSP ownership verification (v8 audit remediation, S1 fix)
 *
 * Verifies that next.config.ts does NOT set a Content-Security-Policy header
 * in its `headers()` config. Per Next.js docs:
 *   "If two headers match the same path and set the same header key,
 *    the last header key will override the first."
 * `next.config.ts headers()` runs AFTER proxy.ts, so any CSP set in
 * next.config.ts would OVERRIDE the per-request nonce-based CSP generated
 * by proxy.ts. This was the root cause of audit finding S1 (CSP regression
 * on live site — served `'unsafe-inline'` instead of nonce-based CSP).
 *
 * The fix: proxy.ts is the SOLE source of the Content-Security-Policy header.
 * next.config.ts retains all other security headers (HSTS, X-Frame-Options,
 * X-Content-Type-Options, Referrer-Policy, Permissions-Policy,
 * X-DNS-Prefetch-Control) — only CSP is removed.
 *
 * Source: Stillwater Audit Report v1.0 §7.2 + §8.3 (S1 finding);
 *         Next.js docs https://nextjs.org/docs/pages/api-reference/config/next-config-js/headers
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

const nextConfigContent = readFileSync(
  resolve(__dirname, '../../../../../next.config.ts'),
  'utf-8',
);

describe('next.config.ts CSP ownership (v8 S1 fix)', () => {
  it('does NOT set Content-Security-Policy in headers() config', () => {
    // Extract the headers() function body and verify it has no CSP entry.
    // We look for the literal string "Content-Security-Policy" appearing
    // inside a `key:` property assignment (which is the headers() pattern).
    const cspKeyPattern = /key:\s*["']Content-Security-Policy["']/;
    expect(cspKeyPattern.test(nextConfigContent)).toBe(false);
  });

  it('retains other security headers in headers() config', () => {
    // These headers don't conflict with proxy.ts, so they're safe to keep.
    expect(nextConfigContent).toContain('X-Frame-Options');
    expect(nextConfigContent).toContain('X-Content-Type-Options');
    expect(nextConfigContent).toContain('Referrer-Policy');
    expect(nextConfigContent).toContain('Permissions-Policy');
    expect(nextConfigContent).toContain('Strict-Transport-Security');
    expect(nextConfigContent).toContain('X-DNS-Prefetch-Control');
  });

  it('does NOT claim that proxy.ts overrides next.config.ts headers (misleading comment removed)', () => {
    // The old comment "The per-request nonce-based CSP in proxy.ts
    // (commit 8a1765d) will OVERRIDE this with a stricter version" was
    // incorrect — next.config.ts headers() overrides proxy.ts, not the
    // other way around. The comment must be removed to prevent confusion.
    expect(nextConfigContent).not.toContain('will OVERRIDE this');
    expect(nextConfigContent).not.toContain('SAFETY NET');
  });
});
