'use client';

/**
 * WaitlistButton — shown when session is full (CONFLICT from bookings.book).
 *
 * Per SKILL §8.5: min 44x44px touch target (WCAG AAA §2.5.5).
 * Per SKILL §1.3: sharp edges, outline button variant (Tier 2 CTA).
 */
export function WaitlistButton({
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
      className="min-h-[44px] min-w-[44px] border border-stone-400 bg-transparent px-8 py-3 text-sm font-medium text-stone-900 transition-colors hover:bg-sand-warm disabled:cursor-not-allowed disabled:opacity-50"
      aria-busy={isLoading}
    >
      {isLoading ? 'Joining…' : 'Join Waitlist'}
    </button>
  );
}
