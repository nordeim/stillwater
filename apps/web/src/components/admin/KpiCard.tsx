/**
 * F9-13 — KpiCard: KPI card with trend indicator
 *
 * Server Component (can be used in RSC pages). Displays a label, large value,
 * optional trend percentage, and optional icon. Skeleton state for loading.
 *
 * Anti-generic: NO drop shadows, NO rounded corners. Depth via 1px rule lines
 * and color temperature. Trend up = clay-400, trend down = stone-500.
 *
 * Source: MEP Phase 9 F9-13, PAD §11 (Editorial Calm design system).
 */

import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: string | number | null;
  trend?: number | null; // percentage, e.g., 5.2 = +5.2%, -3.1 = -3.1%
  icon?: React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function KpiCard({
  label,
  value,
  trend,
  icon,
  isLoading,
  className,
}: KpiCardProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          'border border-stone-200 bg-sand-50 p-6',
          className,
        )}
      >
        <div className="mb-4 h-3 w-20 animate-pulse bg-stone-200" />
        <div className="h-8 w-28 animate-pulse bg-stone-200" />
      </div>
    );
  }

  const hasTrend = trend !== null && trend !== undefined;
  const isPositiveTrend = hasTrend && trend > 0;
  const isNegativeTrend = hasTrend && trend < 0;

  return (
    <div
      className={cn(
        'border border-stone-200 bg-sand-50 p-6 transition-colors hover:border-stone-300',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <p
          className="text-xs uppercase tracking-[0.15em] text-stone-500"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {label}
        </p>
        {icon && <span className="text-stone-400" aria-hidden="true">{icon}</span>}
      </div>

      <p
        className="mt-4 font-display text-4xl font-light text-stone-900"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {value ?? '—'}
      </p>

      {hasTrend && (
        <p
          className={cn(
            'mt-2 flex items-center gap-1 text-xs font-medium',
            isPositiveTrend && 'text-clay-500',
            isNegativeTrend && 'text-stone-500',
          )}
          style={{ fontFamily: 'var(--font-mono)' }}
          aria-label={`Trend: ${isPositiveTrend ? 'up' : 'down'} ${Math.abs(trend).toFixed(1)} percent`}
        >
          <span aria-hidden="true">{isPositiveTrend ? '↑' : isNegativeTrend ? '↓' : '→'}</span>
          {Math.abs(trend).toFixed(1)}%
        </p>
      )}
    </div>
  );
}
