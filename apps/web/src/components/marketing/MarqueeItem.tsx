/**
 * F12-24 — Single marquee item
 *
 * Italic Cormorant class name, uppercase DM Sans time, 4px clay-400 dot.
 *
 * Source: MEP Phase 12 F12-24.
 */

interface MarqueeItemProps {
  className: string;
  time: string;
  instructor: string;
}

export function MarqueeItem({ className, time, instructor }: MarqueeItemProps) {
  return (
    <div className="flex items-center gap-4 px-8">
      <span
        className="font-display text-2xl font-light italic text-stone-400"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {className}
      </span>
      <span
        className="text-xs uppercase tracking-[0.12em] text-stone-300"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {time}
      </span>
      <span className="h-1 w-1 rounded-full bg-clay-400" aria-hidden="true" />
      <span
        className="text-xs uppercase tracking-[0.12em] text-stone-300"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {instructor}
      </span>
    </div>
  );
}
