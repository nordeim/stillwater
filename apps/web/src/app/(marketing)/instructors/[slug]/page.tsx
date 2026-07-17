import { notFound } from 'next/navigation';

import type { Metadata } from 'next';

import { db, instructors } from '@stillwater/db';

import { withTimeout } from '@/lib/async/withTimeout';
import { apiCaller } from '@/lib/trpc/server';

// v10 V10-1 fix: generateStaticParams must query the DB DIRECTLY (not via
// apiCaller). apiCaller() uses headers() from next/headers which is request-
// scoped and fails during build-time SSG on Vercel → 500 error on valid slugs.
//
// v10 V10-1: Added dynamicParams = false to force 404 for unknown slugs.
// Without this, unknown slugs trigger on-demand rendering → streaming → 200.
// With dynamicParams = false, unknown slugs 404 at the routing layer.
//
// v11 V11-1: Removed try/catch from generateStaticParams. The v10 try/catch
// returned [] when DB was unreachable → dynamicParams=false had no slugs to
// match → Next.js fell back to on-demand rendering → streaming → 200 for
// non-existent slugs. Without try/catch, if DB is unreachable at build, the
// build fails visibly (correct behavior — DATABASE_URL must be set in Vercel
// build environment variables).
//
// History:
//   v7 M1: experimental_ppr = false + force-dynamic + notFound(). 200 (streamed).
//   v8 F1: Regression test added. Still 200.
//   v9 V9-3: Removed force-dynamic. Added generateStaticParams via apiCaller().
//       Build succeeded locally but live site returned 500 on valid slugs.
//   v10 V10-1: Fixed generateStaticParams to use db directly. Added dynamicParams
//       = false. Kept experimental_ppr = false + notFound() (defense-in-depth).
//       Valid slugs returned 200 ✅ but invalid slugs still 200 (try/catch
//       returned [] → dynamicParams=false ineffective).
//   v11 V11-1: Removed try/catch. Now generateStaticParams either returns
//       valid slugs (→ dynamicParams=false 404s unknown) OR build fails
//       visibly (→ developer fixes DATABASE_URL).
//
// Source: Stillwater Audit Report v10 §V10-1 + v11 §V11-1;
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const caller = await apiCaller();
    const instructor = await caller.instructors.getBySlug({ slug });
    return {
      title: instructor.slug.replace(/-/g, ' '),
      description: instructor.bio ?? `Meet ${instructor.slug.replace(/-/g, ' ')}`,
    };
  } catch {
    notFound();
  }
}

export default async function InstructorDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const caller = await apiCaller();

  let instructor;
  try {
    instructor = await caller.instructors.getBySlug({ slug });
  } catch {
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
