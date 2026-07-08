export default function DashboardLoading() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="mx-auto flex min-h-[50vh] max-w-7xl items-center justify-center px-6 py-16"
    >
      <span className="sr-only">Loading dashboard…</span>
      <div
        className="h-8 w-8 animate-spin border-2 border-stone-300 border-t-stone-900"
        aria-hidden="true"
      />
    </div>
  );
}
