/**
 * F12-10 — Pre-footer CTA band
 *
 * Dark stone-900 background. "The mat is waiting." with italic sub.
 * 2 CTAs: "Begin Free Trial" (primary), "Browse Schedule" (ghost).
 *
 * Source: MEP Phase 12 F12-10.
 */

import Link from 'next/link';
import { CTA_BAND_TITLE, CTA_BAND_SUBTITLE, CTA_BAND_PRIMARY, CTA_BAND_GHOST } from '@/lib/marketing/copy';

export function CtaBand() {
  return (
    <section
      className="bg-stone-900 px-6 py-24 text-center"
      aria-label="Call to action"
    >
      <div className="mx-auto max-w-3xl">
        <h2
          className="font-display text-[clamp(2rem,4vw,3.5rem)] font-light leading-[1.2] text-sand-50"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {CTA_BAND_TITLE}{' '}
          <em className="font-normal italic text-clay-300">{CTA_BAND_SUBTITLE}</em>
        </h2>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
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
