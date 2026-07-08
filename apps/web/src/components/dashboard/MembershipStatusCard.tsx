'use client';

import Link from 'next/link';

interface SubscriptionData {
  id: string;
  status: string;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  creditsRemaining: number | null;
  plan: {
    name: string;
    interval: string;
    classCreditsPerCycle: number | null;
  } | null;
}

export function MembershipStatusCard({ subscription }: { subscription: SubscriptionData }) {
  const planName = subscription.plan?.name ?? 'Unknown plan';
  const interval = subscription.plan?.interval === 'year' ? 'Annual' : 'Monthly';
  const statusLabel = subscription.cancelAtPeriodEnd ? 'Cancelling' : subscription.status;

  return (
    <div className="border border-stone-200 bg-sand-50 p-6">
      <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
        Membership
      </p>
      <h3
        className="mt-2 text-2xl font-medium text-stone-900"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {planName}
      </h3>
      <p className="mt-1 text-sm text-stone-600">{interval} plan</p>
      <div className="mt-4 flex items-center gap-2">
        <span
          className="inline-block h-2 w-2 bg-success"
          aria-hidden="true"
        />
        <span className="text-sm capitalize text-stone-700">{statusLabel}</span>
      </div>
      {subscription.currentPeriodEnd && (
        <p className="mt-2 text-xs text-stone-500">
          Renews: {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      )}
      <Link
        href="/membership"
        className="mt-4 inline-block text-sm font-medium text-clay-500 underline-offset-4 hover:underline"
      >
        Manage →
      </Link>
    </div>
  );
}
