/**
 * F12-01 — Production home page (PATCHED — replaces Phase 4 stub)
 *
 * Server component orchestrating all 9 sections from the mockup.
 * ISR revalidate = 3600 (1 hour). Parallel fetch (tRPC + Sanity).
 *
 * Source: MEP Phase 12 F12-01.
 */

import type { Metadata } from 'next';

import { ClassMarquee } from '@/components/marketing/ClassMarquee';
import { CtaBand } from '@/components/marketing/CtaBand';
import { Hero } from '@/components/marketing/Hero';
import { InstructorsSection } from '@/components/marketing/InstructorsSection';
import { MembershipSection } from '@/components/marketing/MembershipSection';
import { Philosophy } from '@/components/marketing/Philosophy';
import { ScheduleSection } from '@/components/marketing/ScheduleSection';
import { ScrollProgressBar } from '@/components/marketing/ScrollProgressBar';
import { StudioSpaceSection } from '@/components/marketing/StudioSpaceSection';
import { JsonLd } from '@/components/seo/JsonLd';
import { withTimeout } from '@/lib/async/withTimeout';
import { yogaStudioSchema } from '@/lib/seo/schemas';
import { apiCaller } from '@/lib/trpc/server';

export const metadata: Metadata = {
  title: 'Stillwater Yoga Studio — Mindful Movement in SE Portland',
  description:
    'A sanctuary for mindful movement. Book Vinyasa, Ashtanga, Yin, and Restorative classes with experienced instructors in Southeast Portland.',
  alternates: { canonical: '/' },
};

// ISR — revalidate every 1 hour
export const revalidate = 3600;

export default async function HomePage() {
  const caller = await apiCaller();

  // Parallel fetch: schedule + instructors + membership plans.
  // withTimeout (8s) prevents stuck Suspense fallbacks when the neon-http
  // driver hangs on a cold Neon compute endpoint or network stall. The
  // .catch() handles rejection; withTimeout handles indefinite hang.
  const [sessions, instructors, membershipPlans] = await Promise.all([
    withTimeout(caller.schedule.getWeek({ weekStart: getWeekStart() }).catch(() => []), 8_000, []),
    withTimeout(caller.instructors.list().catch(() => []), 8_000, []),
    withTimeout(caller.memberships.getPlans().catch(() => []), 8_000, []),
  ]);

  return (
    <>
      <ScrollProgressBar />

      {/* JSON-LD structured data */}
      <JsonLd schema={yogaStudioSchema()} />

      {/* 1. Hero */}
      <Hero />

      {/* 2. Marquee */}
      <ClassMarquee />

      {/* 3. Philosophy (§ 01) */}
      <Philosophy />

      {/* 4. Schedule (§ 02) */}
      <ScheduleSection sessions={sessions as unknown[]} />

      {/* 5. Instructors (§ 03) */}
      <InstructorsSection instructors={(instructors as unknown[]).map((i) => i as { id: string; name: string; slug: string; bio?: string | null })} />

      {/* 6. Membership (§ 04) */}
      <MembershipSection plans={(membershipPlans as unknown[]).map((p) => p as { id: string; name: string; priceCents: number; interval: string; classCreditsPerCycle: number | null })} />

      {/* 7. Studio Space (§ 05) */}
      <StudioSpaceSection />

      {/* 8. CTA Band */}
      <CtaBand />
    </>
  );
}

function getWeekStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
