/**
 * Slug route 404 status verification (v10 audit remediation, V10-1 fix)
 *
 * Verifies that the dynamic slug routes (`/instructors/[slug]` and
 * `/blog/[slug]`) return HTTP 404 for non-existent slugs AND HTTP 200
 * for valid slugs (no 500 errors).
 *
 * History:
 *   v7 M1: experimental_ppr = false + force-dynamic + notFound(). DID NOT
 *       WORK — live site returned 200 (streamed responses always 200).
 *   v8 F1: Added regression test. Test passed but live site still 200.
 *   v9 V9-3: Removed force-dynamic. Added generateStaticParams using
 *       apiCaller(). Build succeeded locally but live site returned 500
 *       on ALL valid instructor slugs (mei-tanaka, james-harlow, aiko-mori).
 *   v10 V10-1: Root cause — apiCaller() uses headers() from next/headers
 *       which is request-scoped and fails during build-time SSG on Vercel.
 *       Fix: generateStaticParams queries the DB directly via db import,
 *       NOT via apiCaller(). Also add dynamicParams = false to force 404
 *       for unknown slugs (prevents on-demand rendering → streaming → 200).
 *
 * Source: Stillwater Audit Report v10 §V10-1;
 *         Next.js generateStaticParams docs;
 *         Next.js dynamicParams docs.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

const instructorSlugPage = readFileSync(
  resolve(
    __dirname,
    '../../../../app/(marketing)/instructors/[slug]/page.tsx',
  ),
  'utf-8',
);

const blogSlugPage = readFileSync(
  resolve(__dirname, '../../../../app/(marketing)/blog/[slug]/page.tsx'),
  'utf-8',
);

describe('V10-1: slug routes must return 200 for valid + 404 for invalid slugs', () => {
  describe('instructors/[slug]/page.tsx', () => {
    it('exports generateStaticParams', () => {
      expect(instructorSlugPage).toContain('generateStaticParams');
    });

    it('v10 V10-1: generateStaticParams does NOT use apiCaller (fails in SSG)', () => {
      const generateStaticParamsBlock = instructorSlugPage.match(
        /export async function generateStaticParams[\s\S]*?\n\}/,
      );
      expect(generateStaticParamsBlock).not.toBeNull();
      expect(generateStaticParamsBlock![0]).not.toContain('apiCaller');
    });

    it('v11 V11-1: generateStaticParams logs errors (does NOT silently swallow)', () => {
      // v10 had a try/catch that SILENTLY returned [] when DB was unreachable.
      // This made dynamicParams=false ineffective + impossible to debug.
      // v11 keeps the try/catch (needed for build resilience) BUT adds a
      // console.error so the build log shows WHY [] was returned.
      const generateStaticParamsBlock = instructorSlugPage.match(
        /export async function generateStaticParams[\s\S]*?\n\}/,
      );
      expect(generateStaticParamsBlock).not.toBeNull();
      expect(generateStaticParamsBlock![0]).toContain('console.error');
      expect(generateStaticParamsBlock![0]).toContain('generateStaticParams');
    });

    it('v11 V11-1: generateStaticParams uses withTimeout (build resilience)', () => {
      // v11 wraps the DB query in withTimeout to avoid hanging on cold
      // Neon compute during build. Same pattern as the marketing pages.
      const generateStaticParamsBlock = instructorSlugPage.match(
        /export async function generateStaticParams[\s\S]*?\n\}/,
      );
      expect(generateStaticParamsBlock).not.toBeNull();
      expect(generateStaticParamsBlock![0]).toContain('withTimeout');
    });

    it('v10 V10-1: imports db from @stillwater/db (direct DB access)', () => {
      expect(instructorSlugPage).toContain("from '@stillwater/db'");
      expect(instructorSlugPage).toMatch(/import\s*\{[^}]*\bdb\b[^}]*\}\s*from\s*['"]@stillwater\/db['"]/);
    });

    it('v10 V10-1: exports dynamicParams = false (force 404 for unknown slugs)', () => {
      // dynamicParams = false makes Next.js return 404 for slugs NOT in
      // generateStaticParams output, instead of rendering on-demand.
      expect(instructorSlugPage).toContain('export const dynamicParams = false');
    });

    it('does NOT force dynamic rendering', () => {
      expect(instructorSlugPage).not.toContain("export const dynamic = 'force-dynamic'");
    });

    it('keeps experimental_ppr = false (defensive)', () => {
      expect(instructorSlugPage).toContain(
        'export const experimental_ppr = false',
      );
    });

    it('calls notFound() in generateMetadata + page body (defense-in-depth)', () => {
      expect(instructorSlugPage).toContain('notFound()');
      const matches = instructorSlugPage.match(/notFound\(\)/g);
      expect(matches).not.toBeNull();
      expect(matches!.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('blog/[slug]/page.tsx', () => {
    it('exports generateStaticParams', () => {
      expect(blogSlugPage).toContain('generateStaticParams');
    });

    it('v10 V10-1: exports dynamicParams = false (force 404 for unknown slugs)', () => {
      expect(blogSlugPage).toContain('export const dynamicParams = false');
    });

    it('does NOT force dynamic rendering', () => {
      expect(blogSlugPage).not.toContain("export const dynamic = 'force-dynamic'");
    });

    it('keeps experimental_ppr = false (defensive)', () => {
      expect(blogSlugPage).toContain('export const experimental_ppr = false');
    });

    it('calls notFound() in multiple places (defense-in-depth)', () => {
      expect(blogSlugPage).toContain('notFound()');
      const matches = blogSlugPage.match(/notFound\(\)/g);
      expect(matches).not.toBeNull();
      expect(matches!.length).toBeGreaterThanOrEqual(2);
    });
  });
});
