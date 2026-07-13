/**
 * F11-13 — Skip-to-main-content link
 *
 * First focusable element in DOM. Hidden visually until focused.
 * href="#main-content" jumps to <main id="main-content">.
 *
 * Source: MEP Phase 11 F11-13, PAD §22, SKILL §8.4.
 */

import Link from 'next/link';

export function SkipLink() {
  return (
    <Link
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-clay-500 focus:text-sand-100 focus:font-medium focus:text-sm"
    >
      Skip to main content
    </Link>
  );
}
