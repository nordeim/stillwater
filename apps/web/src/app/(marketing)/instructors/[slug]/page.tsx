import { notFound } from 'next/navigation';

import type { Metadata } from 'next';

import { db, instructors } from '@stillwater/db';

import { apiCaller } from '@/lib/trpc/server';

// v10 V10-1 fix: generateStaticParams must query the DB DIRECTLY (not via
// apiCaller). apiCaller() uses headers() from next/headers which is request-
// scoped and fails during build-time SSG on Vercel → 500 error on valid slugs.
//
// v10 V10-1: Added dynamicParams = false to force 404 for unknown slugs.
// Without this, unknown slugs trigger on-demand rendering → streaming → 200.
// With dynamicParams = false, unknown slugs 404 at the routing layer.
//
// History:
//   v7 M1: experimental_ppr = false + force-dynamic + notFound(). 200 (streamed).
//   v8 F1: Regression test added. Still 200.
//   v9 V9-3: Removed force-dynamic. Added generateStaticParams via apiCaller().
//       Build succeeded locally but live site returned 500 on valid slugs.
//   v10 V10-1: Fixed generateStaticParams to use db directly. Added dynamicParams
//       = false. Kept experimental_ppr = false + notFound() (defense-in-depth).
//
// Source: Stillwater Audit Report v10 §V10-1;
//         https://nextjs.org/docs/app/api-reference/functions/generate-static-params
//         https://nextjs.org/docs/app/api-reference/file-conventions/not-found
export const experimental_ppr = false;
export const dynamicParams = false;

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * v10 V10-1 fix: Enumerate valid instructor slugs at build time.
 *
 * Queries the DB DIRECTLY (not via apiCaller) because apiCaller uses
 * headers() which is request-scoped and fails during build-time SSG.
 *
 * Uses the Drizzle RQB callback syntax for `where` to avoid importing
 * `eq` from drizzle-orm (which isn't a direct dependency of @stillwater/web).
 *
 * If the DB is unreachable at build time, returns an empty array —
 * all slug routes will 404 (correct behavior: no instructors exist).
 */
export async function generateStaticParams() {
  try {
    const allInstructors = await db.query.instructors.findMany({
      where: (instructors, { eq, and }) =>
        and(
          eq(instructors.isActive, true),
          eq(instructors.published, true),
        ),
      columns: { slug: true },
    });
    return allInstructors.map((i) => ({ slug: i.slug }));
  } catch {
    // DB unreachable at build time — return empty.
    // dynamicParams = false means all slugs will 404 (no valid slugs known).
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
