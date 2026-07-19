/**
 * F12-01 — Production home page (PATCHED — replaces Phase 4 stub)
 *
 * V13-1 fix (2026-07-19): Bypass apiCaller(), query DB directly.
 *   The v1-v12 audit saga fixed slug routes (/instructors/[slug], /blog/[slug])
 *   to query the DB directly. The 4 index routes (/, /schedule, /instructors,
 *   /pricing) were never fixed, causing live-site "Loading…" hang because:
 *     1. apiCaller() → headers() → opts page out of static rendering
 *     2. createContext() → getSessionWithTimeout() = 5s
 *     3. withTimeout(8s) on data fetch = 8s
 *     4. Total 13s > Vercel's 10s function timeout → stream cut short
 *
 * Server component orchestrating all 9 sections from the mockup.
 * ISR revalidate = 3600 (1 hour). Parallel fetch (DB queries).
 *
 * Source: MEP Phase 12 F12-01 + SKILL Lesson 112 (V12-1 pattern extended to index routes).
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
import { withTimeout } from '@/lib/async/withTimeout';
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
  // V13-1: Query DB directly (NOT via apiCaller — apiCaller uses headers()
  // which opts the page out of static rendering → dynamic streaming →
  // 5s session timeout + 8s data timeout > 10s Vercel limit → Loading… hang).
  // Parallel fetch with withTimeout (8s) for build/request resilience.
  const [sessions, instructorList, planList] = await Promise.all([
    withTimeout(
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
      8_000,
      [],
    ),
    withTimeout(
      db.query.instructors
        .findMany({
          where: and(
            eq(instructors.isActive, true),
            eq(instructors.published, true),
          ),
          orderBy: [asc(instructors.sortOrder), asc(instructors.slug)],
        })
        .catch(() => []),
      8_000,
      [],
    ),
    withTimeout(
      db.query.membershipPlans
        .findMany({
          where: eq(membershipPlans.isActive, true),
          orderBy: [asc(membershipPlans.sortOrder), asc(membershipPlans.name)],
        })
        .catch(() => []),
      8_000,
      [],
    ),
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
