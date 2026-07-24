/**
 * V19-19 — Terms of Service page
 *
 * Previously the Footer linked to /terms but the route did not exist (404).
 * Minimal placeholder. The studio owner should review + replace with formal
 * legal copy reviewed by a lawyer.
 *
 * Source: V19 audit finding — footer legal links 404.
 */

import { SITE } from '@stillwater/config/site';

import type { Metadata } from 'next';


export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `The terms governing your use of ${SITE.name}.`,
};

export default function TermsPage() {
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
          Terms of Service
        </h1>
      </header>

      <div className="space-y-8 text-stone-700">
        <section>
          <h2 className="mb-3 text-xl font-medium text-stone-900">
            Acceptance of Terms
          </h2>
          <p className="leading-[1.65]">
            By accessing this website and booking classes at {SITE.name}, you
            agree to be bound by these Terms of Service. If you do not agree
            with any part of these terms, please do not use our services.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-medium text-stone-900">
            Class Bookings &amp; Cancellations
          </h2>
          <p className="leading-[1.65]">
            Class spots are limited. You may cancel a booking up to 2 hours
            before the scheduled start time without penalty. Late cancellations
            or no-shows may result in the loss of a class credit. Waitlisted
            spots must be claimed within 2 hours of notification.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-medium text-stone-900">
            Memberships &amp; Payments
          </h2>
          <p className="leading-[1.65]">
            Membership fees are billed in advance on a recurring basis (monthly
            or annually, depending on your plan). You may pause or cancel your
            membership at any time through your dashboard. Cancellations take
            effect at the end of the current billing period. Refunds are
            handled on a case-by-case basis — contact us for assistance.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-medium text-stone-900">
            Liability Waiver
          </h2>
          <p className="leading-[1.65]">
            Yoga involves physical movement and carries inherent risks. You
            agree to consult your physician before beginning any exercise
            program, to inform your instructor of any injuries or medical
            conditions, and to practice within your own limits. {SITE.name} and
            its instructors are not liable for any injuries sustained during
            class.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-medium text-stone-900">
            Contact Us
          </h2>
          <p className="leading-[1.65]">
            If you have questions about these Terms, please contact us at{' '}
            <a
              href={`mailto:${SITE.email}`}
              className="text-clay-500 hover:text-clay-600"
            >
              {SITE.email}
            </a>{' '}
            or at {SITE.address.full}.
          </p>
        </section>
      </div>
    </div>
  );
}
