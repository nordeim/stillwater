/**
 * F9-06 — Admin session scheduling calendar page
 *
 * SSR page. Fetches sessions for current week, passes to ScheduleCalendar.
 * Filter by instructor / room. Cancel session with reason.
 *
 * Source: MEP Phase 9 F9-06.
 */

import type { Metadata } from 'next';
import { apiCaller } from '@/lib/trpc/server';
import { ScheduleCalendar } from '@/components/admin/ScheduleCalendar';

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
  interface ScheduleSession {
    id: string;
    startsAt: Date;
    endsAt: Date;
    status: string;
    overrideCapacity: number | null;
    isVirtual: boolean;
    class?: { id: string; name: string; level: string };
    instructor?: { id: string; name: string };
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
    </div>
  );
}
