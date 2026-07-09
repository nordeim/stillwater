'use client';

import { toast } from 'sonner';

import { trpc } from '@/lib/trpc/client';

/**
 * F7-13 — CheckoutButton
 *
 * Triggers the memberships.subscribe tRPC mutation, which creates a
 * Stripe Checkout Session. On success, redirects the browser to the
 * Stripe-hosted checkout page.
 *
 * Per SKILL §1.3: sharp edges, clay-500 filled button (Tier 3 CTA).
 * Per SKILL §1.5: max 1 filled CTA per section.
 * Per SKILL §8.5: min 44x44px touch target (WCAG AAA §2.5.5).
 *
 * Per SKILL §14.6: shows loading indicator on button during async op.
 * Per SKILL §14.6: disables button during async op.
 *
 * @param planId   - The UUID of the membership plan to subscribe to
 * @param label    - Button label (default: 'Subscribe')
 * @param disabled - External disable state (e.g., already subscribed)
 *
 * @example
 * <CheckoutButton planId={plan.id} label="Start Your Practice" />
 */
export function CheckoutButton({
  planId,
  label = 'Subscribe',
  disabled = false,
}: {
  planId: string;
  label?: string;
  disabled?: boolean;
}) {
  const mutation = trpc.memberships.subscribe.useMutation({
    onSuccess: (data) => {
      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error) => {
      if (error.data?.code === 'PRECONDITION_FAILED') {
        toast.error(
          'Unable to start checkout. Please contact the studio to set up your billing account.',
        );
      } else if (error.data?.code === 'NOT_FOUND') {
        toast.error('Plan not found. Please refresh the page and try again.');
      } else {
        toast.error(error.message || 'Checkout failed. Please try again.');
      }
    },
  });

  return (
    <button
      onClick={() => { mutation.mutate({ planId }); }}
      disabled={disabled || mutation.isPending}
      className="min-h-[44px] min-w-[44px] bg-clay-500 px-8 py-3 text-sm font-medium text-sand-100 transition-colors hover:bg-clay-600 disabled:cursor-not-allowed disabled:opacity-50"
      aria-busy={mutation.isPending}
    >
      {mutation.isPending ? 'Redirecting…' : label}
    </button>
  );
}
