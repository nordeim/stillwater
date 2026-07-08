import type { SeatAvailabilityEvent } from '@/hooks/useSessionAvailability';

/**
 * SeatAvailability — displays live seat count with ARIA live region.
 *
 * Per SKILL §8.5: uses role="img" + aria-label="N of M spots taken"
 * for screen reader accessibility (WCAG AAA).
 *
 * Per SKILL §1.3: sharp edges (rounded-none), no drop shadows.
 */
export function SeatAvailability({
  enrolled,
  capacity,
  available,
  isFull,
}: SeatAvailabilityEvent) {
  return (
    <div
      className="flex items-center gap-3 border border-stone-200 bg-sand-50 px-4 py-3"
      role="img"
      aria-label={`${String(enrolled)} of ${String(capacity)} spots taken${isFull ? ' — Full' : `, ${String(available)} available`}`}
    >
      <div className="flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
          {isFull ? 'Full' : 'Available'}
        </p>
        <p className="mt-1 text-2xl font-light text-stone-900">
          {isFull ? '0' : available}
          <span className="text-sm text-stone-500"> / {capacity}</span>
        </p>
      </div>
      <div className="text-right">
        <p className="text-xs text-stone-500">{enrolled} enrolled</p>
      </div>
    </div>
  );
}
