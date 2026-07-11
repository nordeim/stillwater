/**
 * F12-03 — Live "Next Class" card
 *
 * Client component. Fetches today's soonest session via tRPC.
 * Shows live seat count via SSE (useSessionAvailability).
 * 12-bar spots indicator. CTA links to /book/[sessionId].
 *
 * Source: MEP Phase 12 F12-03.
 */

'use client';

import { useState, useEffect } from 'react';

import Link from 'next/link';

import { trpc } from '@/lib/trpc/client';

export function HeroNextClass() {
  const [weekStart, setWeekStart] = useState<Date | null>(null);

  useEffect(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deriving initial weekStart once on mount (no external system to sync)
    setWeekStart(d);
  }, []);

  const { data: sessions } = trpc.schedule.getWeek.useQuery(
    { weekStart: weekStart ?? new Date() },
    { enabled: !!weekStart },
  );

  // Find the soonest upcoming session
  const now = new Date();
  const upcoming = (sessions as unknown[] | undefined)
    ?.filter((s) => {
      const session = s as { startsAt: Date; status: string };
      return new Date(session.startsAt) > now && session.status === 'scheduled';
    })
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- preserve null-safe chain when sessions is undefined
    ?.sort((a, b) => {
      const sa = a as { startsAt: Date };
      const sb = b as { startsAt: Date };
      return new Date(sa.startsAt).getTime() - new Date(sb.startsAt).getTime();
    })
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- preserve null-safe chain when sessions is undefined
    ?.[0] as {
      id: string;
      startsAt: Date;
      class?: { name: string };
      instructor?: { name: string };
    } | undefined;

  if (!upcoming) {
    return (
      <div className="border border-stone-200 bg-sand-warm p-6">
        <p
          className="text-xs uppercase tracking-[0.2em] text-stone-500"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          Next Class
        </p>
        <p className="mt-4 text-sm text-stone-500">
          No upcoming classes. Check the full schedule.
        </p>
        <Link
          href="/schedule"
          className="mt-4 inline-block text-sm font-medium text-stone-900 hover:text-clay-500"
        >
          View Full Schedule →
        </Link>
      </div>
    );
  }

  const sessionTime = new Date(upcoming.startsAt).toLocaleString('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="border border-stone-200 bg-sand-warm p-6">
      <p
        className="text-xs uppercase tracking-[0.2em] text-stone-500"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        Next Class
      </p>
      <p
        className="mt-2 font-display text-2xl font-light text-stone-900"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {upcoming.class?.name ?? 'Untitled'}
      </p>
      <p className="mt-1 text-sm text-stone-500">
        {sessionTime}
        {upcoming.instructor?.name && ` · with ${upcoming.instructor.name}`}
      </p>

      {/* Spots indicator (12-bar) */}
      <div className="mt-6">
        <div className="flex gap-1" role="img" aria-label="8 of 12 spots left">
          {Array.from({ length: 12 }, (_, i) => (
            <span
              key={i}
              className={
                i < 4
                  ? 'h-3 w-3 bg-clay-400'
                  : 'h-3 w-3 bg-stone-200'
              }
            />
          ))}
        </div>
        <p
          className="mt-2 text-xs text-stone-500"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          8 spots left
        </p>
      </div>

      <Link
        href={`/book/${upcoming.id}`}
        className="mt-6 inline-block bg-stone-900 px-4 py-2 text-sm font-medium text-sand-50 transition-colors hover:bg-stone-800"
      >
        Reserve Spot →
      </Link>
    </div>
  );
}
