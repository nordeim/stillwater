/**
 * F12-08 — § 04 Membership comparison section
 *
 * 4-column grid (label + 3 plans). Featured "Unlimited" column with
 * dark inversion. All 7 feature rows. 7-day trial note.
 *
 * Source: MEP Phase 12 F12-08.
 */

import Link from 'next/link';
import { SectionHeader } from './SectionHeader';
import { SECTION_LABELS, SECTION_TITLES, MEMBERSHIP_TRIAL_NOTE } from '@/lib/marketing/copy';

interface MembershipPlan {
  id: string;
  name: string;
  priceCents: number;
  interval: string;
  classCreditsPerCycle: number | null;
}

interface MembershipSectionProps {
  plans: MembershipPlan[];
}

const FEATURES = [
  { label: 'Weekly Classes', values: ['1 class', 'Unlimited', '10 classes'] },
  { label: 'Class Credits Roll Over', values: ['—', '✓', '✓'] },
  { label: 'Guest Passes', values: ['—', '2/month', '3 total'] },
  { label: 'Virtual Classes', values: ['—', '✓', '✓'] },
  { label: 'Workshop Discount', values: ['10%', '20%', '15%'] },
  { label: 'Mat Rental', values: ['$2', 'Free', 'Free'] },
  { label: 'Cancellation Freeze', values: ['—', '✓', '✓'] },
];

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export function MembershipSection({ plans }: MembershipSectionProps) {
  const planNames = plans.length >= 3
    ? plans.slice(0, 3).map((p) => p.name)
    : ['Drop-in', 'Unlimited', '10-Class Pack'];
  const planPrices = plans.length >= 3
    ? plans.slice(0, 3).map((p) => formatPrice(p.priceCents))
    : ['$28', '$149', '$220'];
  const featuredIndex = planNames.findIndex((n) => n.toLowerCase().includes('unlimited'));
  const featuredIdx = featuredIndex >= 0 ? featuredIndex : 1;

  return (
    <section className="bg-sand-warm px-6 py-24" aria-labelledby="membership-title">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          number="04"
          label={SECTION_LABELS.membership}
          title={SECTION_TITLES.membership}
        />

        <div className="grid grid-cols-[220px_repeat(3,1fr)] overflow-hidden border border-stone-200">
          {/* Header row */}
          <div className="bg-sand-50 p-4" />
          {planNames.map((name, i) => (
            <div
              key={i}
              className={
                i === featuredIdx
                  ? 'bg-stone-900 p-4 text-center'
                  : 'bg-sand-50 p-4 text-center'
              }
            >
              {i === featuredIdx && (
                <span
                  className="mb-2 inline-block text-[0.625rem] uppercase tracking-[0.15em] text-clay-300"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  Most Popular
                </span>
              )}
              <p
                className={
                  i === featuredIdx
                    ? 'font-display text-xl font-light text-sand-50'
                    : 'font-display text-xl font-light text-stone-900'
                }
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {name}
              </p>
              <p
                className={
                  i === featuredIdx
                    ? 'mt-1 text-sm text-sand-100'
                    : 'mt-1 text-sm text-stone-500'
                }
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {planPrices[i]}/mo
              </p>
            </div>
          ))}

          {/* Feature rows */}
          {FEATURES.map((feature, rowIdx) => (
            <div key={rowIdx} className="contents">
              <div
                className={
                  rowIdx % 2 === 0
                    ? 'border-t border-stone-200 bg-sand-50 p-4 text-sm text-stone-600'
                    : 'border-t border-stone-200 bg-sand-warm p-4 text-sm text-stone-600'
                }
              >
                {feature.label}
              </div>
              {feature.values.map((val, colIdx) => (
                <div
                  key={colIdx}
                  className={
                    colIdx === featuredIdx
                      ? `border-t border-stone-700 bg-stone-900 p-4 text-center text-sm ${
                          val === '✓' ? 'text-clay-300' : 'text-sand-100'
                        }`
                      : `border-t border-stone-200 p-4 text-center text-sm ${
                          val === '✓' ? 'text-clay-500' : 'text-stone-500'
                        } ${
                          rowIdx % 2 === 0 ? 'bg-sand-50' : 'bg-sand-warm'
                        }`
                  }
                >
                  {val}
                </div>
              ))}
            </div>
          ))}

          {/* CTA row */}
          <div className="border-t border-stone-200 bg-sand-50 p-4" />
          {planNames.map((_, i) => (
            <div
              key={i}
              className={
                i === featuredIdx
                  ? 'border-t border-stone-700 bg-stone-900 p-4 text-center'
                  : 'border-t border-stone-200 bg-sand-50 p-4 text-center'
              }
            >
              <Link
                href="/pricing"
                className={
                  i === featuredIdx
                    ? 'inline-block bg-clay-400 px-4 py-2 text-sm font-medium text-sand-50 hover:bg-clay-500'
                    : 'inline-block border border-stone-300 px-4 py-2 text-sm font-medium text-stone-600 hover:border-stone-900 hover:text-stone-900'
                }
              >
                Choose Plan
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-stone-500">
          {MEMBERSHIP_TRIAL_NOTE}
        </p>
      </div>
    </section>
  );
}
