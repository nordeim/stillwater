/**
 * F12-12 — Mobile nav drawer (D32 fix)
 *
 * Radix Dialog-based drawer. Slide-in from right. Focus trap.
 * Backdrop dismiss. Closes on link tap + Escape.
 *
 * Source: MEP Phase 12 F12-12.
 */

'use client';

import { useState } from 'react';

import Link from 'next/link';

import * as Dialog from '@radix-ui/react-dialog';

const NAV_LINKS = [
  { label: 'Schedule', href: '/schedule' },
  { label: 'Instructors', href: '/instructors' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Blog', href: '/blog' },
  { label: 'About', href: '/about' },
];

export function MobileNavDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          className="md:hidden"
          aria-label="Open navigation menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay
          // V13-8 fix (2026-07-19, Phase B audit A1): Removed backdrop-blur-sm
          // (glassmorphism is a banned pattern per SKILL §1.3). Replaced with
          // a solid bg-stone-900/80 overlay for the same dimming effect.
          className="fixed inset-0 z-40 bg-stone-900/80 data-[state=open]:animate-in data-[state=closed]:animate-out"
        />
        <Dialog.Content
          className="fixed right-0 top-0 z-50 h-full w-80 max-w-[85vw] bg-sand-50 p-6 shadow-none"
        >
          <Dialog.Title className="sr-only">Navigation Menu</Dialog.Title>
          <Dialog.Description className="sr-only">
            Navigate to Stillwater pages
          </Dialog.Description>

          {/* Close button */}
          <div className="mb-8 flex justify-end">
            <Dialog.Close asChild>
              <button
                aria-label="Close navigation menu"
                className="text-stone-500 hover:text-stone-900"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </Dialog.Close>
          </div>

          {/* Nav links */}
          <nav aria-label="Mobile navigation">
            <ul className="space-y-6">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Dialog.Close asChild>
                    <Link
                      href={link.href}
                      className="font-display text-2xl font-light text-stone-900 hover:text-clay-500"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {link.label}
                    </Link>
                  </Dialog.Close>
                </li>
              ))}
            </ul>
          </nav>

          {/* CTA */}
          <div className="mt-12">
            <Dialog.Close asChild>
              <Link
                href="/schedule"
                className="inline-block bg-stone-900 px-6 py-3 text-sm font-medium text-sand-50 hover:bg-stone-800"
              >
                Book a Class
              </Link>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
