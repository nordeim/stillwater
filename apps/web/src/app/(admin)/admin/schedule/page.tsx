/**
 * F9-06 — Admin session scheduling calendar page
 *
 * SSR page. Fetches sessions for current week, passes to ScheduleCalendar.
 * Includes a session list below the calendar with cancel functionality.
 *
 * Source: MEP Phase 9 F9-06.
 */

import type { Metadata } from 'next';

import { CancelSessionButton } from '@/components/admin/CancelSessionButton';
import { ScheduleCalendar } from '@/components/admin/ScheduleCalendar';
import { apiCaller } from '@/lib/trpc/server';

export const metadata: Metadata = {
  title: 'Schedule — Stillwater Admin',
};

export const dynamic = 'force-dynamic';

export default async function AdminSchedulePage() {
  const caller = await apiCaller();

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);

  const sessions = await caller.schedule.getWeek({ weekStart });

  // Cast for Drizzle relational type inference (SKILL §9.9 Gotcha 27)
  // V19-3/V19-6 fix: class.title (not class.name) + instructor.user.name
  // (instructors table has only slug, not name; name lives on users).
  interface ScheduleSession {
    id: string;
    startsAt: Date;
    endsAt: Date;
    status: string;
    overrideCapacity: number | null;
    isVirtual: boolean;
    class?: { id: string; title: string; level: string };
    instructor?: { id: string; slug: string; user?: { name: string | null } | null };
    room?: { id: string; name: string } | null;
  }
  const typedSessions = sessions as unknown as ScheduleSession[];

  return (
    <div className="space-y-8">
      <header>
        <p
          className="text-xs uppercase tracking-[0.2em] text-stone-500"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          Session Scheduling
        </p>
        <h1
          className="mt-1 font-display text-3xl font-light text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Schedule
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          Week of {weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
          Click an empty slot to create a session. Drag to reschedule (coming Phase 10).
        </p>
      </header>

      <ScheduleCalendar weekStart={weekStart} sessions={typedSessions} />

      {/* Session list with cancel */}
      <section aria-label="Session list">
        <h2
          className="mb-6 font-display text-2xl font-light text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          This Week&rsquo;s Sessions
        </h2>
        {typedSessions.length === 0 ? (
          <div className="border border-stone-200 bg-sand-50 p-8 text-center">
            <p className="text-sm text-stone-500">
              No sessions scheduled this week.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-stone-200 border border-stone-200 bg-sand-50">
            {typedSessions.map((session) => (
              <li
                key={session.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex items-center gap-6">
                  <span
                    className="text-sm font-medium text-stone-900"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {new Date(session.startsAt).toLocaleString('en-US', {
                      weekday: 'short',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </span>
                  <span className="text-sm text-stone-700">
                    {session.class?.title ?? 'Untitled class'}
                  </span>
                  {session.instructor?.user?.name && (
                    <span className="text-xs text-stone-500">
                      with {session.instructor.user.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={
                      session.status === 'scheduled'
                        ? 'text-xs uppercase tracking-[0.1em] text-clay-500'
                        : 'text-xs uppercase tracking-[0.1em] text-stone-400'
                    }
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {session.status}
                  </span>
                  {session.status === 'scheduled' && (
                    <CancelSessionButton sessionId={session.id} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
