/**
 * next.config.ts CSP verification (V17-2 rewrite)
 *
 * VERIFIES BEHAVIOR, NOT FILE CONTENT.
 *
 * V17-2 fix: The previous version of this test asserted
 * `.toContain("'strict-dynamic'")` — which PASSED even after the V16-3
 * fix removed 'strict-dynamic' from the actual CSP, because the V16-3
 * comment block at lines 110-134 mentions the string 'strict-dynamic'
 * in its historical narrative. The test gave false confidence on a
 * security-critical control.
 *
 * The new approach: extract the actual CSP value (the array literal
 * inside `headers()`) and parse it into a Map<directive, sources[]>.
 * Then assert on the parsed directives — not on raw file content.
 *
 * Source: STILLWATER_AUDIT_REPORT.md §6 Finding #3;
 *         W3C CSP3 §strict-dynamic-usage;
 *         https://content-security-policy.com/strict-dynamic
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

const nextConfigContent = readFileSync(
  resolve(__dirname, '../../../../../next.config.ts'),
  'utf-8',
);

/**
 * Extract the actual CSP value from next.config.ts headers() config.
 *
 * The CSP is constructed as a JavaScript array of double-quoted directive
 * strings joined by "; ". We:
 *   1. Locate the `key: "Content-Security-Policy"` block
 *   2. Extract the `value: [ ... ].join("; ")` array literal
 *   3. Match only OUTER double-quoted strings (`"..."`) — single-quotes
 *      inside (e.g. `'self'`) are part of the string content, not delimiters
 *   4. Parse each captured string into [name, ...sources]
 *
 * @returns Map<directiveName, sources[]> — e.g. "script-src" => ["'self'", "'unsafe-inline'", "https://js.stripe.com"]
 */
function parseNextConfigCsp(): Map<string, string[]> {
  // Step 1: Locate the Content-Security-Policy header block.
  const startMarker = 'key: "Content-Security-Policy"';
  const startIndex = nextConfigContent.indexOf(startMarker);
  expect(startIndex).toBeGreaterThan(-1);

  // Step 2: Find the `value: [` and the closing `].join("; ")`.
  const valueStart = nextConfigContent.indexOf('value: [', startIndex);
  expect(valueStart).toBeGreaterThan(-1);

  const valueEnd = nextConfigContent.indexOf('].join("; ")', valueStart);
  expect(valueEnd).toBeGreaterThan(-1);

  const arrayLiteral = nextConfigContent.slice(valueStart, valueEnd);

  // Step 3: Strip line comments (// ... to end of line) — but ONLY outside
  // string literals. A naive `/\/\/[^\n]*/g` would also strip `//` inside
  // strings like `"https://js.stripe.com"` — corrupting the URL.
  let withoutComments = '';
  let inString: false | '"' | "'" | '`' = false;
  for (let j = 0; j < arrayLiteral.length; j++) {
    const ch = arrayLiteral[j];
    if (!inString && (ch === '"' || ch === "'" || ch === '`')) {
      inString = ch;
      withoutComments += ch;
    } else if (inString && ch === inString && arrayLiteral[j - 1] !== '\\') {
      inString = false;
      withoutComments += ch;
    } else if (!inString && ch === '/' && arrayLiteral[j + 1] === '/') {
      // Skip to end of line.
      while (j < arrayLiteral.length && arrayLiteral[j] !== '\n') j++;
    } else {
      withoutComments += ch;
    }
  }

  // Step 4: Match OUTER double-quoted strings only.
  // Using `"([^"]*)"` (not `["'`]([^"'`]*?)["'`]`) ensures single-quotes
  // inside the string (e.g. `'self'`, `'unsafe-inline'`) are treated as
  // content, not as string delimiters.
  const stringPattern = /"([^"]*)"/g;
  const directives = new Map<string, string[]>();
  let match: RegExpExecArray | null;
  while ((match = stringPattern.exec(withoutComments)) !== null) {
    const literal = match[1] as string;
    // Each string is one directive (e.g. "script-src 'self' 'unsafe-inline'").
    // Split on whitespace. Empty strings + the join separator ("; ") are
    // skipped by the parts.length check.
    const parts = literal.split(/\s+/).filter(Boolean);
    if (parts.length === 0) continue;
    const [name, ...sources] = parts;
    // Some directives have no sources (e.g. "upgrade-insecure-requests").
    directives.set(name, sources);
  }

  return directives;
}

describe('next.config.ts CSP — V17-2 behavior-based verification', () => {
  const csp = parseNextConfigCsp();

  it('parses at least 8 directives (default-src through upgrade-insecure-requests)', () => {
    // Sanity check on the parser itself.
    expect(csp.size).toBeGreaterThanOrEqual(8);
    expect(csp.has('default-src')).toBe(true);
    expect(csp.has('script-src')).toBe(true);
    expect(csp.has('object-src')).toBe(true);
    expect(csp.has('base-uri')).toBe(true);
    expect(csp.has('form-action')).toBe(true);
    expect(csp.has('upgrade-insecure-requests')).toBe(true);
  });

  describe('script-src (V16-3 fix verification)', () => {
    const scriptSrc = csp.get('script-src') ?? [];

    it("includes 'self'", () => {
      expect(scriptSrc).toContain("'self'");
    });

    it("includes 'unsafe-inline' (required for Next.js RSC streaming $RC/$RS/$RV scripts)", () => {
      // V16-3: 'unsafe-inline' is required because Next.js generates inline
      // scripts for RSC streaming that have no nonce. Without 'unsafe-inline',
      // React never hydrates and the page stays on "Loading…".
      expect(scriptSrc).toContain("'unsafe-inline'");
    });

    it("does NOT include 'strict-dynamic' (V16-3 removed it)", () => {
      // CRITICAL: 'strict-dynamic' causes browsers to ignore 'unsafe-inline'
      // per W3C CSP3. This was the root cause of the V1-V16 "Loading…" saga.
      // See: https://www.w3.org/TR/CSP3/#strict-dynamic-usage
      // See: https://content-security-policy.com/strict-dynamic
      expect(scriptSrc).not.toContain("'strict-dynamic'");
    });

    it("does NOT include 'unsafe-eval'", () => {
      // 'unsafe-eval' is overly permissive and not needed in production.
      expect(scriptSrc).not.toContain("'unsafe-eval'");
    });

    it('allowlists https://js.stripe.com for Stripe checkout', () => {
      expect(scriptSrc).toContain('https://js.stripe.com');
    });
  });

  describe('style-src', () => {
    const styleSrc = csp.get('style-src') ?? [];

    it("includes 'self'", () => {
      expect(styleSrc).toContain("'self'");
    });

    it("includes 'unsafe-inline' (Tailwind v4 + Radix UI inject styles at runtime)", () => {
      expect(styleSrc).toContain("'unsafe-inline'");
    });
  });

  describe('img-src', () => {
    const imgSrc = csp.get('img-src') ?? [];

    it("includes 'self'", () => {
      expect(imgSrc).toContain("'self'");
    });

    it('allowlists Cloudflare Images CDN', () => {
      expect(imgSrc).toContain('https://imagedelivery.net');
    });

    it('allowlists Sanity CDN', () => {
      expect(imgSrc).toContain('https://cdn.sanity.io');
    });
  });

  describe('connect-src', () => {
    const connectSrc = csp.get('connect-src') ?? [];

    it("includes 'self'", () => {
      expect(connectSrc).toContain("'self'");
    });

    it('allowlists Stripe API', () => {
      expect(connectSrc).toContain('https://api.stripe.com');
    });

    it('allowlists wss: for SSE', () => {
      expect(connectSrc).toContain('wss:');
    });

    it('allowlists Sentry ingestion', () => {
      expect(connectSrc.some((s) => s.includes('sentry.io'))).toBe(true);
    });

    it('allowlists PostHog ingestion', () => {
      expect(connectSrc.some((s) => s.includes('posthog.com'))).toBe(true);
    });
  });

  describe('hardening directives', () => {
    it("object-src is 'none' (blocks Flash/plugin XSS)", () => {
      expect(csp.get('object-src')).toEqual(["'none'"]);
    });

    it("base-uri is 'self' (blocks <base> tag injection)", () => {
      expect(csp.get('base-uri')).toEqual(["'self'"]);
    });

    it("form-action is 'self' (blocks form submission to external origins)", () => {
      expect(csp.get('form-action')).toEqual(["'self'"]);
    });

    it('includes upgrade-insecure-requests', () => {
      // upgrade-insecure-requests has no sources — it's a standalone directive.
      expect(csp.has('upgrade-insecure-requests')).toBe(true);
    });
  });

  describe('other security headers (preserved from v9)', () => {
    it('sets X-Frame-Options: DENY', () => {
      expect(nextConfigContent).toMatch(/key:\s*["']X-Frame-Options["']/);
      expect(nextConfigContent).toMatch(/value:\s*["']DENY["']/);
    });

    it('sets X-Content-Type-Options: nosniff', () => {
      expect(nextConfigContent).toMatch(/key:\s*["']X-Content-Type-Options["']/);
      expect(nextConfigContent).toMatch(/value:\s*["']nosniff["']/);
    });

    it('sets Referrer-Policy', () => {
      expect(nextConfigContent).toMatch(/key:\s*["']Referrer-Policy["']/);
    });

    it('sets Permissions-Policy (camera + microphone disabled)', () => {
      expect(nextConfigContent).toMatch(/key:\s*["']Permissions-Policy["']/);
      expect(nextConfigContent).toMatch(/camera=\(\)/);
      expect(nextConfigContent).toMatch(/microphone=\(\)/);
    });

    it('sets Strict-Transport-Security with preload', () => {
      expect(nextConfigContent).toMatch(/key:\s*["']Strict-Transport-Security["']/);
      expect(nextConfigContent).toMatch(/includeSubDomains/);
      expect(nextConfigContent).toMatch(/preload/);
    });
  });

  describe('V16-3 documentation', () => {
    it('documents the V16-3 root cause (strict-dynamic causes unsafe-inline to be ignored)', () => {
      // The comment block must explain WHY 'strict-dynamic' was removed.
      expect(nextConfigContent).toContain('V16-3');
      expect(nextConfigContent).toMatch(/strict-dynamic.*ignored|ignored.*strict-dynamic/is);
    });

    it('cites the W3C CSP3 spec', () => {
      expect(nextConfigContent).toMatch(/w3\.org.*CSP3|CSP3.*w3\.org/is);
    });
  });
});
