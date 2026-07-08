'use client';

/**
 * BookingButton — triggers the booking mutation.
 *
 * Per SKILL §8.5: min 44x44px touch target (WCAG AAA §2.5.5).
 * Per SKILL §1.3: sharp edges, clay-500 filled button (Tier 3 CTA).
 * Per SKILL §1.5: max 1 filled CTA per section.
 */
export function BookingButton({
  onClick,
  disabled,
  isLoading,
}: {
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className="min-h-[44px] min-w-[44px] bg-clay-500 px-8 py-3 text-sm font-medium text-sand-100 transition-colors hover:bg-clay-600 disabled:cursor-not-allowed disabled:opacity-50"
      aria-busy={isLoading}
    >
      {isLoading ? 'Booking…' : 'Book this class'}
    </button>
  );
}
