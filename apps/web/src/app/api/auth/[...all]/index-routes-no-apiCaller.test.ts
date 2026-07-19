/**
 * V13-1 regression test: index routes must NOT use apiCaller()
 *
 * Context:
 *   The v1-v12 audit saga fixed slug routes (/instructors/[slug], /blog/[slug])
 *   to query the DB directly (bypass apiCaller). However, the 4 index routes
 *   (/, /schedule, /instructors, /pricing) were NEVER fixed.
 *
 *   The live site at https://stillwater.jesspete.shop/ showed 4 of 8 marketing
 *   routes stuck on "Loading…" because:
 *     1. apiCaller() calls headers() → opts page out of static rendering
 *     2. createContext() → getSessionWithTimeout() takes 5s
 *     3. withTimeout(8s) on the data fetch takes up to 8s
 *     4. Total: 13s > Vercel's 10s function timeout
 *     5. Stream cut short → Suspense fallback shown indefinitely
 *
 *   Fix: bypass apiCaller(), query db.query.* directly + withTimeout(8s, [])
 *
 * Source:
 *   - Phase C live-site diagnostic (2026-07-19)
 *   - SKILL.md Lessons 109-112 (v10-v12 slug-route pattern)
 *   - https://nextjs.org/docs/app/api-reference/functions/generate-static-params
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

const PAGES_DIR = resolve(__dirname, '../../../../app/(marketing)');

const homePage = readFileSync(resolve(PAGES_DIR, 'page.tsx'), 'utf-8');
const schedulePage = readFileSync(resolve(PAGES_DIR, 'schedule/page.tsx'), 'utf-8');
const instructorsPage = readFileSync(
  resolve(PAGES_DIR, 'instructors/page.tsx'),
  'utf-8',
);
const pricingPage = readFileSync(resolve(PAGES_DIR, 'pricing/page.tsx'), 'utf-8');

const INDEX_PAGES = [
  { name: '/ (home)', source: homePage },
  { name: '/schedule', source: schedulePage },
  { name: '/instructors', source: instructorsPage },
  { name: '/pricing', source: pricingPage },
] as const;

describe('V13-1: index routes must NOT use apiCaller() (live-site Loading… fix)', () => {
  for (const { name, source } of INDEX_PAGES) {
    describe(name, () => {
      it('does NOT import apiCaller', () => {
        // The import statement itself must be gone — comments are OK.
        // Strip comments before checking (same pattern as slug-404-verify V12-1 test).
        const withoutComments = source
          .replace(/\/\/.*$/gm, '')
          .replace(/\/\*[\s\S]*?\*\//g, '');
        expect(withoutComments).not.toMatch(/from\s+['"]@\/lib\/trpc\/server['"]/);
        expect(withoutComments).not.toMatch(/apiCaller\s*\(/);
      });

      it('imports db directly from @stillwater/db (or @stillwater/db/index)', () => {
        // Direct DB queries avoid headers() → page can be static or short-ISR
        expect(source).toMatch(/from\s+['"]@stillwater\/db['"]/);
      });

      // V15-1 fix: Removed withTimeout requirement — withTimeout uses setTimeout
      // which doesn't fire during Next.js static prerendering. Pages now use
      // plain .catch(() => []) which relies on the DB driver's own AbortSignal timeout.
      it('uses .catch(() => []) for DB query resilience (V15-1: replaced withTimeout)', () => {
        expect(source).toContain('.catch(() => [])');
      });

      it('does NOT export force-dynamic (causes streaming + 200 for notFound)', () => {
        // force-dynamic opts the page out of static rendering entirely,
        // which means it streams the response → HTTP 200 even when
        // notFound() is called → soft-404 bug.
        expect(source).not.toContain("export const dynamic = 'force-dynamic'");
      });
    });
  }
});
