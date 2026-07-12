import type { Metadata } from 'next';

import { EnrollmentHistoryTable } from '@/components/dashboard/EnrollmentHistoryTable';
import { apiCaller } from '@/lib/trpc/server';

export const metadata: Metadata = {
  title: 'Class History',
  description: 'Your enrollment history',
};

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const caller = await apiCaller();
  const history = await caller.members.getHistory();

  // Cast for Drizzle relational type inference (SKILL §9.9 Gotcha 27)
  interface HistoryEntry {
    id: string;
    status: string;
    enrolledAt: Date;
    cancelledAt: Date | null;
    session: { startsAt: Date; class: { title: string } };
  }
  const typedHistory = history as unknown as HistoryEntry[];

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <header className="mb-12">
        <a href="/dashboard" className="text-sm font-medium text-clay-500 underline-offset-4 hover:underline">
          ← Back to dashboard
        </a>
        <h1
          className="mt-4 text-4xl font-light text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Class History
        </h1>
      </header>

      <EnrollmentHistoryTable entries={typedHistory} />
    </div>
  );
}
