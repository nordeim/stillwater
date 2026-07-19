/**
 * F12-01 — Production home page (PATCHED — replaces Phase 4 stub)
 *
 * V13-1 fix: Bypass apiCaller(), query DB directly.
 * V15-1 fix (2026-07-19): Remove withTimeout wrapper — it uses setTimeout
 *   which doesn't fire during Next.js static prerendering, causing the
 *   Suspense fallback to be committed permanently. The DB driver's own
 *   10s AbortSignal timeout (neonConfig.fetchFunction) is sufficient.
 *   The .catch(() => []) handles all error cases (DB unreachable, query
 *   timeout, etc.) and returns empty arrays so the page renders with
 *   fallback content instead of hanging on "Loading…".
 *
 * Server component orchestrating all 9 sections from the mockup.
 * ISR revalidate = 3600 (1 hour). Parallel fetch (DB queries).
 *
 * Source: MEP Phase 12 F12-01 + V15-1 root-cause analysis.
 */

import { and, asc, eq, gte, lte } from 'drizzle-orm';

import { db , classSessions, instructors, membershipPlans } from '@stillwater/db';

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
import { yogaStudioSchema } from '@/lib/seo/schemas';


export const metadata: Metadata = {
  title: 'Stillwater Yoga Studio — Mindful Movement in SE Portland',
  description:
    'A sanctuary for mindful movement. Book Vinyasa, Ashtanga, Yin, and Restorative classes with experienced instructors in Southeast Portland.',
  alternates: { canonical: '/' },
};

// ISR — revalidate every 1 hour
export const revalidate = 3600;

interface ScheduleSession {
  id: string;
  startsAt: Date;
  class: { title: string };
  instructor: { slug: string };
  room: { name: string } | null;
}

interface InstructorSummary {
  id: string;
  name: string;
  slug: string;
  bio?: string | null;
}

interface PlanSummary {
  id: string;
  name: string;
  priceCents: number;
  interval: string;
  classCreditsPerCycle: number | null;
}

export default async function HomePage() {
  // V15-1: Query DB directly with .catch(() => []) fallback (NO withTimeout).
  // The DB driver's own 10s AbortSignal timeout handles hangs.
  // .catch(() => []) ensures the page always renders (with empty data if DB fails).
  const [sessions, instructorList, planList] = await Promise.all([
    db.query.classSessions
      .findMany({
        where: and(
          gte(classSessions.startsAt, getWeekStart()),
          lte(classSessions.startsAt, getWeekEnd()),
          eq(classSessions.status, 'scheduled'),
        ),
        with: { class: true, instructor: true, room: true },
        orderBy: classSessions.startsAt,
      })
      .catch(() => []),
    db.query.instructors
      .findMany({
        where: and(
          eq(instructors.isActive, true),
          eq(instructors.published, true),
        ),
        orderBy: [asc(instructors.sortOrder), asc(instructors.slug)],
      })
      .catch(() => []),
    db.query.membershipPlans
      .findMany({
        where: eq(membershipPlans.isActive, true),
        orderBy: [asc(membershipPlans.sortOrder), asc(membershipPlans.name)],
      })
      .catch(() => []),
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
      <ScheduleSection sessions={sessions as ScheduleSession[]} />

      {/* 5. Instructors (§ 03) */}
      <InstructorsSection
        instructors={(instructorList as InstructorSummary[]).map((i) => ({
          id: i.id,
          name: i.name,
          slug: i.slug,
          bio: i.bio ?? null,
        }))}
      />

      {/* 6. Membership (§ 04) */}
      <MembershipSection
        plans={(planList as PlanSummary[]).map((p) => ({
          id: p.id,
          name: p.name,
          priceCents: p.priceCents,
          interval: p.interval,
          classCreditsPerCycle: p.classCreditsPerCycle,
        }))}
      />

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

function getWeekEnd(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d;
}
