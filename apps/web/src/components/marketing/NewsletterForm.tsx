/**
 * F12-23 — Newsletter signup form
 *
 * Client component using react-hook-form + Zod.
 * Submits to Resend Audience (placeholder — wire in production).
 * Anti-generic: no rounded pill button. Accessible label on input.
 *
 * Source: MEP Phase 12 F12-23.
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FOOTER_NEWSLETTER_PLACEHOLDER, FOOTER_NEWSLETTER_CTA } from '@/lib/marketing/copy';

const newsletterSchema = z.object({
  email: z.email('Please enter a valid email address'),
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

  const onSubmit = async (_data: NewsletterValues) => {
    // TODO: Wire to Resend Audience API or Brevo
    await new Promise((resolve) => setTimeout(resolve, 500));
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
      <label
        htmlFor="newsletter-email"
        className="sr-only"
      >
        Email address
      </label>
      <div className="flex gap-0">
        <input
          id="newsletter-email"
          type="email"
          {...register('email')}
          placeholder={FOOTER_NEWSLETTER_PLACEHOLDER}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'newsletter-error' : undefined}
          className="flex-1 border border-stone-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-water-500"
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
