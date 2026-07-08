import type { Metadata } from 'next';

import { ManageMembershipPanel } from '@/components/dashboard/ManageMembershipPanel';
import { MembershipStatusCard } from '@/components/dashboard/MembershipStatusCard';
import { apiCaller } from '@/lib/trpc/server';

export const metadata: Metadata = {
  title: 'Membership',
  description: 'Manage your membership',
};

export const dynamic = 'force-dynamic';

export default async function MembershipPage() {
  const caller = await apiCaller();
  const subscription = await caller.memberships.getMySubscription();

  // Cast for Drizzle relational type inference (SKILL §9.9 Gotcha 27)
  interface SubscriptionWithPlan {
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
  const typedSubscription = subscription as unknown as SubscriptionWithPlan | null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <header className="mb-12">
        <a href="/dashboard" className="text-sm font-medium text-clay-500 underline-offset-4 hover:underline">
          ← Back to dashboard
        </a>
        <h1
          className="mt-4 text-4xl font-light text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Membership
        </h1>
      </header>

      {typedSubscription ? (
        <div className="space-y-8">
          <MembershipStatusCard subscription={typedSubscription} />
          <ManageMembershipPanel subscription={typedSubscription} />
        </div>
      ) : (
        <div className="border border-stone-200 bg-sand-50 p-8 text-center">
          <p className="text-stone-600">You don&apos;t have an active membership.</p>
          <a
            href="/pricing"
            className="mt-4 inline-block bg-clay-500 px-6 py-3 text-sm font-medium text-sand-100 hover:bg-clay-600"
          >
            View Plans
          </a>
        </div>
      )}
    </div>
  );
}
