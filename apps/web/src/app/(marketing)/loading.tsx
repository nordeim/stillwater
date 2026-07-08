/**
 * Marketing loading state.
 * Per SKILL §5.2: loading.tsx at every route segment.
 * Per SKILL §8.5: aria-busy on loading container.
 */
export default function MarketingLoading() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="flex min-h-[50vh] items-center justify-center"
    >
      <span className="sr-only">Loading…</span>
      <div
        className="h-8 w-8 animate-spin border-2 border-stone-300 border-t-stone-900"
        aria-hidden="true"
      />
    </div>
  );
}
