/**
 * F12-19 — Single instructor row (alternating)
 *
 * Alternates portrait/content order via CSS `order`.
 * Portrait from Cloudflare Images. Name + specialty + bio + tags + link.
 *
 * Source: MEP Phase 12 F12-19.
 */

import Link from 'next/link';

interface InstructorRowProps {
  instructor: {
    id: string;
    name: string;
    slug: string;
    bio?: string | null;
  };
  index: number;
  orientation: 'left' | 'right';
}

export function InstructorRow({ instructor, index, orientation }: InstructorRowProps) {
  const isLeft = orientation === 'left';

  return (
    <div
      className="grid grid-cols-1 gap-8 border-t border-stone-200 py-12 md:grid-cols-2 md:gap-16"
    >
      {/* Portrait placeholder */}
      <div
        className={
          isLeft ? 'order-1' : 'order-1 md:order-2'
        }
      >
        <div className="aspect-[3/4] bg-sand-warm" aria-hidden="true">
          {/* Portrait would be replaced with Cloudflare Images in production */}
          <div className="flex h-full items-center justify-center">
            <span
              className="font-display text-[clamp(5rem,10vw,9rem)] font-light text-stone-100"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {String(index + 1).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        className={
          isLeft ? 'order-2' : 'order-2 md:order-1'
        }
      >
        <p
          className="text-[0.6875rem] uppercase tracking-[0.2em] text-clay-400"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Instructor
        </p>
        <h3
          className="mt-2 font-display text-[clamp(2rem,3.5vw,3rem)] font-light leading-[1.1] text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {instructor.name}
        </h3>
        {instructor.bio && (
          <p className="mt-4 max-w-sm text-sm leading-[1.75] text-stone-500">
            {instructor.bio}
          </p>
        )}
        <Link
          href={`/instructors/${instructor.slug}`}
          className="mt-6 inline-block text-sm font-medium text-stone-900 hover:text-clay-500"
        >
          Full profile →
        </Link>
      </div>
    </div>
  );
}
