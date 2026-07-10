/**
 * F12-02 — Hero section
 *
 * Server component. Asymmetric grid: 1fr 1px minmax(280px, 38%).
 * Headline with <em>returning</em> italicised + clay-400.
 * "Next Class" card on right. 3 meta stats. 2 CTAs.
 *
 * Source: MEP Phase 12 F12-02.
 */

import Link from 'next/link';
import { HeroNextClass } from './HeroNextClass';
import {
  HERO_EYEBROW,
  HERO_HEADLINE_LINES,
  HERO_EMPHASIS_WORD,
  HERO_INTRO,
  HERO_META_STATS,
  HERO_CTAS,
} from '@/lib/marketing/copy';

export function Hero() {
  return (
    <section
      className="grid grid-cols-1 gap-0 px-0 md:grid-cols-[1fr_1px_minmax(280px,38%)]"
      aria-label="Welcome"
    >
      {/* Left: headline + intro + stats + CTAs */}
      <div className="px-6 py-24 md:py-32">
        {/* Eyebrow */}
        <div className="mb-8 flex items-center gap-3">
          <span className="h-px w-12 bg-clay-400" aria-hidden="true" />
          <p
            className="text-[0.6875rem] font-medium uppercase tracking-[0.2em] text-clay-400"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {HERO_EYEBROW}
          </p>
        </div>

        {/* Headline */}
        <h1
          className="font-display text-[clamp(3.5rem,6.5vw,7.5rem)] font-light leading-[1.0] tracking-[-0.01em] text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {HERO_HEADLINE_LINES.map((line, i) => (
            <span key={i} className="block">
              {line === `of ${HERO_EMPHASIS_WORD}` ? (
                <>
                  of <em className="font-normal italic text-clay-400">{HERO_EMPHASIS_WORD}</em>
                </>
              ) : (
                line
              )}
            </span>
          ))}
        </h1>

        {/* Meta stats */}
        <div className="mt-12 flex gap-8">
          {HERO_META_STATS.map((stat) => (
            <div key={stat.label}>
              <p
                className="font-display text-3xl font-light text-stone-900"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {stat.value}
              </p>
              <p
                className="text-[0.6875rem] uppercase tracking-[0.18em] text-stone-500"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Intro */}
        <p className="mt-8 max-w-md text-base leading-[1.75] text-stone-500">
          {HERO_INTRO}
        </p>

        {/* CTAs */}
        <div className="mt-10 flex gap-4">
          <Link
            href={HERO_CTAS.primary.href}
            className="bg-stone-900 px-6 py-3 text-sm font-medium text-sand-50 transition-colors hover:bg-stone-800"
          >
            {HERO_CTAS.primary.label}
          </Link>
          <Link
            href={HERO_CTAS.ghost.href}
            className="border border-stone-300 px-6 py-3 text-sm font-medium text-stone-600 transition-colors hover:border-stone-900 hover:text-stone-900"
          >
            {HERO_CTAS.ghost.label}
          </Link>
        </div>
      </div>

      {/* Vertical divider */}
      <div className="hidden bg-stone-200 md:block" aria-hidden="true" />

      {/* Right: Next Class card */}
      <div className="px-6 py-24 md:py-32">
        <HeroNextClass />
      </div>
    </section>
  );
}
