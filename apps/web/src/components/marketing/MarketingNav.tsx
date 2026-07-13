import Link from 'next/link';

import { MobileNavDrawer } from './MobileNavDrawer';

/**
 * Marketing navigation — single-line rule nav, flush wordmark left, CTA flush right.
 * Per SKILL §1.3: NO sticky nav with logo left, links center, CTA right (anti-generic).
 * Per SKILL §1.5: At most one filled (Tier 3) CTA per visible section.
 *
 * Mobile nav uses Radix Dialog drawer (MobileNavDrawer) — accessible, focus-trapped.
 */
export function MarketingNav() {
  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className="flex items-center justify-between border-b border-stone-200 bg-sand-50 px-6 py-4"
    >
      {/* Wordmark — flush left */}
      <Link
        href="/"
        className="font-display text-2xl font-light tracking-tight text-stone-900"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Stillwater
      </Link>

      {/* Desktop nav links (hidden on mobile) */}
      <div className="hidden items-center gap-8 md:flex">
        <Link
          href="/schedule"
          className="text-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
        >
          Schedule
        </Link>
        <Link
          href="/instructors"
          className="text-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
        >
          Instructors
        </Link>
        <Link
          href="/pricing"
          className="text-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
        >
          Pricing
        </Link>
        <Link
          href="/blog"
          className="text-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
        >
          Blog
        </Link>
        <Link
          href="/about"
          className="text-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
        >
          About
        </Link>
      </div>

      {/* CTA — flush right (Tier 3: filled button, max 1 per section) */}
      <Link
        href="/schedule"
        className="hidden bg-clay-500 px-6 py-2 text-sm font-medium text-sand-100 transition-colors hover:bg-clay-600 md:inline-block"
      >
        Book
      </Link>

      {/* Mobile nav drawer (hidden on desktop) — replaces former sr-only stub */}
      <MobileNavDrawer />
    </nav>
  );
}
