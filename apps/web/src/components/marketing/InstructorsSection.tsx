/**
 * F12-07 — § 03 Instructors preview section
 *
 * 3 alternating rows. "View all 8 instructors" link.
 *
 * Source: MEP Phase 12 F12-07.
 */

import Link from 'next/link';

import { InstructorRow } from './InstructorRow';
import { SectionHeader } from './SectionHeader';

import { SECTION_LABELS, SECTION_TITLES } from '@/lib/marketing/copy';

interface InstructorsSectionProps {
  instructors: {
    id: string;
    name: string;
    slug: string;
    bio?: string | null;
  }[];
}

export function InstructorsSection({ instructors }: InstructorsSectionProps) {
  const preview = instructors.slice(0, 3);

  return (
    <section className="px-6 py-24" aria-labelledby="instructors-title">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          number="03"
          label={SECTION_LABELS.instructors}
          title={SECTION_TITLES.instructors}
        />

        <div>
          {preview.map((instructor, i) => (
            <InstructorRow
              key={instructor.id}
              instructor={instructor}
              index={i}
              orientation={i % 2 === 0 ? 'left' : 'right'}
            />
          ))}
        </div>

        <div className="mt-12 border-t border-stone-200 pt-8">
          <Link
            href="/instructors"
            className="text-sm font-medium text-stone-900 hover:text-clay-500"
          >
            View all {instructors.length || 8} instructors →
          </Link>
        </div>
      </div>
    </section>
  );
}
