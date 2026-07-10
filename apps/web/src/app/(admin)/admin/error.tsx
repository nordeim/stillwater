/**
 * F9-03 — Admin dashboard error boundary
 *
 * Source: MEP Phase 9 F9-03, PAD §10.5 (UI State Completeness),
 *         PAD §28 (Error Handling Strategy).
 */

'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function AdminDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin dashboard error:', error);
  }, [error]);

  return (
    <div className="space-y-6">
      <h1
        className="font-display text-3xl font-light text-stone-900"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Something went wrong
      </h1>
      <p className="text-sm text-stone-600">
        The admin dashboard failed to load. The error has been logged.
      </p>
      {error.digest && (
        <p
          className="text-xs text-stone-400"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          Error ID: {error.digest}
        </p>
      )}
      <Button onClick={reset} variant="outline">
        Try again
      </Button>
    </div>
  );
}
