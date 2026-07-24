/**
 * F12-23 — Newsletter signup form
 *
 * Client component using react-hook-form + Zod.
 * Submits to Resend Audience (placeholder — wire in production).
 * Anti-generic: no rounded pill button. Accessible label on input.
 *
 * V19-18 fix: replaced `focus:outline-none focus:ring-2` with the
 * SKILL.md §8.3 canonical focus pattern: `focus-visible:outline-[3px]
 * focus-visible:outline-water-500 focus-visible:outline-offset-2`.
 *
 * V19-20 fix: added honeypot field (company_website) per SKILL.md §15.13.
 * Bots fill hidden fields; humans don't. If non-empty, silently succeed.
 *
 * Source: MEP Phase 12 F12-23.
 */

'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { FOOTER_NEWSLETTER_PLACEHOLDER, FOOTER_NEWSLETTER_CTA } from '@/lib/marketing/copy';

const newsletterSchema = z.object({
  email: z.email('Please enter a valid email address'),
  // Honeypot — must be empty for a real human (V19-20)
  company_website: z.string().max(0, 'Bot detected').optional(),
});

type NewsletterValues = z.infer<typeof newsletterSchema>;

export function NewsletterForm() {
  const [isSubscribed, setIsSubscribed] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewsletterValues>({
    resolver: zodResolver(newsletterSchema),
  });

  const onSubmit = (data: NewsletterValues) => {
    // V19-20 honeypot: if the hidden field is filled, silently succeed
    // (don't error — that tells the bot it was caught).
    if (data.company_website) {
      setIsSubscribed(true);
      return;
    }
    // Log the subscription — wire to Resend Audience API or Brevo when configured.
    // In production, this would POST to an API route that calls the email provider.
    // For now, we log + show success so the UX flow is complete for E2E testing.
    if (process.env.NODE_ENV === 'development') {
      console.warn('[NewsletterForm] New subscription:', data.email);
    }
    setIsSubscribed(true);
  };

  if (isSubscribed) {
    return (
      <p
        className="text-sm text-clay-500"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        Subscribed ✓
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2" noValidate>
      <label
        htmlFor="newsletter-email"
        className="sr-only"
      >
        Email address
      </label>
      {/* V19-20 honeypot field — hidden from humans, visible to bots.
          aria-hidden + tabindex=-1 + autocomplete=off + sr-only positioning. */}
      <div aria-hidden="true" className="absolute left-[-9999px]">
        <label htmlFor="company_website">Website (leave blank)</label>
        <input
          id="company_website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register('company_website')}
        />
      </div>
      <div className="flex gap-0">
        <input
          id="newsletter-email"
          type="email"
          {...register('email')}
          placeholder={FOOTER_NEWSLETTER_PLACEHOLDER}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'newsletter-error' : undefined}
          className="flex-1 border border-stone-300 bg-transparent px-3 py-2 text-sm focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-water-500 focus-visible:outline-offset-2"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-stone-900 px-4 py-2 text-sm font-medium text-sand-50 transition-colors hover:bg-stone-800 disabled:opacity-50"
        >
          {isSubmitting ? '…' : FOOTER_NEWSLETTER_CTA}
        </button>
      </div>
      {errors.email && (
        <p id="newsletter-error" className="text-xs text-error">
          {errors.email.message}
        </p>
      )}
    </form>
  );
}
