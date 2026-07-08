'use client';

/**
 * Booking page error boundary.
 * Per SKILL §5.2: error.tsx at every route segment.
 */
export default function BookingError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-3xl flex-col items-center justify-center px-6 py-16">
      <h2
        className="text-3xl font-light text-stone-900"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Couldn&apos;t load this class
      </h2>
      <p className="mt-4 text-center text-stone-600">
        We couldn&apos;t load the booking details. The class may have been removed or is no longer available.
      </p>
      <div className="mt-8 flex gap-4">
        <a
          href="/schedule"
          className="border border-stone-400 px-6 py-2 text-sm font-medium text-stone-900 transition-colors hover:bg-sand-warm"
        >
          Back to schedule
        </a>
        <button
          onClick={reset}
          className="bg-clay-500 px-6 py-2 text-sm font-medium text-sand-100 transition-colors hover:bg-clay-600"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
