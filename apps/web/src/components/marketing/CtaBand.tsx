/**
 * F12-10 — Pre-footer CTA band
 *
 * Dark stone-900 background. "The mat is waiting." with italic sub.
 * 2 CTAs: "Begin Free Trial" (primary), "Browse Schedule" (ghost).
 *
 * V14-7 fix (2026-07-19): Restored mockup's 2-column asymmetric layout
 * (was centered single-column). Added the sub-paragraph copy.
 *
 * Source: MEP Phase 12 F12-10 + static_landing_page_mockup.html lines 2575-2593.
 */

import Link from 'next/link';

import {
  CTA_BAND_TITLE,
  CTA_BAND_SUBTITLE,
  CTA_BAND_SUB,
  CTA_BAND_PRIMARY,
  CTA_BAND_GHOST,
} from '@/lib/marketing/copy';

export function CtaBand() {
  return (
    <section
      className="bg-stone-900 px-6 py-24"
      aria-label="Call to action"
    >
      {/* V14-7: 2-column asymmetric layout (text left, CTAs right) */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 md:grid-cols-[1.5fr_1fr] md:items-center">
        <div>
          <h2
            className="font-display text-[clamp(2rem,4vw,3.5rem)] font-light leading-[1.2] text-sand-50"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {CTA_BAND_TITLE}
            <br />
            <em className="font-normal italic text-clay-300">{CTA_BAND_SUBTITLE}</em>
          </h2>
          {/* V14-7: Sub-paragraph (from mockup) */}
          <p className="mt-6 max-w-lg text-base leading-[1.75] text-stone-400">
            {CTA_BAND_SUB}
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row md:flex-col">
          <Link
            href={CTA_BAND_PRIMARY.href}
            className="bg-clay-400 px-8 py-3 text-sm font-medium text-sand-50 transition-colors hover:bg-clay-500"
          >
            {CTA_BAND_PRIMARY.label}
          </Link>
          <Link
            href={CTA_BAND_GHOST.href}
            className="border border-stone-500 px-8 py-3 text-sm font-medium text-sand-100 transition-colors hover:border-sand-50 hover:text-sand-50"
          >
            {CTA_BAND_GHOST.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
