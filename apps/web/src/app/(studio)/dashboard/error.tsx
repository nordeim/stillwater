'use client';

export default function DashboardError({
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
        Couldn&apos;t load your dashboard
      </h2>
      <p className="mt-4 text-center text-stone-600">
        We couldn&apos;t load your dashboard data. Please try again.
      </p>
      <button
        onClick={reset}
        className="mt-8 border border-stone-400 px-6 py-2 text-sm font-medium text-stone-900 transition-colors hover:bg-sand-warm"
      >
        Try again
      </button>
    </div>
  );
}
