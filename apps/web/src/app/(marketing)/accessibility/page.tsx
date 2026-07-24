/**
 * V19-19 — Accessibility Statement page
 *
 * Previously the Footer linked to /accessibility but the route did not exist (404).
 * Documents our commitment to WCAG 2.2 Level AA conformance (per CONFLICT-RESOLVE
 * finding #11 — AAA is not recommended for entire sites per W3C guidance).
 *
 * Source: V19 audit finding — footer legal links 404.
 */

import { SITE } from '@stillwater/config/site';

import type { Metadata } from 'next';


export const metadata: Metadata = {
  title: 'Accessibility Statement',
  description: `${SITE.name}'s commitment to web accessibility (WCAG 2.2 AA).`,
};

export default function AccessibilityPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <header className="mb-12">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
          Legal
        </p>
        <h1
          className="mt-2 text-5xl font-light text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Accessibility Statement
        </h1>
      </header>

      <div className="space-y-8 text-stone-700">
        <section>
          <h2 className="mb-3 text-xl font-medium text-stone-900">
            Our Commitment
          </h2>
          <p className="leading-[1.65]">
            {SITE.name} is committed to making our website accessible to
            everyone, including people with disabilities. We aim to conform to
            the Web Content Accessibility Guidelines (WCAG) 2.2 Level AA — the
            standard recommended by the W3C and required by the US Department
            of Justice under ADA Title II (effective April 26, 2027).
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-medium text-stone-900">
            What We&apos;ve Done
          </h2>
          <ul className="space-y-2 leading-[1.65]">
            <li>
              • Semantic HTML5 structure with proper heading hierarchy
            </li>
            <li>
              • Skip-to-content link as the first focusable element on every page
            </li>
            <li>
              • Keyboard navigation support with visible focus indicators
              (3px water-500 outline)
            </li>
            <li>
              • ARIA landmarks, labels, and live regions for dynamic content
            </li>
            <li>
              • Color contrast meeting WCAG 2.2 AA requirements (4.5:1 for
              normal text, 3:1 for large text)
            </li>
            <li>
              • Touch targets meeting WCAG 2.5.8 Target Size (Minimum) — 24×24
              CSS pixels
            </li>
            <li>
              • Respects the prefers-reduced-motion media query
            </li>
            <li>
              • Automated accessibility testing via axe-core in our E2E suite
              + Lighthouse Accessibility audit (target: 100)
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-medium text-stone-900">
            Known Limitations
          </h2>
          <p className="leading-[1.65]">
            Despite our best efforts, some content may not yet fully conform to
            AA. We are continuously improving the accessibility of our site.
            If you encounter an accessibility barrier, please let us know so we
            can fix it.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-medium text-stone-900">
            Contact Us
          </h2>
          <p className="leading-[1.65]">
            If you have an accessibility request or encounter a barrier, please
            contact us at{' '}
            <a
              href={`mailto:${SITE.email}`}
              className="text-clay-500 hover:text-clay-600"
            >
              {SITE.email}
            </a>{' '}
            or call us at {SITE.phone}.
          </p>
        </section>
      </div>
    </div>
  );
}
