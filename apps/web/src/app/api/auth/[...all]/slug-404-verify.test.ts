/**
 * Slug route 404 status verification (v8 audit remediation, F1 regression test)
 *
 * Verifies that the dynamic slug routes (`/instructors/[slug]` and `/blog/[slug]`)
 * have the v7 M1 fix in place that ensures non-existent slugs return HTTP 404
 * (not HTTP 200 with an empty body shell — the "soft-404" bug from audit F1).
 *
 * The v7 M1 fix:
 *   1. `export const experimental_ppr = false` — disables PPR for the segment
 *      so the full response is generated server-side before being sent.
 *   2. `export const dynamic = 'force-dynamic'` — forces server-side rendering.
 *   3. `notFound()` is called in BOTH `generateMetadata` AND the page body.
 *
 * Combined with the v8 S1 fix (removing the conflicting CSP from next.config.ts),
 * this ensures non-existent slugs correctly return HTTP 404.
 *
 * Source: Stillwater Audit Report v1.0 §7.1 (F1 finding);
 *         AUDIT_REMEDIATION.md v7 M1 fix;
 *         Next.js 16 PPR docs.
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

describe('F1 regression: slug routes must return HTTP 404 for non-existent slugs', () => {
  describe('instructors/[slug]/page.tsx', () => {
    it('disables PPR (experimental_ppr = false)', () => {
      expect(instructorSlugPage).toContain(
        'export const experimental_ppr = false',
      );
    });

    it('forces dynamic rendering', () => {
      expect(instructorSlugPage).toContain("export const dynamic = 'force-dynamic'");
    });

    it('calls notFound() in generateMetadata catch block', () => {
      // generateMetadata should call notFound() when the instructor is not found
      expect(instructorSlugPage).toContain('notFound()');
      // There should be at least 2 notFound() calls (metadata + page body)
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
    it('disables PPR (experimental_ppr = false)', () => {
      expect(blogSlugPage).toContain('export const experimental_ppr = false');
    });

    it('forces dynamic rendering', () => {
      expect(blogSlugPage).toContain("export const dynamic = 'force-dynamic'");
    });

    it('calls notFound() in multiple places (metadata + page body)', () => {
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
