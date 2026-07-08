import Link from 'next/link';

import type { Metadata } from 'next';

import { apiCaller } from '@/lib/trpc/server';

export const metadata: Metadata = {
  title: 'Stillwater Yoga Studio — Mindful Movement in SE Portland',
  description:
    'A sanctuary for mindful movement. Book Vinyasa, Ashtanga, Yin, and Restorative classes with experienced instructors in Southeast Portland.',
};

// ISR — revalidate every 5 minutes
export const revalidate = 300;

export default async function HomePage() {
  // Fetch live schedule for the current week
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const caller = await apiCaller();
  const instructors = await caller.instructors.list();

  return (
    <>
      {/* Hero — asymmetric 3-col per SKILL §17.2 */}
      <section className="grid grid-cols-1 gap-0 px-0 md:grid-cols-[1fr_1px_minmax(280px,38%)]">
        <div className="px-6 py-24 md:py-32">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
            Southeast Portland
          </p>
          <h1
            className="mt-4 text-5xl font-light leading-[1.05] text-stone-900 md:text-7xl"
            style={{ fontFamily: 'var(--font-display)', textWrap: 'balance' }}
          >
            Find your stillness
          </h1>
          <p className="mt-6 max-w-md text-lg leading-[1.65] text-stone-600">
            A sanctuary for mindful movement. Vinyasa, Ashtanga, Yin, and
            Restorative classes for every body.
          </p>
          <div className="mt-10 flex items-center gap-4">
            <Link
              href="/schedule"
              className="bg-clay-500 px-8 py-3 text-sm font-medium text-sand-100 transition-colors hover:bg-clay-600"
            >
              Book a class
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-stone-900 underline-offset-4 hover:underline"
            >
              Learn more
            </Link>
          </div>
        </div>
        {/* Vertical rule — editorial divider */}
        <div className="hidden bg-stone-200 md:block" />
        <div className="bg-sand-warm px-6 py-24 md:py-32">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
            This week
          </p>
          <p className="mt-4 text-stone-600">
            {instructors.length} instructors guiding your practice
          </p>
          <Link
            href="/schedule"
            className="mt-6 inline-block text-sm font-medium text-clay-500 underline-offset-4 hover:underline"
          >
            View full schedule →
          </Link>
        </div>
      </section>

      {/* Philosophy section */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
            Our philosophy
          </p>
          <p
            className="mt-6 text-2xl font-light leading-[1.4] text-stone-900 md:text-3xl"
            style={{ fontFamily: 'var(--font-display)', textWrap: 'balance' }}
          >
            We believe yoga is not about touching your toes — it&apos;s about
            what you learn on the way down.
          </p>
        </div>
      </section>

      {/* Instructors preview */}
      {instructors.length > 0 && (
        <section className="border-t border-stone-200 px-6 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
                  Your guides
                </p>
                <h2
                  className="mt-2 text-4xl font-light text-stone-900"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Meet our instructors
                </h2>
              </div>
              <Link
                href="/instructors"
                className="hidden text-sm font-medium text-clay-500 underline-offset-4 hover:underline md:inline-block"
              >
                View all →
              </Link>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
              {instructors.slice(0, 3).map((instructor) => (
                <Link
                  key={instructor.id}
                  href={`/instructors/${instructor.slug}`}
                  className="group"
                >
                  <div className="aspect-[3/4] border border-stone-200 bg-sand-warm">
                    {/* Image placeholder — Phase 12 wires Cloudflare Images */}
                    <div className="flex h-full items-center justify-center text-stone-400">
                      <span className="text-xs uppercase tracking-wider">
                        Portrait
                      </span>
                    </div>
                  </div>
                  <h3
                    className="mt-4 text-xl font-medium text-stone-900"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {instructor.slug.replace(/-/g, ' ')}
                  </h3>
                  {instructor.specialties && (
                    <p className="mt-1 text-sm text-stone-600">
                      {instructor.specialties.join(' · ')}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
