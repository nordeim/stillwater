import { notFound } from 'next/navigation';

import type { Metadata } from 'next';

import { apiCaller } from '@/lib/trpc/server';

// R3 fix v3 (v6, 2026-07-14): Use force-dynamic AND call notFound() from
// generateMetadata (which runs BEFORE the page component streams). This
// ensures the HTTP 404 status is set before any response body is sent.
// Previous v4/v5 approaches (force-dynamic alone, custom not-found.tsx)
// didn't work because notFound() was called inside the page component
// AFTER streaming had started.
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
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
    // M2 fix: Call notFound() HERE (in generateMetadata) instead of in the
    // page component. generateMetadata runs BEFORE the page streams, so
    // notFound() here sets the correct HTTP 404 status before any response
    // body is committed.
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
    // R3 fix: notFound() throws NEXT_NOT_FOUND which Next.js catches and
    // renders the 404 page with HTTP 404 status. The generateMetadata
    // catch block above returns noindex metadata for this case.
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
