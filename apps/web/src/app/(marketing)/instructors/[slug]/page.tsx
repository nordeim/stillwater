import { notFound } from 'next/navigation';

import { db } from '@stillwater/db';

import type { Metadata } from 'next';

import { withTimeout } from '@/lib/async/withTimeout';

// v10 V10-1: generateStaticParams queries DB directly (not via apiCaller).
// v10 V10-1: dynamicParams = false forces 404 for unknown slugs.
// v11 V11-1: withTimeout + console.error in generateStaticParams (build resilience).
// v12 V12-1: Page body + generateMetadata now query DB directly (not via
//   apiCaller). apiCaller uses headers() which makes the page dynamic (streamed)
//   → HTTP 200 even for notFound(). By using db.query directly, the page
//   doesn't need headers() → can be static → notFound() sets correct 404.
//
// History:
//   v7 M1: experimental_ppr = false + force-dynamic + notFound(). 200 (streamed).
//   v8 F1: Regression test added. Still 200.
//   v9 V9-3: generateStaticParams via apiCaller(). 500 on valid slugs (headers() fails in SSG).
//   v10 V10-1: generateStaticParams via db directly. dynamicParams=false. Valid slugs 200 ✅, invalid 200 (empty list).
//   v11 V11-1: withTimeout + console.error. Invalid still 200 (apiCaller in page body → dynamic → streamed).
//   v12 V12-1: Page body + generateMetadata via db directly + withTimeout. No apiCaller → static → 404 works.
//
// Source: Stillwater Audit Report v10 §V10-1 + v11 §V11-1 + v12 §V12-1;
//         https://nextjs.org/docs/app/api-reference/functions/generate-static-params
//         https://nextjs.org/docs/app/api-reference/file-conventions/not-found
export const experimental_ppr = false;
export const dynamicParams = false;

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * v10 V10-1 fix: Enumerate valid instructor slugs at build time.
 * v11 V11-1 fix: Use withTimeout + .catch to handle DB unreachability
 *   gracefully. If DB is unreachable at build (local dev without Postgres,
 *   or Vercel build with cold Neon), log the error + return [].
 *   dynamicParams = false will then 404 all slugs (correct: no DB = no
 *   instructors = all slugs 404). On Vercel where DB IS reachable, the
 *   3 valid slugs are returned → dynamicParams=false 404s unknown slugs.
 *
 * v11 V11-1: The v10 try/catch silently returned [] — this made
 *   dynamicParams=false ineffective because Next.js doesn't honor
 *   dynamicParams=false when generateStaticParams returns []. The v11
 *   fix adds a console.error so the build log shows WHY [] was returned.
 *   This makes the issue debuggable without breaking the build.
 *
 * Queries the DB DIRECTLY (not via apiCaller) because apiCaller uses
 * headers() which is request-scoped and fails during build-time SSG.
 *
 * Uses withTimeout (8s) to avoid hanging on cold Neon compute.
 */
export async function generateStaticParams() {
  try {
    const allInstructors = await withTimeout(
      db.query.instructors.findMany({
        where: (instructors, { eq, and }) =>
          and(
            eq(instructors.isActive, true),
            eq(instructors.published, true),
          ),
        columns: { slug: true },
      }),
      8_000,
      [],
    );
    return allInstructors.map((i) => ({ slug: i.slug }));
  } catch (error) {
    // v11 V11-1: Log the error so it's visible in build logs.
    // The v10 try/catch silently returned [] which made dynamicParams=false
    // ineffective + impossible to debug. Now the error is logged.
    console.error('[generateStaticParams instructors] DB unreachable:', error);
    return [];
  }
}

// v12 V12-1 fix: generateMetadata + page body now query the DB DIRECTLY
// (not via apiCaller). apiCaller uses headers() which makes the page dynamic
// (streamed) → HTTP 200 even for notFound(). By querying the DB directly,
// the page doesn't need headers() → can be static → notFound() sets 404.
// withTimeout (8s) prevents hanging on cold Neon compute.

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const instructor = await withTimeout(
    db.query.instructors.findFirst({
      where: (instructors, { eq, and }) =>
        and(
          eq(instructors.slug, slug),
          eq(instructors.isActive, true),
          eq(instructors.published, true),
        ),
    }),
    8_000,
    null,
  );

  if (!instructor) {
    notFound();
  }

  return {
    title: instructor.slug.replace(/-/g, ' '),
    description: instructor.bio ?? `Meet ${instructor.slug.replace(/-/g, ' ')}`,
  };
}

export default async function InstructorDetailPage({ params }: PageProps) {
  const { slug } = await params;

  // v12 V12-1: Query DB directly (not via apiCaller) + withTimeout.
  // This avoids headers() → page can be static → notFound() sets 404.
  const instructor = await withTimeout(
    db.query.instructors.findFirst({
      where: (instructors, { eq, and }) =>
        and(
          eq(instructors.slug, slug),
          eq(instructors.isActive, true),
          eq(instructors.published, true),
        ),
    }),
    8_000,
    null,
  );

  if (!instructor) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-[2fr_3fr]">
        <div className="aspect-[3/4] border border-stone-200 bg-sand-warm">
          <div className="flex h-full items-center justify-center text-stone-400">
            <span className="text-xs uppercase tracking-wider">Portrait</span>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
            Instructor
          </p>
          <h1
            className="mt-2 text-5xl font-light capitalize text-stone-900"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {instructor.slug.replace(/-/g, ' ')}
          </h1>

          {instructor.specialties && instructor.specialties.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
                Specialties
              </p>
              <p className="mt-2 text-stone-700">
                {instructor.specialties.join(' · ')}
              </p>
            </div>
          )}

          {instructor.bio && (
            <div className="mt-8">
              <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
                About
              </p>
              <p className="mt-2 text-base leading-[1.65] text-stone-700">
                {instructor.bio}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
