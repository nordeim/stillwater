'use client';

import { toast } from 'sonner';

interface SubscriptionData {
  status: string;
  cancelAtPeriodEnd: boolean;
  plan: {
    name: string;
    interval: string;
  } | null;
}

export function ManageMembershipPanel({ subscription }: { subscription: SubscriptionData }) {
  const handlePause = () => {
    toast.info('Membership pause is coming in Phase 7 (Stripe integration).');
  };

  const handleCancel = () => {
    toast.info('Membership cancellation is coming in Phase 7 (Stripe integration).');
  };

  const handleResume = () => {
    toast.info('Membership resume is coming in Phase 7 (Stripe integration).');
  };

  const isPaused = subscription.status === 'paused';
  const isCancelling = subscription.cancelAtPeriodEnd;

  return (
    <div className="border border-stone-200 bg-sand-50 p-6">
      <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
        Manage Membership
      </p>
      <p className="mt-2 text-sm text-stone-600">
        {subscription.plan?.name ?? 'Your plan'} ·{' '}
        {subscription.plan?.interval === 'year' ? 'Annual' : 'Monthly'}
      </p>

      <div className="mt-6 space-y-3">
        {isPaused ? (
          <button
            onClick={handleResume}
            disabled
            className="min-h-[44px] w-full bg-clay-500 px-6 py-3 text-sm font-medium text-sand-100 opacity-50"
            title="Resume — coming Phase 7"
          >
            Resume Membership (Coming Phase 7)
          </button>
        ) : (
          <button
            onClick={handlePause}
            disabled
            className="min-h-[44px] w-full border border-stone-400 px-6 py-3 text-sm font-medium text-stone-900 opacity-50"
            title="Pause — coming Phase 7"
          >
            Pause Membership (Coming Phase 7)
          </button>
        )}

        {!isCancelling && (
          <button
            onClick={handleCancel}
            disabled
            className="min-h-[44px] w-full border border-error px-6 py-3 text-sm font-medium text-error opacity-50"
            title="Cancel — coming Phase 7"
          >
            Cancel Membership (Coming Phase 7)
          </button>
        )}

        {isCancelling && (
          <p className="text-xs text-stone-500">
            Your membership is set to cancel at the end of the current billing period.
          </p>
        )}
      </div>

      <p className="mt-4 text-xs text-stone-400">
        Membership management requires Stripe integration (Phase 7).
      </p>
    </div>
  );
}
