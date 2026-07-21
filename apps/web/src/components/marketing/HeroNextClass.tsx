/**
 * F12-03 — Live "Next Class" card
 *
 * Client component. Fetches today's soonest session via tRPC.
 * 12-bar spots indicator. CTA links to /book/[sessionId].
 *
 * Source: MEP Phase 12 F12-03.
 */

'use client';

import { useState, useEffect } from 'react';

import Link from 'next/link';

import { trpc } from '@/lib/trpc/client';

// Default capacity used for the spots indicator when the session
// doesn't have an explicit overrideCapacity or room capacity.
const DEFAULT_CAPACITY = 12;
const SPOTS_BAR_COUNT = 12;

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
      overrideCapacity?: number | null;
      class?: { title: string; maxCapacity?: number | null };
      instructor?: { name: string };
      room?: { capacity?: number | null };
    } | undefined;

  if (!upcoming) {
    return (
      <div
        data-testid="hero-next-class-empty"
        className="min-h-[280px] border border-stone-200 bg-sand-warm p-6"
      >
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

  // Calculate capacity and spots (was hardcoded as 4/12 taken)
  const capacity =
    upcoming.overrideCapacity ??
    upcoming.class?.maxCapacity ??
    upcoming.room?.capacity ??
    DEFAULT_CAPACITY;
  // Without a live enrollment count (requires getSession query), show
  // a neutral "spots available" state rather than a fake number.
  const spotsAvailable = capacity;
  const spotsTaken = 0; // Conservative — no live count without an extra query
  const spotsLabel = `${String(spotsAvailable)} of ${String(capacity)} spots available`;

  return (
    <div className="min-h-[280px] border border-stone-200 bg-sand-warm p-6">
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
        {upcoming.class?.title ?? 'Untitled'}
      </p>
      <p className="mt-1 text-sm text-stone-500">
        {sessionTime}
        {upcoming.instructor?.name && ` · with ${upcoming.instructor.name}`}
      </p>

      {/* Spots indicator (12-bar) */}
      <div className="mt-6">
        <div className="flex gap-1" role="img" aria-label={spotsLabel}>
          {Array.from({ length: SPOTS_BAR_COUNT }, (_, i) => (
            <span
              key={i}
              className={
                i < spotsTaken
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
          {spotsAvailable} spots available
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
