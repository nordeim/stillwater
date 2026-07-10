/**
 * F12-05 — § 01 Philosophy section
 *
 * 3-column grid: vertical-text sidebar / centered quote / 間 ornament.
 * Quote with italic + clay-400 span on "touching your toes."
 * Section number 01 added (D31 fix).
 *
 * Source: MEP Phase 12 F12-05.
 */

import { PHILOSOPHY_QUOTE, PHILOSOPHY_QUOTE_EMPHASIS, PHILOSOPHY_BODY, SECTION_LABELS, SECTION_TITLES } from '@/lib/marketing/copy';

export function Philosophy() {
  // Split quote to emphasis the last part
  const quoteParts = PHILOSOPHY_QUOTE.split(PHILOSOPHY_QUOTE_EMPHASIS);
  const before = quoteParts[0];
  const after = quoteParts[1] ?? '';

  return (
    <section
      className="bg-sand-deep px-6 py-24"
      aria-labelledby="philosophy-title"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-8">
          {/* Vertical text sidebar */}
          <div className="hidden md:block">
            <p
              className="text-[0.6875rem] uppercase tracking-[0.25em] text-stone-400"
              style={{
                fontFamily: 'var(--font-body)',
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
              }}
            >
              {SECTION_LABELS.philosophy}
            </p>
          </div>

          {/* Quote */}
          <div className="text-center">
            <span
              className="absolute -mt-12 select-none font-display text-[clamp(5rem,10vw,9rem)] font-light leading-[0.85] text-stone-200"
              style={{ fontFamily: 'var(--font-display)' }}
              aria-hidden="true"
            >
              01
            </span>
            <p
              className="relative font-display text-[clamp(2rem,4.5vw,4rem)] font-light italic leading-[1.25] text-stone-900"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {before}
              <span className="text-clay-400">{PHILOSOPHY_QUOTE_EMPHASIS}</span>
              {after}
            </p>
            <p className="mx-auto mt-8 max-w-md text-sm leading-[1.8] text-stone-500">
              {PHILOSOPHY_BODY}
            </p>
          </div>

          {/* 間 ornament */}
          <div className="hidden md:block">
            <span
              className="font-display text-6xl font-light text-stone-200"
              style={{ fontFamily: 'var(--font-display)' }}
              aria-hidden="true"
            >
              間
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
