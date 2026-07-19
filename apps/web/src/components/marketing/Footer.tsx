/**
 * F12-11 — Marketing footer (PATCHED — replaces Phase 4 stub)
 *
 * 4 columns: brand+address, navigate, hours, newsletter.
 * Giant "STILLWATER" watermark. Bottom bar (Privacy/Terms/Accessibility).
 *
 * V14-2 fix (2026-07-19): Restored mockup fidelity:
 *   - Address: "2847 SE Division Street" (was fabricated "123 SE")
 *   - Phone + email links added
 *   - Hours: 3 rows (Mon-Fri/Sat/Sun) matching mockup (was 2 rows)
 *   - Brand text paragraph added
 *   - Social links: Instagram + YouTube (was Instagram + Facebook)
 *   - Watermark: changed from stone-800 (invisible on stone-900) to stone-800
 *     but with reduced opacity for subtle visibility
 *
 * Source: MEP Phase 12 F12-11 + static_landing_page_mockup.html lines 2599-2680.
 */

import Link from 'next/link';

import { NewsletterForm } from './NewsletterForm';

import {
  FOOTER_NEWSLETTER_LABEL,
  FOOTER_COPYRIGHT,
  FOOTER_LINKS,
  FOOTER_HOURS,
  FOOTER_ADDRESS,
  FOOTER_PHONE,
  FOOTER_EMAIL,
  FOOTER_BRAND_TEXT,
  FOOTER_SOCIAL_LINKS,
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
              {/* V14-2: Brand text paragraph (from mockup) */}
              <p className="mt-3 max-w-xs text-sm leading-[1.65] text-stone-400">
                {FOOTER_BRAND_TEXT}
              </p>
              <address
                className="mt-4 text-sm leading-[1.9] text-stone-400 not-italic"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {FOOTER_ADDRESS}
                <br />
                <a
                  href={`tel:${FOOTER_PHONE.replace(/[^0-9+]/g, '')}`}
                  className="transition-colors hover:text-clay-400"
                >
                  {FOOTER_PHONE}
                </a>
                <br />
                <a
                  href={`mailto:${FOOTER_EMAIL}`}
                  className="transition-colors hover:text-clay-400"
                >
                  {FOOTER_EMAIL}
                </a>
              </address>
              {/* V14-5: Social links — Instagram + YouTube (from mockup) */}
              <div className="mt-4 flex gap-4">
                {FOOTER_SOCIAL_LINKS.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    className="text-xs text-stone-500 transition-colors hover:text-sand-50"
                    aria-label={`Stillwater on ${social.label}`}
                  >
                    {social.label}
                  </a>
                ))}
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
                Studio Hours
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-stone-400">
                {FOOTER_HOURS.map((entry) => (
                  <li key={entry.day} className="flex flex-col">
                    <span className="text-stone-400">{entry.day}</span>
                    <span
                      className="text-stone-500"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {entry.hours}
                    </span>
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
          className="font-display text-[clamp(4rem,14vw,12rem)] font-light leading-[1] text-stone-800/40"
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}
        >
          STILLWATER
        </span>
      </div>
    </footer>
  );
}
