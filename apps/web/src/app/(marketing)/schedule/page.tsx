import type { Metadata } from 'next';

import { ScheduleGrid } from '@/components/marketing/ScheduleGrid';
import { withTimeout } from '@/lib/async/withTimeout';
import { apiCaller } from '@/lib/trpc/server';

export const metadata: Metadata = {
  title: 'Schedule',
  description: 'View our weekly class schedule and book your next session.',
};

// Live data — always fresh (no ISR)
export const dynamic = 'force-dynamic';

export default async function SchedulePage() {
  // Get start of current week (Sunday)
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const caller = await apiCaller();
  // withTimeout (8s) prevents stuck Suspense when neon-http driver hangs.
  const sessions = await withTimeout(
    caller.schedule.getWeek({ weekStart }).catch(() => []),
    8_000,
    [],
  );

  // Group sessions by date (YYYY-MM-DD)
  // Note: Drizzle 0.45 relational query types infer as `never` for nested `with`
  // (SKILL §9.9 Gotcha 27). We cast to the expected shape for rendering.
  interface ScheduleSession {
    id: string;
    startsAt: Date;
    class: { title: string };
    instructor: { slug: string };
    room: { name: string };
  }
  const typedSessions = sessions as unknown as ScheduleSession[];

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
