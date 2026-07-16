import type { Metadata } from 'next';

import { withTimeout } from '@/lib/async/withTimeout';
import { apiCaller } from '@/lib/trpc/server';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Membership plans and class packages for every practice.',
};

// ISR — revalidate every hour
export const revalidate = 3600;

/**
 * Format a price in cents as a USD string: 2800 → "$28", 14900 → "$149"
 * Per mockup: prices shown without decimals, with $ superscript.
 */
function formatPrice(cents: number): string {
  const dollars = Math.floor(cents / 100);
  return dollars.toLocaleString('en-US');
}

/**
 * Human-readable period label for the plan interval.
 * Per mockup: "per class" (Drop-in), "per month" (Unlimited), "use within 90 days" (10-pack).
 */
function periodLabel(plan: { name: string; interval: string }): string {
  if (plan.name === 'Pay As You Go') return 'per class';
  if (plan.name === '10 Classes') return 'use within 90 days';
  return plan.interval === 'year' ? 'per year' : 'per month';
}

/**
 * Plan tag (short descriptor above the plan name).
 * Per mockup: "Drop-in", "Monthly Membership", "Class Pack".
 */
function planTag(plan: { name: string }): string {
  if (plan.name === 'Pay As You Go') return 'Drop-in';
  if (plan.name === 'Unlimited') return 'Monthly Membership';
  if (plan.name === '10 Classes') return 'Class Pack';
  return 'Membership';
}

/**
 * CTA label per plan.
 * Per mockup: "Book Single Class", "Start Membership", "Buy Class Pack".
 */
function ctaLabel(plan: { name: string }): string {
  if (plan.name === 'Pay As You Go') return 'Book Single Class';
  if (plan.name === 'Unlimited') return 'Start Membership';
  if (plan.name === '10 Classes') return 'Buy Class Pack';
  return 'Get Started';
}

// Feature matrix per mockup §04 membership comparison table
interface FeatureRowType {
  label: string;
  values: [string, string, string]; // [dropin, unlimited, 10pack]
}

const FEATURE_ROWS: FeatureRowType[] = [
  { label: 'Unlimited classes', values: ['—', '✓', '—'] },
  { label: 'Class credits', values: ['1 per class', 'Unlimited', '10 credits'] },
  { label: 'Guest passes / month', values: ['—', '2 / month', '—'] },
  { label: 'Workshop discounts', values: ['—', '15% off', '10% off'] },
  { label: 'Online classes', values: ['✓', '✓', '✓'] },
  { label: 'Priority booking', values: ['—', '✓', '—'] },
  { label: 'Pause or cancel', values: ['Any time', 'Any time', 'Any time'] },
];

// M1 fix (v6, 2026-07-14): Fallback plans data for when DB is unreachable.
// Matches the mockup pricing section (§04) and the seed fixtures.
// This ensures /pricing always shows the 3 plans with real prices,
// even when the production DB is empty or unreachable (which happens
// when the neon-http driver times out — the withTimeout + .catch
// pattern silently returns []).
interface Plan {
  id: string;
  name: string;
  stripePriceId: string;
  interval: string;
  priceCents: number;
  classCreditsPerCycle: number | null;
  guestPassesPerCycle: number | null;
  allowsVirtual: boolean;
  allowsInPerson: boolean;
  isActive: boolean;
  sortOrder: number | null;
}

const FALLBACK_PLANS: Plan[] = [
  {
    id: 'fallback-dropin',
    name: 'Pay As You Go',
    stripePriceId: 'price_placeholder_dropin',
    interval: 'month',
    priceCents: 2800,
    classCreditsPerCycle: 1,
    guestPassesPerCycle: 0,
    allowsVirtual: true,
    allowsInPerson: true,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'fallback-unlimited',
    name: 'Unlimited',
    stripePriceId: 'price_placeholder_unlimited',
    interval: 'month',
    priceCents: 14900,
    classCreditsPerCycle: null,
    guestPassesPerCycle: 2,
    allowsVirtual: true,
    allowsInPerson: true,
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'fallback-10pack',
    name: '10 Classes',
    stripePriceId: 'price_placeholder_10pack',
    interval: 'month',
    priceCents: 22000,
    classCreditsPerCycle: 10,
    guestPassesPerCycle: 1,
    allowsVirtual: false,
    allowsInPerson: true,
    isActive: true,
    sortOrder: 3,
  },
];

export default async function PricingPage() {
  const caller = await apiCaller();
  // v8 P2 fix: .catch(() => []) is applied BEFORE withTimeout so that fast DB
  // errors (e.g., connection refused) return [] immediately without waiting
  // for the 8s timeout. withTimeout then handles the slow-but-not-erroring
  // case (e.g., cold Neon compute endpoint). The order is intentional:
  //   1. caller.memberships.getPlans() — the tRPC query (may throw or hang)
  //   2. .catch(() => []) — converts thrown errors to empty array (fast-fail)
  //   3. withTimeout(..., 8_000, []) — races against 8s timeout (slow-fail)
  // If the order were reversed, a fast DB error would wait 8s before returning.
  const dbPlans = await withTimeout(
    caller.memberships.getPlans().catch(() => []),
    8_000,
    [],
  );

  // M1 fix: Use fallback plans when DB is unreachable or empty.
  // This ensures /pricing always shows the 3 plans with real prices ($28/$149/$220),
  // matching the mockup and the home page MembershipSection behavior.
  const plans: Plan[] = dbPlans.length > 0 ? dbPlans : FALLBACK_PLANS;

  if (plans.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-16">
        <header className="mb-16 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
            Membership
          </p>
          <h1
            className="mt-2 text-5xl font-light text-stone-900"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Choose your practice
          </h1>
        </header>
        <p className="text-center text-stone-600">No plans available yet.</p>
      </div>
    );
  }

  // Sort plans by sortOrder (1=Drop-in, 2=Unlimited, 3=10-pack)
  const sortedPlans = [...plans].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const featuredIndex = sortedPlans.findIndex((p) => p.name === 'Unlimited');

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <header className="mb-16 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
          Membership
        </p>
        <h1
          className="mt-2 text-5xl font-light text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Choose your practice
        </h1>
        <p className="mt-4 max-w-xl mx-auto text-stone-600">
          Flexible options for every commitment level. No contracts, cancel anytime.
        </p>
      </header>

      {/* Membership comparison table — matches static_landing_page_mockup.html §04 */}
      <div
        className="grid grid-cols-1 overflow-hidden border border-stone-200 md:grid-cols-[220px_repeat(3,1fr)]"
        role="region"
        aria-label="Membership plan comparison"
      >
        {/* Header row */}
        <div className="hidden border-r border-b border-stone-200 bg-sand-warm p-6 md:flex md:items-end">
          <span className="text-xs uppercase tracking-[0.15em] text-stone-400">
            What&apos;s included
          </span>
        </div>

        {sortedPlans.map((plan, i) => (
          <div
            key={plan.id}
            className={`border-b border-stone-200 p-6 ${
              i === featuredIndex
                ? 'bg-stone-900 text-sand-50'
                : 'bg-sand-warm'
            } ${i < sortedPlans.length - 1 ? 'md:border-r md:border-stone-200' : ''}`}
          >
            {i === featuredIndex && (
              <span className="mb-4 inline-block border border-clay-600 px-2 py-0.5 text-xs uppercase tracking-[0.15em] text-clay-300">
                Most Popular
              </span>
            )}
            <p className={`text-xs uppercase tracking-[0.1em] ${i === featuredIndex ? 'text-clay-300' : 'text-clay-400'}`}>
              {planTag(plan)}
            </p>
            <h2
              className="mt-4 text-2xl font-normal"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {plan.name}
            </h2>
            <p className="mt-2 text-4xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
              <sup className="text-base font-normal" style={{ fontFamily: 'var(--font-body)' }}>$</sup>
              {formatPrice(plan.priceCents)}
            </p>
            <p className={`mt-1 text-sm ${i === featuredIndex ? 'text-sand-100' : 'text-stone-400'}`}>
              {periodLabel(plan)}
            </p>
          </div>
        ))}

        {/* Feature rows */}
        {FEATURE_ROWS.map((row) => (
          <FeatureRow key={row.label} row={row} featuredIndex={featuredIndex} />
        ))}

        {/* CTA footer row */}
        <div className="hidden border-r border-b border-stone-200 bg-sand-warm p-6 md:block" />
        {sortedPlans.map((plan, i) => (
          <div
            key={`cta-${plan.id}`}
            className={`border-b border-stone-200 p-6 ${
              i === featuredIndex ? 'bg-stone-900' : 'bg-sand-warm'
            } ${i < sortedPlans.length - 1 ? 'md:border-r md:border-stone-200' : ''}`}
          >
            <a
              href="/schedule"
              className={`inline-block px-6 py-3 text-sm font-medium transition-colors ${
                i === featuredIndex
                  ? 'bg-clay-500 text-sand-50 hover:bg-clay-600'
                  : 'border border-stone-400 text-stone-900 hover:bg-sand-50'
              }`}
            >
              {ctaLabel(plan)}
            </a>
          </div>
        ))}
      </div>

      <p className="mt-8 pl-4 text-sm text-stone-500" style={{ borderLeft: '2px solid var(--clay-400, #C4856A)' }}>
        All memberships include a 7-day free trial for new members. No credit card required to start.
      </p>
    </div>
  );
}

/**
 * Feature row: label cell + 3 value cells.
 * On mobile, renders as a stacked card; on desktop, a grid row.
 */
function FeatureRow({
  row,
  featuredIndex,
}: {
  row: FeatureRowType;
  featuredIndex: number;
}) {
  return (
    <>
      <div
        className="border-b border-r border-stone-200 bg-sand-50 p-4 md:p-6"
      >
        <span className="text-sm font-medium text-stone-700">{row.label}</span>
      </div>
      {row.values.map((value, i) => (
        <div
          key={i}
          className={`border-b border-stone-200 p-4 text-center md:p-6 ${
            i === featuredIndex ? 'bg-stone-900 text-sand-50' : 'bg-sand-50'
          } ${i < 2 ? 'md:border-r md:border-stone-200' : ''}`}
        >
          {value === '✓' ? (
            <span className="text-clay-400" aria-label="included">✓</span>
          ) : value === '—' ? (
            <span className="text-stone-300" aria-label="not included">—</span>
          ) : (
            <span className={`text-sm ${i === featuredIndex ? 'text-sand-100' : 'text-stone-600'}`}>
              {value}
            </span>
          )}
        </div>
      ))}
    </>
  );
}
