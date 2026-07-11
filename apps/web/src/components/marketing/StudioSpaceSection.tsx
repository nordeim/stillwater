/**
 * F12-09 — § 05 Studio Space section
 *
 * 3-column grid with grid-row: span 2 for tall image.
 * Main Hall + Stillness Room + Sunrise Room (D-draft fix).
 * Dark stats block (42+ classes, 8 instructors).
 *
 * Source: MEP Phase 12 F12-09.
 */

import { SectionHeader } from './SectionHeader';
import { StudioSpaceSVG } from './StudioSpaceSVG';

import { SECTION_LABELS, SECTION_TITLES } from '@/lib/marketing/copy';
import { STATS_DISPLAY } from '@/lib/marketing/stats';

export function StudioSpaceSection() {
  return (
    <section className="px-6 py-24" aria-labelledby="studio-title">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          number="05"
          label={SECTION_LABELS.studio}
          title={SECTION_TITLES.studio}
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Main Hall — spans 2 rows */}
          <div className="md:row-span-2">
            <StudioSpaceSVG variant="main-hall" />
            <p className="mt-4 text-sm text-stone-600">
              Our largest space, with floor-to-ceiling windows and room for 20 mats.
            </p>
          </div>

          {/* Stats block (dark) */}
          <div className="bg-stone-900 p-8">
            {STATS_DISPLAY.map((stat) => (
              <div key={stat.label} className="mb-6 last:mb-0">
                <p
                  className="font-display text-[clamp(3rem,5vw,5rem)] font-light text-sand-50"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {stat.value}
                </p>
                <p
                  className="text-xs uppercase tracking-[0.15em] text-stone-400"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* Stillness Room */}
          <div>
            <StudioSpaceSVG variant="stillness-room" />
            <p className="mt-4 text-sm text-stone-600">
              An intimate space for meditation and restorative practice.
            </p>
          </div>

          {/* Sunrise Room */}
          <div>
            <StudioSpaceSVG variant="sunrise-room" />
            <p className="mt-4 text-sm text-stone-600">
              Our newest space, bathed in morning light for early practices.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
