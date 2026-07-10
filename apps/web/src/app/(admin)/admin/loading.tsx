/**
 * F9-03 — Admin dashboard loading skeleton
 *
 * Source: MEP Phase 9 F9-03, PAD §10.5 (UI State Completeness).
 */

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-12">
      <header>
        <div className="mb-2 h-3 w-32 animate-pulse bg-stone-200" />
        <div className="h-10 w-64 animate-pulse bg-stone-200" />
      </header>

      {/* KPI skeleton */}
      <section>
        <div className="grid grid-cols-1 gap-px border border-stone-200 bg-stone-200 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-sand-50 p-6">
              <div className="mb-4 h-3 w-20 animate-pulse bg-stone-200" />
              <div className="h-8 w-28 animate-pulse bg-stone-200" />
            </div>
          ))}
        </div>
      </section>

      {/* Schedule skeleton */}
      <section>
        <div className="mb-6 h-8 w-48 animate-pulse bg-stone-200" />
        <div className="divide-y divide-stone-200 border border-stone-200 bg-sand-50">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-6 px-6 py-4">
              <div className="h-4 w-16 animate-pulse bg-stone-200" />
              <div className="h-4 w-32 animate-pulse bg-stone-200" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
