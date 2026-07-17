import { notFound } from 'next/navigation';

import type { Metadata } from 'next';

import { apiCaller } from '@/lib/trpc/server';

// v9 V9-3 fix: Per Next.js docs, "Next.js will return a 200 HTTP status
// code for streamed responses, and 404 for non-streamed responses."
// Dynamic pages (force-dynamic) are streamed → always 200, even when
// notFound() is called. The fix: use generateStaticParams to enumerate
// valid slugs at build time. Unknown slugs 404 at the routing layer
// (before streaming starts).
//
// History:
//   v7 M1: experimental_ppr = false + dynamic = 'force-dynamic' + notFound()
//       in generateMetadata. DID NOT WORK — live site still returned 200.
//   v8 F1: Added regression test verifying v7 M1 fix in source. Test passed
//       but live site still returned 200.
//   v9 V9-3: Removed force-dynamic. Added generateStaticParams. Kept
//       experimental_ppr = false (defensive) + notFound() (defense-in-depth).
//
// Source: Stillwater Audit Report v9 §V9-3;
//         https://nextjs.org/docs/app/api-reference/file-conventions/not-found
export const experimental_ppr = false;

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * v9 V9-3 fix: Enumerate valid instructor slugs at build time.
 * Unknown slugs (not in this list) will 404 at the routing layer
 * before streaming starts, ensuring the correct HTTP 404 status.
 *
 * Uses the tRPC instructors.list procedure (public) to fetch slugs.
 * If the DB is unreachable at build time, returns an empty array —
 * pages will be rendered on-demand (and notFound() will fire for
 * missing instructors).
 */
export async function generateStaticParams() {
  try {
    const caller = await apiCaller();
    const allInstructors = await caller.instructors.list();
    return allInstructors.map((i) => ({ slug: i.slug }));
  } catch {
    // DB unreachable at build time — return empty, render on-demand.
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
