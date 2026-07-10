/**
 * F9-11 — Revenue dashboard page (manager+ only)
 *
 * SSR page. MRR chart (12 months), churn rate, attendance metrics,
 * top-performing classes, date range picker.
 *
 * Protected by (admin)/admin/revenue/layout.tsx (requireRole manager, owner).
 *
 * Source: MEP Phase 9 F9-11.
 */

import type { Metadata } from 'next';
import { apiCaller } from '@/lib/trpc/server';
import { KpiCard } from '@/components/admin/KpiCard';
import { RevenueChart } from '@/components/admin/RevenueChart';

export const metadata: Metadata = {
  title: 'Revenue — Stillwater Admin',
};

export const dynamic = 'force-dynamic';

export default async function AdminRevenuePage() {
  const caller = await apiCaller();

  // Default: last 12 months
  const end = new Date();
  const start = new Date(end.getFullYear() - 1, end.getMonth(), 1);

  const [revenue, dashboard] = await Promise.all([
    caller.admin.getRevenueDetails({ start, end }),
    caller.admin.getDashboard(),
  ]);

  // Build chart data placeholder (real monthly breakdown requires a GROUP BY query)
  // For now, show the total as a single data point
  const chartData = [
    { month: 'Total', mrr: revenue.totalRevenueCents },
  ];

  return (
    <div className="space-y-8">
      <header>
        <p
          className="text-xs uppercase tracking-[0.2em] text-stone-500"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          Revenue Dashboard
        </p>
        <h1
          className="mt-1 font-display text-3xl font-light text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Revenue & Metrics
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          {' — '}
          {end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </header>

      {/* KPI cards */}
      <section>
        <div className="grid grid-cols-1 gap-px border border-stone-200 bg-stone-200 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Total Revenue"
            value={`$${(revenue.totalRevenueCents / 100).toFixed(0)}`}
            className="border-0 bg-sand-50"
          />
          <KpiCard
            label="Payment Count"
            value={revenue.paymentCount}
            className="border-0 bg-sand-50"
          />
          <KpiCard
            label="Churn Rate"
            value={`${revenue.churnRate.toFixed(1)}%`}
            className="border-0 bg-sand-50"
          />
          <KpiCard
            label="Avg Class Size"
            value={revenue.avgClassSize.toFixed(1)}
            className="border-0 bg-sand-50"
          />
        </div>
      </section>

      {/* MRR Chart */}
      <section>
        <h2
          className="mb-4 font-display text-xl font-light text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Revenue Trend
        </h2>
        <RevenueChart data={chartData} />
        <p className="mt-2 text-xs text-stone-500">
          Monthly breakdown requires GROUP BY aggregation query (Phase 10 enhancement).
        </p>
      </section>

      {/* Subscription metrics */}
      <section>
        <h2
          className="mb-4 font-display text-xl font-light text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Subscription Metrics
        </h2>
        <div className="grid grid-cols-1 gap-px border border-stone-200 bg-stone-200 sm:grid-cols-3">
          <div className="bg-sand-50 p-4">
            <p
              className="text-xs uppercase tracking-[0.1em] text-stone-500"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Total Subscriptions
            </p>
            <p
              className="mt-1 font-display text-2xl font-light text-stone-900"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {revenue.totalSubs}
            </p>
          </div>
          <div className="bg-sand-50 p-4">
            <p
              className="text-xs uppercase tracking-[0.1em] text-stone-500"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Cancelled
            </p>
            <p
              className="mt-1 font-display text-2xl font-light text-stone-900"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {revenue.cancelledSubs}
            </p>
          </div>
          <div className="bg-sand-50 p-4">
            <p
              className="text-xs uppercase tracking-[0.1em] text-stone-500"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              No-Show Rate
            </p>
            <p
              className="mt-1 font-display text-2xl font-light text-stone-900"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {revenue.noShowRate.toFixed(1)}%
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
