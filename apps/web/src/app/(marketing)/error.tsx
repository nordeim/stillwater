'use client';

/**
 * Marketing error boundary.
 * Per SKILL §5.2: error.tsx at every route segment.
 * This is a Client Component — error boundaries must be client-side.
 */
export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-16">
      <h2
        className="text-3xl font-light text-stone-900"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Something went wrong
      </h2>
      <p className="mt-4 max-w-md text-center text-stone-600">
        An unexpected error occurred. Please try again.
      </p>
      {process.env.NODE_ENV === 'development' && (
        <pre className="mt-4 max-w-lg overflow-auto bg-stone-100 p-4 text-xs text-stone-700">
          {error.message}
        </pre>
      )}
      <button
        onClick={reset}
        className="mt-8 border border-stone-400 px-6 py-2 text-sm font-medium text-stone-900 transition-colors hover:bg-sand-warm"
      >
        Try again
      </button>
    </div>
  );
}
