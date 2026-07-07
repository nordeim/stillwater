'use client';

/**
 * F2-09 — Magic Link email form
 *
 * Uses react-hook-form + Zod for validation.
 * Calls authClient.signIn.magicLink() on submit.
 *
 * Source: MEP Phase 2 F2-09.
 */

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const magicLinkSchema = z.object({
  email: z.email('Enter a valid email address'),
});

type MagicLinkValues = z.infer<typeof magicLinkSchema>;

export function MagicLinkForm({ callbackUrl = '/dashboard' }: { callbackUrl?: string }) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MagicLinkValues>({
    resolver: zodResolver(magicLinkSchema),
  });

  const onSubmit = async (values: MagicLinkValues) => {
    setStatus('submitting');
    setErrorMessage(null);
    try {
      const { authClient } = await import('@stillwater/auth/client');
      const result = await authClient.signIn.magicLink({
        email: values.email,
        callbackURL: callbackUrl,
      });
      if (result.error) {
        setStatus('error');
        setErrorMessage(result.error.message ?? 'Something went wrong. Please try again.');
      } else {
        setStatus('success');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Network error. Please check your connection and try again.');
    }
  };

  if (status === 'success') {
    return (
      <div role="status" aria-live="polite">
        <p>Check your inbox — we sent a sign-in link to your email.</p>
        <p>The link expires in 10 minutes.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label htmlFor="magic-link-email">Email address</label>
        <input
          id="magic-link-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'magic-link-email-error' : undefined}
          {...register('email')}
        />
        {errors.email && (
          <p id="magic-link-email-error" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>
      {errorMessage && (
        <div role="alert" aria-live="assertive">
          {errorMessage}
        </div>
      )}
      <button type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Sending link…' : 'Send magic link'}
      </button>
    </form>
  );
}
