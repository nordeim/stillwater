import type { Metadata } from 'next';

import { withTimeout } from '@/lib/async/withTimeout';
import { apiCaller } from '@/lib/trpc/server';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Membership plans and class packages for every practice.',
};

// ISR — revalidate every hour
export const revalidate = 3600;

export default async function PricingPage() {
  const caller = await apiCaller();
  // withTimeout (8s) prevents stuck Suspense when neon-http driver hangs.
  const plans = await withTimeout(
    caller.memberships.getPlans().catch(() => []),
    8_000,
    [],
  );

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

      {plans.length === 0 ? (
        <p className="text-center text-stone-600">No plans available yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {plans.map((plan, index) => (
            <div
              key={plan.id}
              className={`border p-8 ${
                index === 1
                  ? 'border-stone-900 bg-stone-900 text-sand-50'
                  : 'border-stone-200 bg-sand-50'
              }`}
            >
              <h2
                className="text-2xl font-medium"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {plan.name}
              </h2>
              <p className="mt-4 text-sm text-stone-600">
                {plan.interval === 'year' ? 'Annual' : 'Monthly'} plan
              </p>
              {plan.classCreditsPerCycle !== null && (
                <p className="mt-2 text-3xl font-light">
                  {plan.classCreditsPerCycle}
                  <span className="text-sm text-stone-500"> classes/{plan.interval}</span>
                </p>
              )}
              {plan.guestPassesPerCycle && plan.guestPassesPerCycle > 0 && (
                <p className="mt-2 text-xs text-stone-500">
                  +{plan.guestPassesPerCycle} guest passes
                </p>
              )}
              <div className="mt-8">
                <a
                  href="/schedule"
                  className={`inline-block px-6 py-3 text-sm font-medium ${
                    index === 1
                      ? 'bg-clay-500 text-sand-50 hover:bg-clay-600'
                      : 'border border-stone-400 text-stone-900 hover:bg-sand-warm'
                  }`}
                >
                  Get started
                </a>
              </div>
              {/* Note: Phase 7 wires real Stripe Checkout using plan.stripePriceId */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
