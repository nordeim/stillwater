import { and, eq, gte, lte, asc } from 'drizzle-orm';

import { db , classSessions } from '@stillwater/db';

import type { Metadata } from 'next';

import { ScheduleGrid } from '@/components/marketing/ScheduleGrid';


export const metadata: Metadata = {
  title: 'Schedule',
  description: 'View our weekly class schedule and book your next session.',
};

// V16-1 fix (2026-07-19): Use force-dynamic instead of ISR revalidate.
// Root cause: Next.js auto-wraps async Server Components in <Suspense>.
// During static prerender, if the DB query hangs, the Suspense fallback
// ("Loading…") is committed permanently. force-dynamic ensures the page
// always renders at request time where fetch() works normally.
// No apiCaller() → no headers() → no streaming → complete HTML returned.
export const dynamic = 'force-dynamic';

interface ScheduleSession {
  id: string;
  startsAt: Date;
  class: { title: string };
  instructor: { slug: string };
  room: { name: string };
}

export default async function SchedulePage() {
  // Get start of current week (Sunday)
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  // V15-1: Query DB directly with .catch(() => []) fallback (NO withTimeout).
  // The DB driver's own 10s AbortSignal timeout handles hangs.
  // .catch(() => []) ensures the page always renders (with empty data if DB fails).
  const sessions = await db.query.classSessions
    .findMany({
      where: and(
        gte(classSessions.startsAt, weekStart),
        lte(classSessions.startsAt, weekEnd),
        eq(classSessions.status, 'scheduled'),
      ),
      with: { class: true, instructor: true, room: true },
      orderBy: asc(classSessions.startsAt),
    })
    .catch(() => []);

  const typedSessions = sessions as unknown as ScheduleSession[];

  // Group sessions by date (YYYY-MM-DD)
  const grouped = new Map<string, ScheduleSession[]>();
  for (const session of typedSessions) {
    const dateKey = session.startsAt.toISOString().split('T')[0];
    if (!dateKey) continue;
    const existing = grouped.get(dateKey) ?? [];
    existing.push(session);
    grouped.set(dateKey, existing);
  }

  const sortedDays = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <header className="mb-12">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
          Weekly Schedule
        </p>
        <h1
          className="mt-2 text-4xl font-light text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Find your practice
        </h1>
      </header>

      {sortedDays.length === 0 ? (
        <p className="text-stone-600">No classes scheduled this week.</p>
      ) : (
        <div className="space-y-8">
          {sortedDays.map(([date, daySessions]) => (
            <section key={date} className="border-t border-stone-200 pt-6">
              <h2 className="text-lg font-medium text-stone-900">
                {new Date(date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </h2>
              <div className="mt-4">
                <ScheduleGrid sessions={daySessions} />
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
