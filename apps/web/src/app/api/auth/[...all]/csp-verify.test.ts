/**
 * proxy.ts CSP nonce machinery verification (V17-2 rewrite)
 *
 * VERIFIES BEHAVIOR INTENT, NOT BLIND STRING MATCHING.
 *
 * CONTEXT:
 * The proxy.ts generates a per-request nonce + builds a CSP with
 * `'nonce-${nonce}' 'strict-dynamic'`. Per V9-2 comment, proxy.ts
 * response headers do NOT reach production on Vercel + Next.js 16.2.10
 * (GitHub issues vercel/next.js#85711, vercel/next.js#86303). The
 * production CSP is shipped by next.config.ts `headers()` instead.
 *
 * Per SKILL.md Lesson 108 + AUDIT_REMEDIATION.md §v17 Fix #5, the
 * proxy.ts nonce machinery is RETAINED as a no-op for the future —
 * when Vercel/Next.js fixes the proxy.ts header-drop issue, we can
 * switch to nonce-based CSP (more secure than 'unsafe-inline') by
 * removing the next.config.ts CSP and relying on proxy.ts.
 *
 * V17-2 fix: The previous version of this test asserted
 * `.toContain("'strict-dynamic'")` and `.not.toContain("'unsafe-inline'")`
 * on the proxy.ts file. That approach was correct for proxy.ts (which
 * DOES use 'strict-dynamic' in its nonce-based CSP, unlike next.config.ts).
 * But the test approach was brittle — it didn't distinguish the actual
 * CSP string from comment-block mentions. The new version extracts the
 * actual `buildCspHeader` function body and asserts on its returned CSP.
 *
 * Source: STILLWATER_AUDIT_REPORT.md §6 Finding #3 + §7 Finding #5;
 *         SKILL.md Lesson 108;
 *         https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

const proxyContent = readFileSync(
  resolve(__dirname, '../../../../../proxy.ts'),
  'utf-8',
);

/**
 * Extract the body of the buildCspHeader function from proxy.ts.
 *
 * The function is defined as:
 *   function buildCspHeader(nonce: string): string {
 *     const isDev = process.env.NODE_ENV === "development";
 *     return [
 *       "default-src 'self'",
 *       `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""} https://js.stripe.com`,
 *       ...
 *     ].join("; ");
 *   }
 *
 * We extract the function body (between the opening `{` and the matching
 * closing `}`), strip comments, and return the resulting string for
 * assertion matching.
 */
function getBuildCspHeaderBody(): string {
  const fnStart = proxyContent.indexOf('function buildCspHeader');
  expect(fnStart).toBeGreaterThan(-1);

  // Find the opening brace of the function body.
  const bodyStart = proxyContent.indexOf('{', fnStart);
  expect(bodyStart).toBeGreaterThan(-1);

  // Find the matching closing brace (depth-aware).
  let depth = 1;
  let i = bodyStart + 1;
  let bodyEnd = -1;
  while (i < proxyContent.length) {
    const ch = proxyContent[i];
    if (ch === '`' || ch === '"' || ch === "'") {
      // Skip string literal (with escape handling).
      const quote = ch;
      i++;
      while (i < proxyContent.length && proxyContent[i] !== quote) {
        if (proxyContent[i] === '\\') i++;
        i++;
      }
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        bodyEnd = i;
        break;
      }
    }
    i++;
  }
  expect(bodyEnd).toBeGreaterThan(-1);

  const body = proxyContent.slice(bodyStart + 1, bodyEnd);

  // Strip line comments (// ... to end of line) — but NOT strings containing //.
  // Strategy: walk the body, track string state, only strip // outside strings.
  let result = '';
  let inString: false | '"' | "'" | '`' = false;
  for (let j = 0; j < body.length; j++) {
    const ch = body[j];
    if (!inString && (ch === '"' || ch === "'" || ch === '`')) {
      inString = ch;
      result += ch;
    } else if (inString && ch === inString && body[j - 1] !== '\\') {
      inString = false;
      result += ch;
    } else if (!inString && ch === '/' && body[j + 1] === '/') {
      // Skip to end of line.
      while (j < body.length && body[j] !== '\n') j++;
    } else {
      result += ch;
    }
  }
  return result;
}

describe('proxy.ts CSP nonce machinery — V17-2 behavior-based verification', () => {
  const fnBody = getBuildCspHeaderBody();

  describe('nonce generation', () => {
    it('defines a generateNonce function', () => {
      expect(proxyContent).toMatch(/function generateNonce/);
    });

    it('uses crypto.randomUUID for nonce entropy', () => {
      expect(proxyContent).toMatch(/crypto\.randomUUID/);
    });

    it('base64-encodes the nonce', () => {
      expect(proxyContent).toMatch(/base64|Buffer\.from/);
    });
  });

  describe('buildCspHeader (nonce-based CSP for future use)', () => {
    it('defines a buildCspHeader function that accepts a nonce parameter', () => {
      expect(proxyContent).toMatch(/function buildCspHeader\s*\(\s*nonce/);
    });

    it("script-src uses 'nonce-${nonce}' (NOT 'unsafe-inline')", () => {
      // proxy.ts uses nonce-based CSP (more secure than 'unsafe-inline').
      // This is the FUTURE target state — currently a no-op in production
      // because Vercel+Next 16.2 drops proxy.ts response headers.
      expect(fnBody).toMatch(/'nonce-\$\{nonce\}'/);
      // CRITICAL: nonce-based CSP must NOT also have 'unsafe-inline' —
      // per CSP3, having both makes 'unsafe-inline' ignored (when a nonce
      // is present, 'unsafe-inline' is automatically ignored in favor of
      // the nonce). So 'unsafe-inline' would be redundant + misleading.
      // The script-src line in buildCspHeader should not contain 'unsafe-inline'.
      const scriptSrcLine = fnBody
        .split('\n')
        .find((line) => line.includes('script-src'));
      expect(scriptSrcLine).toBeDefined();
      expect(scriptSrcLine).not.toContain("'unsafe-inline'");
    });

    it("script-src includes 'strict-dynamic' (allows dynamically-loaded chunks)", () => {
      // proxy.ts CSP includes 'strict-dynamic' — this is correct for the
      // nonce-based target state (dynamically-loaded chunks execute if
      // their loader has a nonce). NOTE: This is DIFFERENT from next.config.ts
      // which must NOT have 'strict-dynamic' because it uses 'unsafe-inline'
      // instead (V16-3 fix).
      const scriptSrcLine = fnBody
        .split('\n')
        .find((line) => line.includes('script-src'));
      expect(scriptSrcLine).toBeDefined();
      expect(scriptSrcLine).toContain("'strict-dynamic'");
    });

    it('allowlists https://js.stripe.com for Stripe checkout', () => {
      const scriptSrcLine = fnBody
        .split('\n')
        .find((line) => line.includes('script-src'));
      expect(scriptSrcLine).toContain('https://js.stripe.com');
    });
  });

  describe('request flow', () => {
    it('sets x-nonce on REQUEST headers (so Next.js auto-adds nonce to inline scripts)', () => {
      expect(proxyContent).toMatch(/requestHeaders\.set\(['"]x-nonce['"]/);
    });

    it('sets Content-Security-Policy on RESPONSE headers (for the no-op future)', () => {
      // Per V9-2 comment + SKILL Lesson 108, these response headers don't
      // reach production on Vercel + Next.js 16.2.10. But the machinery
      // is retained for the future when Vercel fixes the issue.
      const cspSetMatches = proxyContent.match(
        /response\.headers\.set\(['"]Content-Security-Policy['"]/g,
      );
      expect(cspSetMatches).not.toBeNull();
      expect(cspSetMatches!.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('V17-2 documentation (acknowledges no-op status)', () => {
    it('documents that proxy.ts response headers do not reach production on Vercel', () => {
      // The proxy.ts file should have a comment explaining the no-op status.
      // This is critical so future developers don't think proxy.ts CSP is
      // active in production.
      expect(proxyContent).toMatch(/Vercel|production/i);
      expect(proxyContent).toMatch(/don.?t reach|do not reach|no-op|not.*reach/i);
    });
  });
});
