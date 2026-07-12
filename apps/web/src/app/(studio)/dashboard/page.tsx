import type { Metadata } from 'next';

import { CreditUsageWidget } from '@/components/dashboard/CreditUsageWidget';
import { MembershipStatusCard } from '@/components/dashboard/MembershipStatusCard';
import { ProfileSummaryCard } from '@/components/dashboard/ProfileSummaryCard';
import { UpcomingClassesWidget } from '@/components/dashboard/UpcomingClassesWidget';
import { apiCaller } from '@/lib/trpc/server';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your Stillwater member dashboard',
};

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const caller = await apiCaller();

  const [profile, subscription, history] = await Promise.all([
    caller.members.getProfile(),
    caller.memberships.getMySubscription(),
    caller.members.getHistory(),
  ]);

  // Filter upcoming classes (confirmed enrollments with future startsAt)
  // Cast for Drizzle relational type inference (SKILL §9.9 Gotcha 27)
  interface HistoryEntry {
    id: string;
    status: string;
    enrolledAt: Date;
    session: { startsAt: Date; class: { title: string } };
  }
  const typedHistory = history as unknown as HistoryEntry[];
  const now = new Date();
  const upcoming = typedHistory
    .filter((e) => e.session.startsAt > now && e.status === 'confirmed')
    .slice(0, 3);

  // Cast subscription for plan details
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
    <div className="mx-auto max-w-7xl px-6 py-16">
      <header className="mb-12">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
          Member Dashboard
        </p>
        <h1
          className="mt-2 text-4xl font-light text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Welcome back
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left column: Profile + Membership */}
        <div className="space-y-8">
          <ProfileSummaryCard
            displayName={profile.displayName}
            email={profile.phone ?? ''}
            joinedAt={new Date(profile.joinedAt)}
          />
          {typedSubscription && (
            <MembershipStatusCard subscription={typedSubscription} />
          )}
        </div>

        {/* Right column: Credits + Upcoming */}
        <div className="space-y-8 lg:col-span-2">
          {typedSubscription && (
            <CreditUsageWidget subscription={typedSubscription} />
          )}
          <UpcomingClassesWidget upcoming={upcoming} />
        </div>
      </div>
    </div>
  );
}
