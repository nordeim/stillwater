/**
 * Custom not-found page for the (marketing) route group.
 *
 * M3 fix (v5, 2026-07-14): Next.js streaming SSR commits HTTP 200 before
 * notFound() can throw inside a page component. A custom not-found.tsx
 * at the route segment level ensures the 404 status is set correctly
 * when notFound() is called from any page in this route group.
 *
 * Without this, /instructors/<nonexistent-slug> and /blog/<nonexistent-slug>
 * render the 404 UI but return HTTP 200 (soft-404).
 */

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
      <p
        className="text-6xl font-light text-stone-300"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        404
      </p>
      <h1
        className="mt-4 text-3xl font-light text-stone-900"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        This page could not be found.
      </h1>
      <p className="mt-4 text-stone-600">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 border border-stone-400 px-6 py-3 text-sm font-medium text-stone-900 transition-colors hover:bg-sand-warm"
      >
        Return home
      </Link>
    </div>
  );
}
