/**
 * F12-11 — Marketing footer (PATCHED — replaces Phase 4 stub)
 *
 * 4 columns: brand+address, navigate, hours, newsletter.
 * Giant "STILLWATER" watermark. Bottom bar (Privacy/Terms/Accessibility).
 *
 * Source: MEP Phase 12 F12-11.
 */

import Link from 'next/link';
import { NewsletterForm } from './NewsletterForm';
import {
  FOOTER_NEWSLETTER_LABEL,
  FOOTER_COPYRIGHT,
  FOOTER_LINKS,
  FOOTER_HOURS,
  FOOTER_ADDRESS,
} from '@/lib/marketing/copy';

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-stone-200 bg-stone-900">
      {/* Main content */}
      <div className="px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.5fr_1fr_1fr_1.5fr]">
            {/* Brand + address */}
            <div>
              <h2
                className="font-display text-2xl font-light text-sand-50"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Stillwater
              </h2>
              <address
                className="mt-4 text-sm leading-[1.9] text-stone-400 not-italic"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {FOOTER_ADDRESS}
              </address>
              <div className="mt-4 flex gap-4">
                <a
                  href="https://instagram.com"
                  className="text-xs text-stone-500 hover:text-sand-50"
                  aria-label="Instagram"
                >
                  Instagram
                </a>
                <a
                  href="https://facebook.com"
                  className="text-xs text-stone-500 hover:text-sand-50"
                  aria-label="Facebook"
                >
                  Facebook
                </a>
              </div>
            </div>

            {/* Navigate */}
            <div>
              <h3
                className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Navigate
              </h3>
              <ul className="mt-4 space-y-3 text-sm">
                {FOOTER_LINKS.navigate.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-stone-400 transition-colors hover:text-sand-50"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Hours */}
            <div>
              <h3
                className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Hours
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-stone-400">
                {FOOTER_HOURS.map((entry) => (
                  <li key={entry.day}>
                    <p className="text-stone-400">{entry.day}</p>
                    <p
                      className="text-stone-500"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {entry.hours}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Newsletter */}
            <div>
              <h3
                className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {FOOTER_NEWSLETTER_LABEL}
              </h3>
              <p className="mt-4 text-sm text-stone-400">
                Monthly schedule updates, workshop announcements, and studio news.
              </p>
              <div className="mt-4">
                <NewsletterForm />
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-stone-800 pt-6 md:flex-row">
            <p className="text-xs text-stone-500">{FOOTER_COPYRIGHT}</p>
            <div className="flex gap-6">
              {FOOTER_LINKS.legal.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-xs text-stone-500 hover:text-stone-300"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Giant STILLWATER watermark */}
      <div
        className="select-none overflow-hidden text-center"
        aria-hidden="true"
      >
        <span
          className="font-display text-[clamp(4rem,14vw,12rem)] font-light leading-[1] text-stone-800"
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}
        >
          STILLWATER
        </span>
      </div>
    </footer>
  );
}
