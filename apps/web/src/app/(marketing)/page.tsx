/**
 * F12-01 — Production home page (PATCHED — replaces Phase 4 stub)
 *
 * Server component orchestrating all 9 sections from the mockup.
 * ISR revalidate = 3600 (1 hour). Parallel fetch (tRPC + Sanity).
 *
 * Source: MEP Phase 12 F12-01.
 */

import type { Metadata } from 'next';
import { apiCaller } from '@/lib/trpc/server';
import { Hero } from '@/components/marketing/Hero';
import { ClassMarquee } from '@/components/marketing/ClassMarquee';
import { Philosophy } from '@/components/marketing/Philosophy';
import { ScheduleSection } from '@/components/marketing/ScheduleSection';
import { InstructorsSection } from '@/components/marketing/InstructorsSection';
import { MembershipSection } from '@/components/marketing/MembershipSection';
import { StudioSpaceSection } from '@/components/marketing/StudioSpaceSection';
import { CtaBand } from '@/components/marketing/CtaBand';
import { ScrollProgressBar } from '@/components/marketing/ScrollProgressBar';
import { JsonLd } from '@/components/seo/JsonLd';
import { yogaStudioSchema } from '@/lib/seo/schemas';

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

  // Parallel fetch: schedule + instructors + membership plans
  const [sessions, instructors, membershipPlans] = await Promise.all([
    caller.schedule.getWeek({ weekStart: getWeekStart() }).catch(() => []),
    caller.instructors.list().catch(() => []),
    caller.memberships.getPlans().catch(() => []),
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
      <InstructorsSection instructors={instructors as unknown[]} />

      {/* 6. Membership (§ 04) */}
      <MembershipSection plans={membershipPlans as unknown[]} />

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
