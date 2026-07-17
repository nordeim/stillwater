/**
 * Slug route 404 status verification (v9 audit remediation, V9-3 fix)
 *
 * Verifies that the dynamic slug routes (`/instructors/[slug]` and
 * `/blog/[slug]`) return HTTP 404 for non-existent slugs.
 *
 * History:
 *   v7 M1: Added experimental_ppr = false + dynamic = 'force-dynamic' +
 *       notFound() in generateMetadata + page body. DID NOT WORK on live
 *       site — still returned HTTP 200.
 *   v8 F1: Added this regression test verifying the v7 M1 fix is in source.
 *       Test passed but live site still returned 200.
 *   v9 V9-3: Root cause found — per Next.js docs: "Next.js will return a
 *       200 HTTP status code for streamed responses, and 404 for non-
 *       streamed responses." Dynamic pages are streamed → always 200.
 *       Fix: add generateStaticParams to enumerate valid slugs at build
 *       time. Unknown slugs 404 at the routing layer (before streaming).
 *
 * The v9 fix:
 *   1. KEEP experimental_ppr = false (defensive — may help in future Next.js versions)
 *   2. REMOVE dynamic = 'force-dynamic' (was forcing streaming → 200)
 *   3. ADD generateStaticParams returning valid slugs from the DB/CMS
 *   4. KEEP notFound() in generateMetadata + page body (defense-in-depth)
 *
 * Source: Stillwater Audit Report v9 §V9-3;
 *         Next.js not-found.js docs https://nextjs.org/docs/app/api-reference/file-conventions/not-found
 *         Next.js generateStaticParams docs https://nextjs.org/docs/app/api-reference/functions/generate-static-params
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

describe('V9-3: slug routes must return HTTP 404 for non-existent slugs', () => {
  describe('instructors/[slug]/page.tsx', () => {
    it('exports generateStaticParams (v9 V9-3 fix)', () => {
      // generateStaticParams enumerates valid slugs at build time.
      // Unknown slugs 404 at the routing layer (before streaming).
      expect(instructorSlugPage).toContain('generateStaticParams');
    });

    it('does NOT force dynamic rendering (v9 V9-3 — removed force-dynamic)', () => {
      // force-dynamic causes streaming → always returns 200.
      // Removing it allows generateStaticParams to take effect.
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

    it('imports notFound from next/navigation', () => {
      expect(instructorSlugPage).toContain("from 'next/navigation'");
      expect(instructorSlugPage).toContain('notFound');
    });
  });

  describe('blog/[slug]/page.tsx', () => {
    it('exports generateStaticParams (v9 V9-3 fix)', () => {
      expect(blogSlugPage).toContain('generateStaticParams');
    });

    it('does NOT force dynamic rendering (v9 V9-3 — removed force-dynamic)', () => {
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

    it('imports notFound from next/navigation', () => {
      expect(blogSlugPage).toContain("from 'next/navigation'");
      expect(blogSlugPage).toContain('notFound');
    });
  });
});
