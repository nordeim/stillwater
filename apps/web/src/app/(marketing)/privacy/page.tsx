/**
 * V19-19 — Privacy Policy page
 *
 * Previously the Footer linked to /privacy but the route did not exist (404).
 * This is a minimal placeholder with the studio's actual privacy practices.
 * The studio owner should review + replace with formal legal copy.
 *
 * Source: V19 audit finding — footer legal links 404.
 */

import { SITE } from '@stillwater/config/site';

import type { Metadata } from 'next';


export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `How ${SITE.name} collects, uses, and protects your information.`,
};

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
      </header>

      <div className="space-y-8 text-stone-700">
        <section>
          <h2 className="mb-3 text-xl font-medium text-stone-900">
            Information We Collect
          </h2>
          <p className="leading-[1.65]">
            {SITE.name} collects the information you provide when creating an
            account (name, email, phone), booking classes (enrollment history),
            and managing memberships (payment method via Stripe — we never store
            your card number). We also collect anonymous analytics data via
            PostHog to improve our website.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-medium text-stone-900">
            How We Use Your Information
          </h2>
          <p className="leading-[1.65]">
            We use your information to process bookings, send class
            confirmations and reminders, manage your membership, and provide
            customer support. We do not sell or rent your personal information
            to third parties.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-medium text-stone-900">
            Data Retention
          </h2>
          <p className="leading-[1.65]">
            We retain your account information for as long as your account is
            active. Booking and payment records are retained for 7 years for
            tax and accounting purposes. You may request deletion of your
            account at any time by contacting us.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-medium text-stone-900">
            Contact Us
          </h2>
          <p className="leading-[1.65]">
            If you have questions about this Privacy Policy, please contact us
            at{' '}
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
