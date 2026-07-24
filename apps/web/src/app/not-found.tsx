/**
 * V20-3 — Root not-found page.
 *
 * Before V20-3, only `(marketing)/not-found.tsx` existed. Next.js only uses
 * a route-group not-found.tsx when the route group has its own layout AND
 * the notFound() call happens inside that route group. For unmatched URLs
 * at the root level (e.g. /nonexistent-route), Next.js fell back to the
 * DEFAULT 404 page (`<h1 class="next-error-h1">`).
 *
 * This root not-found.tsx re-exports the marketing 404 UI so ALL 404s
 * (root-level + route-group-level) render the branded "Return home" page.
 *
 * Source: V20 E2E finding — /nonexistent-route showed default Next.js 404.
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
