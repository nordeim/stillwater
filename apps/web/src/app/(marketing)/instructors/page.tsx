import Link from 'next/link';

import { and, eq, asc } from 'drizzle-orm';

import { db , instructors } from '@stillwater/db';

import type { Metadata } from 'next';

import { withTimeout } from '@/lib/async/withTimeout';


export const metadata: Metadata = {
  title: 'Instructors',
  description: 'Meet our experienced team of yoga instructors.',
};

// ISR — revalidate every 24 hours
export const revalidate = 86400;

interface InstructorSummary {
  id: string;
  slug: string;
  specialties: string[] | null;
  bio: string | null;
}

export default async function InstructorsPage() {
  // V13-1 fix: Query DB directly (NOT via apiCaller — apiCaller uses headers()
  // which opts the page out of static rendering → streaming → Loading… hang).
  // withTimeout (8s) prevents stuck Suspense when neon-http driver hangs.
  const instructorList = await withTimeout(
    db.query.instructors
      .findMany({
        where: and(
          eq(instructors.isActive, true),
          eq(instructors.published, true),
        ),
        orderBy: [asc(instructors.sortOrder), asc(instructors.slug)],
      })
      .catch(() => []),
    8_000,
    [],
  );

  const instructorsTyped = instructorList as unknown as InstructorSummary[];

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <header className="mb-16">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
          Our team
        </p>
        <h1
          className="mt-2 text-5xl font-light text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Instructors
        </h1>
      </header>

      {instructorsTyped.length === 0 ? (
        <p className="text-stone-600">No instructors yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-3">
          {instructorsTyped.map((instructor, index) => (
            <Link
              key={instructor.id}
              href={`/instructors/${instructor.slug}`}
              className={`group ${index % 2 === 1 ? 'md:mt-16' : ''}`}
            >
              <div className="aspect-[3/4] border border-stone-200 bg-sand-warm">
                <div className="flex h-full items-center justify-center text-stone-400">
                  <span className="text-xs uppercase tracking-wider">
                    Portrait
                  </span>
                </div>
              </div>
              <h2
                className="mt-4 text-2xl font-medium capitalize text-stone-900"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {instructor.slug.replace(/-/g, ' ')}
              </h2>
              {instructor.specialties && instructor.specialties.length > 0 && (
                <p className="mt-1 text-sm text-stone-600">
                  {instructor.specialties.join(' · ')}
                </p>
              )}
              {instructor.bio && (
                <p className="mt-3 text-sm leading-[1.65] text-stone-500 line-clamp-3">
                  {instructor.bio}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
