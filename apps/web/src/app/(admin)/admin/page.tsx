/**
 * F9-03 — Admin dashboard home page
 *
 * SSR page calling admin.getDashboard. Shows KPI cards, today's schedule,
 * and recent signups.
 *
 * Source: MEP Phase 9 F9-03, PAD §10.2 (RSC data fetching pattern).
 */

import type { Metadata } from 'next';

import { KpiCard } from '@/components/admin/KpiCard';
import { apiCaller } from '@/lib/trpc/server';

export const metadata: Metadata = {
  title: 'Admin Dashboard — Stillwater',
  description: 'Studio operations dashboard',
};

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const caller = await apiCaller();

  // Fetch dashboard KPIs + this week's schedule + recent signups in parallel
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0); // midnight today

  const [dashboard, weekSchedule, recentSignups] = await Promise.all([
    caller.admin.getDashboard(),
    caller.schedule.getWeek({ weekStart }),
    caller.admin.getRecentSignups({ limit: 5 }),
  ]);

  // Filter to today's sessions only
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const todaysSessions = (weekSchedule as {
    id: string;
    startsAt: Date;
    status: string;
    class: { title: string } | null;
    instructor: { slug: string } | null;
  }[]).filter((s) => {
    const sessionDate = new Date(s.startsAt).toISOString().split('T')[0];
    return sessionDate === today && s.status === 'scheduled';
  });

  // Format MRR (totalRevenueCents is null until Phase 10 Stripe reconciliation)
  const mrrDisplay = dashboard.totalRevenueCents
    ? `$${(dashboard.totalRevenueCents / 100).toFixed(0)}`
    : '—';

  return (
    <div className="space-y-12">
      <header>
        <p
          className="text-xs uppercase tracking-[0.2em] text-stone-500"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          Admin Dashboard
        </p>
        <h1
          className="mt-2 font-display text-4xl font-light text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Studio Overview
        </h1>
      </header>

      {/* KPI cards */}
      <section aria-label="Key metrics">
        <div className="grid grid-cols-1 gap-px border border-stone-200 bg-stone-200 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Active Members"
            value={dashboard.memberCount}
            className="border-0 bg-sand-50"
          />
          <KpiCard
            label="Upcoming Sessions"
            value={dashboard.upcomingSessionCount}
            className="border-0 bg-sand-50"
          />
          <KpiCard
            label="Processed Payments"
            value={dashboard.processedPaymentCount}
            className="border-0 bg-sand-50"
          />
          <KpiCard
            label="MRR"
            value={mrrDisplay}
            className="border-0 bg-sand-50"
          />
        </div>
      </section>

      {/* Today's schedule */}
      <section aria-label="Today's schedule">
        <h2
          className="mb-6 font-display text-2xl font-light text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Today&rsquo;s Schedule
        </h2>
        {todaysSessions.length === 0 ? (
          <div className="border border-stone-200 bg-sand-50 p-8 text-center">
            <p className="text-sm text-stone-500">
              No classes scheduled for today.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-stone-200 border border-stone-200 bg-sand-50">
            {todaysSessions.slice(0, 6).map((session) => {
              const time = new Date(session.startsAt).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              });
              return (
                <li key={session.id} className="flex items-center gap-6 px-6 py-4">
                  <span
                    className="text-sm font-medium text-stone-900"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {time}
                  </span>
                  <span className="text-sm text-stone-700">
                    {session.class?.title ?? 'Untitled class'}
                  </span>
                  {session.instructor?.slug && (
                    <span className="text-xs text-stone-500">
                      with {session.instructor.slug.replace(/-/g, ' ')}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Recent signups */}
      <section aria-label="Recent signups">
        <h2
          className="mb-6 font-display text-2xl font-light text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Recent Signups
        </h2>
        {(recentSignups as unknown[]).length === 0 ? (
          <div className="border border-stone-200 bg-sand-50 p-8 text-center">
            <p className="text-sm text-stone-500">
              No recent member signups.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-stone-200 border border-stone-200 bg-sand-50">
            {(recentSignups as {
              id: string;
              displayName: string;
              joinedAt: Date;
              user: { email: string };
            }[]).map((member) => (
              <li key={member.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-stone-900">
                    {member.displayName}
                  </p>
                  <p className="text-xs text-stone-500">{member.user.email}</p>
                </div>
                <span
                  className="text-xs text-stone-500"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {new Date(member.joinedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Quick actions */}
      <section aria-label="Quick actions">
        <h2
          className="mb-6 font-display text-2xl font-light text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-px border border-stone-200 bg-stone-200 sm:grid-cols-4">
          <a
            href="/admin/classes"
            className="bg-sand-50 p-6 text-sm font-medium text-stone-700 transition-colors hover:bg-sand-warm hover:text-stone-900"
          >
            Manage Classes
          </a>
          <a
            href="/admin/schedule"
            className="bg-sand-50 p-6 text-sm font-medium text-stone-700 transition-colors hover:bg-sand-warm hover:text-stone-900"
          >
            Schedule Session
          </a>
          <a
            href="/admin/members"
            className="bg-sand-50 p-6 text-sm font-medium text-stone-700 transition-colors hover:bg-sand-warm hover:text-stone-900"
          >
            View Members
          </a>
          <a
            href="/admin/audit-log"
            className="bg-sand-50 p-6 text-sm font-medium text-stone-700 transition-colors hover:bg-sand-warm hover:text-stone-900"
          >
            Audit Log
          </a>
        </div>
      </section>
    </div>
  );
}
