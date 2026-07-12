/**
 * F12-06 — § 02 Schedule preview section
 *
 * Server component fetching schedule.getWeek + client ScheduleGrid.
 * 7-day tab system. All items expandable (D35 fix).
 * Level badge colors use PAD tokens (D29 fix — --color-success for beginner).
 *
 * Source: MEP Phase 12 F12-06.
 */

import { ScheduleGrid } from './ScheduleGrid';
import { SectionHeader } from './SectionHeader';

import { SECTION_LABELS, SECTION_TITLES } from '@/lib/marketing/copy';

interface ScheduleSectionProps {
  sessions: unknown[];
}

export function ScheduleSection({ sessions }: ScheduleSectionProps) {
  return (
    <section className="px-6 py-24" aria-labelledby="schedule-title">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          number="02"
          label={SECTION_LABELS.schedule}
          title={SECTION_TITLES.schedule}
        />
        <ScheduleGrid sessions={sessions as { id: string; startsAt: Date; class: { title: string }; instructor: { slug: string }; room: { name: string } }[]} />
      </div>
    </section>
  );
}
