# Project Brief — Stillwater

> **Updated:** 2026-07-21 (post-v17 comprehensive code review remediation)
> Status: Phases 0–12 ✅ complete · v8–v12 ✅ · v13 ✅ (Six-Axis Audit) · v14 ✅ (Mockup fidelity) · v15 ✅ · **v16-1 to v16-3 ✅** (Loading… definitively fixed — live site fully operational) · **v17-1 to v17-10 ✅** (11 audit findings remediated via TDD — see AUDIT_REMEDIATION.md §v17)

## What it is

Stillwater is an enterprise-grade platform for a single yoga studio (Southeast Portland). It's not a SaaS — it's one studio's bespoke operations system: public marketing site, member class-booking, staff/admin tools, Stripe subscriptions, and background email/job processing. The whole product is wrapped around an "Editorial Calm" design identity (warm mineral palette: stone/clay/water/sand — no gradients, no drop shadows, no pill buttons).

## Current build state (the honest picture)

**All 13 phases (0–12) are complete and green. v8 audit remediation (2026-07-17) is complete.**

- **Phase 0 (Scaffold):** Complete. Turborepo + pnpm workspaces, 7 shared packages, 11 tooling configs, Docker Compose setup, and the full design system (self-hosted fonts, CSS tokens).
- **Phase 1 (Database):** Complete. 18 tables (15 domain + 3 Better Auth) Drizzle schema, 8 enums, 12 indexes (8 standard + 4 unique; the 5 Phase 1 'critical' indexes are a labelled subset), 6 migrations (`0000_dear_dagger.sql` + `0001_equal_iron_lad.sql` + `0002_lyrical_cargill.sql` + `0003_audit_log_phase9.sql` + `0004_huge_hawkeye.sql` + `0005_add_price_cents.sql`), idempotent seed, dynamic driver selection.
- **Phase 2 (Auth & RBAC):** Complete. Better Auth v1.6.23 with Google OAuth, Magic Link, `customSession` plugin. RBAC matrix (13×6). 2-layer auth (proxy.ts + layout guards).
- **Phase 3 (API / tRPC):** Complete. 10 routers, ~42 procedures, 5 access tiers (public/protected/staff/manager/owner — V13-4 added `managerProcedure`), advisory lock booking, rate limiting (V17-6 escaped ILIKE wildcards), full web integration.
- **Phase 4 (Marketing):** Complete. Sanity CMS client + 8 content type schemas, Sanity Studio app (`apps/studio/`), GROQ query registry with `published == true` filter, Zod response validation, Cloudflare Images signer, webhook→ISR revalidation with HMAC verification, 8 ISR-backed marketing pages (home, schedule, instructors list + detail, pricing, blog list + detail, about), MarketingNav + Footer with Editorial Calm design, skip-to-content link, error/loading boundaries, 11 shadcn/ui components with anti-generic patches (no shadows, `--radius: 0`).

- **Phase 5 (Booking):** Complete. SSE endpoint (`/api/schedule/stream`, maxDuration=300, 10s polling, V17-10 per-IP concurrent connection rate limit of 5), `useSessionAvailability` hook (3 reconnection attempts, exponential backoff), 5 booking UI components (SeatAvailability, BookingButton, BookingConfirmation, WaitlistButton, BookingFlow) + `useBookingMutation` hook, `(studio)/book/[sessionId]` page, `ScheduleGrid` with Book CTA, Toaster mounted, waitlist unique index.

- **Phase 6 (Dashboard):** Complete. Member dashboard (`/dashboard`, `/profile`, `/membership`, `/history`), 7 dashboard components (MembershipStatusCard, CreditUsageWidget, UpcomingClassesWidget, ProfileSummaryCard, ProfileEditForm, ManageMembershipPanel, EnrollmentHistoryTable), CSV export utility, `memberships.getMySubscription` plan join, `memberships.resume` implemented (unstubbed in Phase 7).

**Phase 7 (Payments):** Complete. `@stillwater/payments` package (8 source files: client, types, subscriptions, webhooks, invoices, credit-packs, refunds, index) with 43 tests; Stripe webhook route `/api/webhooks/stripe/route.ts` (body as TEXT, HMAC verification, idempotent via `pg_advisory_xact_lock`); `CheckoutButton` component + `lib/stripe/utils.ts`; tRPC procedures unstubbed (`memberships.subscribe/cancel/pause/resume` + `payments.getPortalUrl/getInvoices`); `payments.refund` retained as D12 stub; ADR-010 accepted (Resend Native Templates for email).

**Phase 8 (Background Jobs & Email):** Complete. `@stillwater/workers` package — 12 Trigger.dev v4 task files (`attendance-summary`, `booking-confirmation`, `booking-cancellation` [added V8 audit C2], `class-cancellation-notify`, `class-reminder-1h`, `class-reminder-24h`, `membership-credit-grant`, `membership-expiry-warn`, `payment-failed-notify`, `waitlist-expiry`, `waitlist-promotion`, `weekly-digest`), `trigger.config.ts` (root `@trigger.dev/sdk` import, `machine: "micro"`, `build.external` without `build.env`), 45 tests. `@stillwater/email` package — 13 React Email v6 templates + 3 shared components (`EmailLayout`, `EmailButton`, `EmailFooter`), dual-path `send.ts` (`sendEmail` for Server Components, `sendEmailNative` for workers per ADR-010), `template-ids.ts`, `send-helpers.ts`, 71 tests. `@stillwater/config/site` shared constants module (V17-8 — single source of truth for studio address + phone + email, used by Footer, JSON-LD, and worker emails). Integration: `getJobsClient` in `@stillwater/config` (stub fallback when `TRIGGER_SECRET_KEY` unset), `bookings.book` triggers `booking-confirmation` (fire-and-forget); `class-reminder-24h`/`class-reminder-1h` run as **cron jobs** (every 15min / 5min) with idempotent dedup via `reminder24hSentAt`/`reminder1hSentAt`, `bookings.cancel` → `waitlist-promotion`, `memberships.cancel/pause` send emails, Stripe `invoice.payment_failed` → `payment-failed-notify` post-commit.

**Phase 9 (Admin Surface):** ✅ Complete. 11 admin pages, 9 admin components, 12 admin tRPC procedures; `audit_log` table (migration `0003_audit_log_phase9.sql`) with 3 indexes; 7 additional shadcn/ui components (table, form, input, textarea, checkbox, calendar, command) — 18 total; `cmdk` dependency; 5 admin E2E specs.

**Phase 10 (Observability):** ✅ Complete. Sentry + PostHog (18 events) + Axiom + Checkly (3 checks).

**Phase 11 (Accessibility & SEO):** ✅ Complete. WCAG AAA audit + SEO (robots, sitemap, manifest, 4 OG images, JSON‑LD, SkipLink, SrOnly, focus‑utils).

**Phase 12 (Landing Page):** ✅ Complete. Landing page port — 19 marketing components, 3 hooks, mobile nav drawer, scroll progress bar.

---

## Phase completion table

| Phase | Status | Quick Summary |
|---|---|---|
| 0 — Scaffold | ✅ Complete | Monorepo, tooling, Docker, design tokens |
| 1 — DB Schema | ✅ Complete | 18 tables (15 domain + 3 Better Auth), 8 enums, 12 indexes, 6 migrations, seed |
| 2 — Auth & RBAC | ✅ Complete | Better Auth, Google OAuth, Magic Link, RBAC matrix |
| 3 — tRPC API | ✅ Complete | 10 routers, ~42 procedures, 5 access tiers (V13-4), advisory locks, rate limiting (V17-6 ILIKE escape) |
| 4 — Marketing | ✅ Complete | Sanity CMS v6 + client v7, 8 ISR pages, webhook, Cloudflare Images, shadcn/ui |
| 5 — Booking | ✅ Complete | SSE endpoint (V17-10 per-IP rate limit), booking UI, useSessionAvailability hook, booking page |
| 6 — Dashboard | ✅ Complete | Member dashboard, profile editing, membership status, enrollment history, CSV export |
| 7 — Payments | ✅ Complete | Stripe subscriptions + credit packs (@stillwater/payments, webhook, CheckoutButton, unstubbed tRPC) |
| 8 — Background Jobs | ✅ Complete | 12 Trigger.dev tasks (45 tests) + 13 email templates (71 tests) + @stillwater/config/site (V17-8) |
| 9 — Admin Surface | ✅ Complete | 11 admin pages, 9 components, 12 procedures (V17-4 fixed getRevenueDetails cartesian-join), audit_log table, 18 shadcn/ui total |
| 10 — Observability | ✅ Complete | Sentry + PostHog (18 events) + Axiom + Checkly (3 checks) |
| 11 — Accessibility | ✅ Complete | WCAG AAA audit, SEO (V17-5 instructor title fix), OG images, JSON‑LD (V17-8 SITE address) |
| 12 — Landing Page | ✅ Complete | Port static mockup to Next.js production (19 components, 3 hooks, V17-3 CLS fix) |

---

## What exists on disk (verified)

These are the files you can actually `cat` and `test` today:

### Database & Schema
- `packages/db/src/schema/*.ts` — 18 Drizzle tables across 16 schema files: `users`, `members`, `instructors`, `classStyles`, `classes`, `rooms`, `classSessions`, `enrollments`, `waitlistEntries`, `memberSubscriptions`, `membershipPlans`, `classPackages`, `paymentEvents`, `roleAssignments`, `auditLog`, `account`, `session`, `verification`. **Note:** PAD.md / SKILL.md / AGENTS.md / CLAUDE.md now cite **18 tables** (corrected from the earlier 14-table undercount); verified via `pgTable` declarations — migration `0000_dear_dagger.sql` contains all 18 `CREATE TABLE` statements.
- `packages/db/src/schema/relations.ts` — Drizzle Relational Query Builder (RQB) `relations()` definitions for all FK pairs (one/many); wired into `drizzle(..., { schema })`. Enables nested `with: { class: true, instructor: true, ... }` queries (used by admin/book pages) and removes the `referencedTable` runtime error. Added in the 2026-07-12 remediation.
- `packages/db/src/schema/enums.ts` — 8 enums (class level, membership status, seat status, etc.).
- `packages/db/drizzle/migrations/` — 5 migrations: `0000_dear_dagger.sql` (initial 18-table schema), `0001_equal_iron_lad.sql` (instructors.published column), `0002_lyrical_cargill.sql` (waitlist unique index `idx_waitlist_session_member`), `0003_audit_log_phase9.sql` (audit_log table), `0004_huge_hawkeye.sql` (enrollments `reminder_24h_sent_at` / `reminder_1h_sent_at` for cron-reminder dedup). Regenerated after `ALTER COLUMN` silent-failure fix (Phase 1–2 remediation). All five applied successfully via `pnpm db:migrate`.
- `packages/db/src/seed/index.ts` + `seed/env.ts` — Idempotent seed script loading synthetic demo data (5 users, 5 members, 3 instructors, 4 class styles, 4 classes, 2 rooms, 7 sessions, 3 membership plans). Loads `.env.local` before importing `db`.
- `packages/db/src/index.ts` — Dynamic driver: `pg.Pool` for local Docker, `neon-http` for Neon URLs.
- `packages/db/src/index.test.ts` + `schema/*.test.ts` — 17 test files, 117 tests.

### Authentication & Authorization
- `packages/auth/src/config.ts` — Better Auth config (Google OAuth, Magic Link, Drizzle adapter).
- `packages/auth/src/rbac.ts` — Permission matrix (13 permissions × 6 roles).
- `packages/auth/src/client.ts` — Typed `authClient` with `magicLinkClient` plugin.
- `packages/auth/src/types.ts` — `ActiveSubscriptionSummary` and session enrichment types.
- `apps/web/src/lib/auth.ts` — Server helpers: `getSession()`, `requireAuth()`, `requireRole()` (Layer 2 of 2-layer auth).
- `apps/web/proxy.ts` — Next.js 16 `proxy` function: `getSessionCookie()` only, no DB, no RBAC (Layer 1).
- `packages/auth/src/*.test.ts` — 4 test files, 102 tests.

### API Layer
- `packages/api/src/routers/*.ts` — 10 routers: `admin`, `bookings`, `classes`, `instructors`, `members`, `memberships`, `payments`, `schedule`, `sessions`, `waitlist`.
- `packages/api/src/trpc.ts` — 4 procedure tiers: `publicProcedure`, `protectedProcedure`, `staffProcedure`, `ownerProcedure`.
- `packages/api/src/root.ts` — Root router merging all 10 routers.
- `packages/api/src/context.ts` — tRPC context with session injection.
- `packages/api/src/middleware/rateLimit.ts` — Upstash Redis rate limiting on `bookings.book`.
- `packages/api/src/*.test.ts` — 13 test files, 118 tests (integration test requires Docker).

### Web App
- `apps/web/src/app/api/auth/[...all]/route.ts` — Better Auth catch-all handler.
- `apps/web/src/app/api/trpc/[trpc]/route.ts` — tRPC HTTP handler.
- `apps/web/src/app/api/webhooks/stripe/route.ts` — Stripe webhook handler (Phase 7; body as TEXT, HMAC verification).
- `apps/web/src/lib/trpc/server.ts` — RSC server caller.
- `apps/web/src/lib/trpc/client.tsx` — React Query + tRPC client provider.
- `apps/web/src/lib/trpc/query-keys.ts` — Query key factory.
- `apps/web/src/**/*.test.ts` + `apps/web/src/**/*.test.tsx` — 28 test files, 159 tests.

### Payments & Stripe (Phase 7)
- `packages/payments/src/*.ts` — 8 source files (client, types, subscriptions, webhooks, invoices, credit-packs, refunds, index), 43 tests.
- `apps/web/src/lib/stripe/utils.ts` + `apps/web/src/components/membership/CheckoutButton.tsx` — checkout helpers + button.
- `packages/api/src/routers/memberships.ts` / `payments.ts` — `subscribe`/`cancel`/`pause`/`resume` + `getPortalUrl`/`getInvoices` implemented (Phase 7); `payments.refund` retained as D12 stub.

### Background Jobs (Phase 8)
- `services/workers/trigger.config.ts` — Trigger.dev v4 config (root `@trigger.dev/sdk` import, `machine: "micro"`, `build.external` without `build.env`).
- `services/workers/src/*.ts` — 11 task files: `attendance-summary`, `booking-confirmation`, `class-cancellation-notify`, `class-reminder-1h`, `class-reminder-24h`, `membership-credit-grant`, `membership-expiry-warn`, `payment-failed-notify`, `waitlist-expiry`, `waitlist-promotion`, `weekly-digest` (each with per-task `maxDuration` + retry).
- `services/workers/src/*.test.ts` — 11 test files, 33 tests.

### Email (Phase 8)
- `packages/email/src/templates/*.tsx` — 13 React Email v6 templates (BookingConfirmation, BookingCancellation, ClassReminder24h, ClassReminder1h, ClassCancellation, MembershipRenewal, MembershipPaused, MembershipCancellation, PaymentFailed, WaitlistOffer, WaitlistExpired, WeeklyDigest, WelcomeMember).
- `packages/email/src/components/*.tsx` — 3 shared components (EmailLayout, EmailButton, EmailFooter).
- `packages/email/src/send.ts` — dual-path sender (`sendEmail` for Server Components, `sendEmailNative` for workers per ADR-010).
- `packages/email/src/template-ids.ts` + `packages/email/src/send-helpers.ts` — template ID registry + 13 send-helpers.
- `packages/email/src/*.test.tsx` — 13 template tests + 3 component tests = 71 tests.

### Config & Infrastructure
- `packages/config/src/env.ts` — t3-env Zod-validated schema covering **34 environment variables** with build-context env fallbacks.
- `.npmrc` + `pnpm-workspace.yaml` — `@stillwater/source` custom condition declared in both.
- `docker-compose.yml` — Postgres 17 + Redis 7 + Adminer.
- `infrastructure/postgres/init/00-create-extensions.sql` — Docker init (uuid-ossp + pgcrypto).

### Design System
- `packages/ui/src/fonts/` — Self-hosted Cormorant Garamond, DM Sans, JetBrains Mono (`.woff2`).
- `packages/ui/src/index.ts` — CSS design token exports (colors, typography, spacing, motion).

---

## Live quality gates (2026-07-21, post-v17 remediation)

Run `pnpm check-types`, `pnpm lint`, `pnpm test`, and `pnpm build`.

| Gate | Result |
|---|---|
| `pnpm check-types` | **9/9 successful** ✅ |
| `pnpm lint` | **0 errors** ✅ (9 intentional warnings) |
| `pnpm test` | **~798 tests passing** ✅ (131 db + 102 auth + 147 api + 47 payments + 9 config + 254 web + 71 email + 45 workers — V17 added 35 new tests across CSP/CLS/cartesian-join/instructor-title/ilike/studio-layout/SITE-constants/SSE-rate-limit) |
| `pnpm build` | **✅ 9/9 packages, 17 static pages** (verified 2026-07-19) ✅ |

### Live site status (2026-07-19, post-v16-3 — V17 fixes NOT yet deployed)

**✅ ALL 6 marketing routes fully operational** at `https://stillwater.jesspete.shop/`:
- `/` (home) — Hero + schedule + philosophy + instructors + membership + studio + CTA ✅
- `/schedule` — Weekly class cards with times/instructors/rooms ✅
- `/instructors` — Portraits + bios (mei-tanaka, james-harlow, aiko-mori) ✅
- `/pricing` — Membership comparison table ✅
- `/about` — Studio story ✅
- `/blog` — Empty state ✅

3 instructor detail pages (SSG) + auth + API endpoints also confirmed working.

Screenshots: `docs/e2e-screenshots/`

> ⚠️ **Lint flake note:** `pnpm lint` (default parallel turborepo run) can intermittently fail with *"not found by the project service"* parsing errors on test files. This is a typescript-eslint `projectService` concurrency collision (two ESLint language-service instances racing), **not a code defect** — confirmed by running lint serially (`pnpm turbo run lint --concurrency=1` → 2/2 green) or per-package. Code is correct.

Test breakdown (approximate — run `pnpm test` for the authoritative count):
- `packages/db` — 19 test files / **131 tests**
- `packages/auth` — 4 test files / **102 tests**
- `packages/api` — 15 test files / **147 tests** (V13-2 cancel + V13-4 RBAC + V13-5 credit + V17-4 cartesian-join fix + V17-6 ilike escape)
- `packages/payments` — 7 test files / **47 tests** (V13-6 checkout.session.completed + charge.refunded)
- `packages/config` — 1 test file / **9 tests** (NEW — V17-8 SITE constants)
- `apps/web` — 37 test files / **254 tests** (V13-1 index-routes + V14 Footer + slug-404-verify + V17-2 CSP rewrite + V17-3 HeroNextClass CLS + V17-5 instructor title + V17-7 studio layout + V17-10 SSE rate limit)
- `packages/email` — 17 test files / **71 tests**
- `services/workers` — 12 test files / **45 tests** (V13-3 claim URL domain fix)

Build output: marketing routes (8: home, schedule, instructors×2, pricing, blog×2, about) + studio (5) + admin (11, RBAC-gated) + auth (2) + API routes (trpc, auth catch-all, schedule/stream, sanity/webhook, `/api/webhooks/stripe`). V16-1: `/`, `/schedule`, `/pricing` are `force-dynamic` (ƒ) to prevent prerender Suspense hang. `/instructors`, `/about`, `/blog` are static (○) or SSG (●). V16-2: React Compiler disabled. V16-3: CSP `strict-dynamic` removed. V17-1: leaked `env.local` files removed from git tracking. V17-2: CSP tests rewritten to verify behavior. V17-3: CLS fix (HeroNextClass skeleton + Cormorant font-display optional). V17-4: getRevenueDetails cartesian-join bug fixed. V17-5: instructor title uses user.name. V17-6: ILIKE wildcards escaped. V17-7: data-session attribute removed. V17-8: studio address centralized in @stillwater/config/site. V17-10: SSE per-IP rate limiting. (`pnpm build` verified 2026-07-19: 9/9 packages, 17 static pages, 0 errors.)

---

## Notable architectural commitments (now implemented vs pending)

| Commitment | Status | Where it's enforced |
|---|---|---|
| PostgreSQL advisory locks for booking | ✅ Implemented | `packages/api/src/routers/bookings.ts` uses `pg_advisory_xact_lock()` |
| 2-layer auth (cookie-only proxy + full RBAC in layouts) | ✅ Implemented | `apps/web/proxy.ts` (Layer 1) + `apps/web/src/lib/auth.ts` (Layer 2) |
| RBAC permission matrix (13 × 6 roles) | ✅ Implemented | `packages/auth/src/rbac.ts` |
| Zod at every boundary | ✅ Implemented | `env.ts`, tRPC `input` schemas, rate-limit middleware |
| React Compiler | ❌ Disabled (V16-2) | `apps/web/next.config.ts` — `reactCompiler: false` (was `true`; disabled because it created excessive nested Suspense boundaries that prevented React hydration) |
| Sentry source maps | ✅ Enabled | `apps/web/next.config.ts` — `withSentryConfig` wrapper (upload in CI; no-op locally when `SENTRY_AUTH_TOKEN` unset) |
| Library discipline (Radix/shadcn only) | ✅ Enforced | `packages/ui` imports from `@radix-ui/*` |
| Self-hosted fonts (zero FOUT) | ✅ Enforced | `packages/ui/src/fonts/` |
| Idempotent Stripe webhooks | ✅ Implemented | `packages/payments/src/webhooks.ts` + `/api/webhooks/stripe` (Phase 7; `pg_advisory_xact_lock`) |
| WCAG 2.2 AAA | ✅ Implemented | `packages/web/src/components/a11y/*` + focus-utils (Phase 11) |
| E2E testing | ✅ Implemented | 7 Playwright specs: booking + accessibility + 5 admin |
| Background jobs (Trigger.dev tasks + Resend Native Templates) | ✅ Implemented | `services/workers/src/*` + `packages/email/src/*` (Phase 8) |

---

## What is NOT yet built

Nothing remains from the original 13‑phase plan — all phases (0–12) are complete and green.

Known intentional stub (not a gap): `payments.refund` remains a thin D12 wrapper per ADR‑010 / Phase 7 scope; full refund logic is deferred by design.

---

## Things worth flagging

- **Docs aligned through v17; refreshed 2026-07-21.** Implementation matches the latest codebase. All 13 phases complete + v8→v16-3 audit remediation complete + v17 comprehensive code review remediation complete (11 findings fixed via TDD). See `AUDIT_REMEDIATION.md` for the full v1→v17 remediation history. Live site confirmed operational via agent-browser E2E on 2026-07-19 (V17 fixes committed but NOT yet deployed — repo owner must deploy + rotate leaked secrets).
- **Migrations are canonical.** Six migrations define the current DB state: `0000_dear_dagger.sql` (initial 18-table schema), `0001_equal_iron_lad.sql` (instructors.published column), `0002_lyrical_cargill.sql` (waitlist unique index `idx_waitlist_session_member`), `0003_audit_log_phase9.sql` (audit_log table), `0004_huge_hawkeye.sql` (enrollments `reminder_24h_sent_at` / `reminder_1h_sent_at` for cron-reminder dedup), `0005_add_price_cents.sql` (membership_plans.price_cents — v4 pricing bug fix). All six current migrations apply successfully via `pnpm db:migrate`.
- **P0 production fix history (v1→v16-3).** Live site at `https://stillwater.jesspete.shop/` had 4 of 8 marketing routes (`/`, `/schedule`, `/instructors`, `/pricing`) stuck on a Suspense "Loading…" fallback indefinitely. The remediation unfolded over 16+ versions (see `AUDIT_REMEDIATION.md` for the full history):
  - **v1–v7 (2026-07-14 to 2026-07-15):** Defensive fixes (withTimeout, CSP nonce, pricing column, migration journal, seed, fallback plans, PPR disable).
  - **v8 (2026-07-17):** Systematic Six-Axis audit remediation (11 findings fixed).
  - **v9–v12 (2026-07-17):** CSP restoration, generateStaticParams, DB direct query for slug routes.
  - **v13 (2026-07-19):** Six-Axis audit: 4 Critical + 19 Important (index routes DB direct, waitlist promotion, RBAC tiers, credit consumption, Stripe webhook handlers, Cloudflare env, glassmorphism, outline-hidden).
  - **v14 (2026-07-19):** Mockup fidelity restoration (Footer address/phone/email/hours, Hero copy/stats, section titles, CTA Band, marquee names).
  - **v15 (2026-07-19):** Removed withTimeout (doesn't fire during prerender).
  - **v16-1 (2026-07-19):** force-dynamic on 3 routes (DB query hangs during prerender).
  - **v16-2 (2026-07-19):** Disabled React Compiler (created excessive nested Suspense boundaries).
  - **v16-3 (2026-07-19):** Removed `strict-dynamic` from CSP — **THE definitive fix**: `strict-dynamic` caused browsers to ignore `unsafe-inline`, blocking Next.js's inline `$RC` scripts and preventing React hydration.
- **v17 comprehensive code review remediation (2026-07-21).** Systematic Six-Axis audit identified 11 outstanding issues; all remediated via TDD in 8 atomic commits. See `AUDIT_REMEDIATION.md §v17` for the full report. Critical fixes:
  - **V17-1 (P0 Security):** Production secrets (`BETTER_AUTH_SECRET`, `SANITY_API_TOKEN`, `SANITY_WEBHOOK_SECRET`) were committed to the public GitHub repo via `env.local` files (no leading dot — gitignore missed them). Files removed from git tracking, .gitignore strengthened, pre-commit hook updated. **Repo owner must rotate secrets + scrub git history.**
  - **V17-2 (Critical Tests):** CSP tests rewritten to verify behavior (parsed directives) instead of file content (string matching). Old tests passed even after V16-3 fix removed `'strict-dynamic'` — false confidence on a security-critical control.
  - **V17-3 (Critical UX):** CLS = 0.465 on home page (9× above target) fixed via HeroNextClass `min-h-[280px]` skeleton + Cormorant `font-display: optional`. Verification requires live deploy.
  - **V17-4–V17-10 (Important):** getRevenueDetails cartesian-join bug, instructor title lowercase, ILIKE wildcard escape, data-session DOM leak, studio address centralization, SSE rate limiting. See `AUDIT_REMEDIATION.md §v17` for details.

