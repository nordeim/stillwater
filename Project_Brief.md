# Project Brief — Stillwater

> **Updated:** 2026-07-12 (post-Phase 12 + 2026-07-12 remediation)
> Status: Phases 0–12 ✅ complete

## What it is

Stillwater is an enterprise-grade platform for a single yoga studio (Southeast Portland). It's not a SaaS — it's one studio's bespoke operations system: public marketing site, member class-booking, staff/admin tools, Stripe subscriptions, and background email/job processing. The whole product is wrapped around an "Editorial Calm" design identity (warm mineral palette: stone/clay/water/sand — no gradients, no drop shadows, no pill buttons).

## Current build state (the honest picture)

**All 13 phases (0–12) are complete and green.**

- **Phase 0 (Scaffold):** Complete. Turborepo + pnpm workspaces, 7 shared packages, 11 tooling configs, Docker Compose setup, and the full design system (self-hosted fonts, CSS tokens).
- **Phase 1 (Database):** Complete. 18 tables (15 domain + 3 Better Auth) Drizzle schema, 8 enums, 12 indexes (8 standard + 4 unique; the 5 Phase 1 'critical' indexes are a labelled subset), 5 migrations (`0000_dear_dagger.sql` + `0001_equal_iron_lad.sql` + `0002_lyrical_cargill.sql` + `0003_audit_log_phase9.sql` + `0004_huge_hawkeye.sql`), idempotent seed, dynamic driver selection.
- **Phase 2 (Auth & RBAC):** Complete. Better Auth v1.6.23 with Google OAuth, Magic Link, `customSession` plugin. RBAC matrix (13×6). 2-layer auth (proxy.ts + layout guards).
- **Phase 3 (API / tRPC):** Complete. 10 routers, ~42 procedures, 4 access tiers, advisory lock booking, rate limiting, full web integration.
- **Phase 4 (Marketing):** Complete. Sanity CMS client + 8 content type schemas, Sanity Studio app (`apps/studio/`), GROQ query registry with `published == true` filter, Zod response validation, Cloudflare Images signer, webhook→ISR revalidation with HMAC verification, 8 ISR-backed marketing pages (home, schedule, instructors list + detail, pricing, blog list + detail, about), MarketingNav + Footer with Editorial Calm design, skip-to-content link, error/loading boundaries, 11 shadcn/ui components with anti-generic patches (no shadows, `--radius: 0`).

- **Phase 5 (Booking):** Complete. SSE endpoint (`/api/schedule/stream`, maxDuration=300, 10s polling), `useSessionAvailability` hook (3 reconnection attempts, exponential backoff), 5 booking UI components (SeatAvailability, BookingButton, BookingConfirmation, WaitlistButton, BookingFlow) + `useBookingMutation` hook, `(studio)/book/[sessionId]` page, `ScheduleGrid` with Book CTA, Toaster mounted, waitlist unique index.

- **Phase 6 (Dashboard):** Complete. Member dashboard (`/dashboard`, `/profile`, `/membership`, `/history`), 7 dashboard components (MembershipStatusCard, CreditUsageWidget, UpcomingClassesWidget, ProfileSummaryCard, ProfileEditForm, ManageMembershipPanel, EnrollmentHistoryTable), CSV export utility, `memberships.getMySubscription` plan join, `memberships.resume` implemented (unstubbed in Phase 7).

**Phase 7 (Payments):** Complete. `@stillwater/payments` package (8 source files: client, types, subscriptions, webhooks, invoices, credit-packs, refunds, index) with 43 tests; Stripe webhook route `/api/webhooks/stripe/route.ts` (body as TEXT, HMAC verification, idempotent via `pg_advisory_xact_lock`); `CheckoutButton` component + `lib/stripe/utils.ts`; tRPC procedures unstubbed (`memberships.subscribe/cancel/pause/resume` + `payments.getPortalUrl/getInvoices`); `payments.refund` retained as D12 stub; ADR-010 accepted (Resend Native Templates for email).

**Phase 8 (Background Jobs & Email):** Complete. `@stillwater/workers` package — 11 Trigger.dev v4 task files (`attendance-summary`, `booking-confirmation`, `class-cancellation-notify`, `class-reminder-1h`, `class-reminder-24h`, `membership-credit-grant`, `membership-expiry-warn`, `payment-failed-notify`, `waitlist-expiry`, `waitlist-promotion`, `weekly-digest`), `trigger.config.ts` (root `@trigger.dev/sdk` import, `machine: "micro"`, `build.external` without `build.env`), 33 tests. `@stillwater/email` package — 13 React Email v6 templates + 3 shared components (`EmailLayout`, `EmailButton`, `EmailFooter`), dual-path `send.ts` (`sendEmail` for Server Components, `sendEmailNative` for workers per ADR-010), `template-ids.ts`, `send-helpers.ts`, 71 tests. Integration: `getJobsClient` in `@stillwater/config` (stub fallback when `TRIGGER_SECRET_KEY` unset), `bookings.book` triggers `booking-confirmation` (fire-and-forget); `class-reminder-24h`/`class-reminder-1h` run as **cron jobs** (every 15min / 5min) with idempotent dedup via `reminder24hSentAt`/`reminder1hSentAt`, `bookings.cancel` → `waitlist-promotion`, `memberships.cancel/pause` send emails, Stripe `invoice.payment_failed` → `payment-failed-notify` post-commit.

**Phase 9 (Admin Surface):** ✅ Complete. 11 admin pages, 9 admin components, 12 admin tRPC procedures; `audit_log` table (migration `0003_audit_log_phase9.sql`) with 3 indexes; 7 additional shadcn/ui components (table, form, input, textarea, checkbox, calendar, command) — 18 total; `cmdk` dependency; 5 admin E2E specs.

**Phase 10 (Observability):** ✅ Complete. Sentry + PostHog (18 events) + Axiom + Checkly (3 checks).

**Phase 11 (Accessibility & SEO):** ✅ Complete. WCAG AAA audit + SEO (robots, sitemap, manifest, 4 OG images, JSON‑LD, SkipLink, SrOnly, focus‑utils).

**Phase 12 (Landing Page):** ✅ Complete. Landing page port — 19 marketing components, 3 hooks, mobile nav drawer, scroll progress bar.

---

## Phase completion table

| Phase | Status | Quick Summary |
|---|---|---|
| 0 — Scaffold | ✅ Complete | Monorepo, tooling, Docker, design tokens |
| 1 — DB Schema | ✅ Complete | 18 tables (15 domain + 3 Better Auth), 8 enums, 12 indexes, 4 migrations, seed |
| 2 — Auth & RBAC | ✅ Complete | Better Auth, Google OAuth, Magic Link, RBAC matrix |
| 3 — tRPC API | ✅ Complete | 10 routers, ~42 procedures, advisory locks, rate limiting |
| 4 — Marketing | ✅ Complete | Sanity CMS, 8 ISR pages, webhook, Cloudflare Images, shadcn/ui |
| 5 — Booking | ✅ Complete | SSE endpoint, booking UI, useSessionAvailability hook, booking page |
| 6 — Dashboard | ✅ Complete | Member dashboard, profile editing, membership status, enrollment history, CSV export |
| 7 — Payments | ✅ Complete | Stripe subscriptions + credit packs (@stillwater/payments, webhook, CheckoutButton, unstubbed tRPC) |
| 8 — Background Jobs | ✅ Complete | 11 Trigger.dev tasks (33 tests) + 13 email templates (71 tests) |
| 9 — Admin Surface | ✅ Complete | 11 admin pages, 9 components, 12 procedures, audit_log table, 18 shadcn/ui total |
| 10 — Observability | ✅ Complete | Sentry + PostHog (18 events) + Axiom + Checkly (3 checks) |
| 11 — Accessibility | ✅ Complete | WCAG AAA audit, SEO, OG images, JSON‑LD |
| 12 — Landing Page | ✅ Complete | Port static mockup to Next.js production (19 components, 3 hooks) |

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

## Live quality gates (2026-07-12)

Run `pnpm check-types`, `pnpm lint`, `pnpm test`, and `pnpm build`.

| Gate | Result |
|---|---|
| `pnpm check-types` | **9/9 successful** ✅ |
| `pnpm lint` | **2/2 successful** ✅ (0 errors, 9 intentional warnings) |
| `pnpm test` | **651 tests passing** ✅ |
| `pnpm build` | **✅ 9/9 packages, 16 static pages** (verified 2026-07-12) ✅ |

> ⚠️ **Lint flake note:** `pnpm lint` (default parallel turborepo run) can intermittently fail with *"not found by the project service"* parsing errors on test files. This is a typescript-eslint `projectService` concurrency collision (two ESLint language-service instances racing), **not a code defect** — confirmed by running lint serially (`pnpm turbo run lint --concurrency=1` → 2/2 green) or per-package. Code is correct.

Test breakdown:
- `packages/db` — 17 test files / **117 tests**
- `packages/auth` — 4 test files / **102 tests**
- `packages/api` — 13 test files / **118 tests**
- `packages/payments` — 7 test files / **43 tests**
- `apps/web` — 28 test files / **159 tests**
- `packages/email` — 16 test files (13 template + 3 component) / **71 tests**
- `services/workers` — 11 test files / **41 tests**

Build output: marketing routes (8: home, schedule, instructors×2, pricing, blog×2, about) + studio (5) + admin (11, RBAC-gated) + auth (2) + API routes (trpc, auth catch-all, schedule/stream, sanity/webhook, `/api/webhooks/stripe`). ISR revalidate times: `/about` = 1d, `/blog` = 1h. (Home `/` exports `revalidate = 3600` in source but renders dynamic (ƒ) in the observed build — likely opted into on-demand rendering; verify in CI.) (`pnpm build` verified 2026-07-12: 9/9 packages, 16 static pages, 0 errors.)

---

## Notable architectural commitments (now implemented vs pending)

| Commitment | Status | Where it's enforced |
|---|---|---|
| PostgreSQL advisory locks for booking | ✅ Implemented | `packages/api/src/routers/bookings.ts` uses `pg_advisory_xact_lock()` |
| 2-layer auth (cookie-only proxy + full RBAC in layouts) | ✅ Implemented | `apps/web/proxy.ts` (Layer 1) + `apps/web/src/lib/auth.ts` (Layer 2) |
| RBAC permission matrix (13 × 6 roles) | ✅ Implemented | `packages/auth/src/rbac.ts` |
| Zod at every boundary | ✅ Implemented | `env.ts`, tRPC `input` schemas, rate-limit middleware |
| React Compiler | ✅ Enabled | `apps/web/next.config.ts` — `reactCompiler: true` |
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

- **Stray `error.txt` (resolved).** A `error.txt` build/`pnpm start` log was committed to the repo root via an "Add files via upload" commit by a non-agent author during the 2026-07-12 window. It has since been **removed and gitignored** (`error.txt` added to `.gitignore`). The earlier `app_start_log.txt` / `diff_output.txt` artifacts are not present in the current tree.
- **Docs aligned through Phase 12; refreshed 2026-07-12 after remediation.** Implementation matches AGENTS.md v2.9.0 / CLAUDE.md v2.9.0 / MEP v1.7.0. All 13 phases complete. Verify against the live test suite (643 tests ✅), not just the docs.
- **Migrations are canonical.** Five migrations define the current DB state: `0000_dear_dagger.sql` (initial 18-table schema), `0001_equal_iron_lad.sql` (instructors.published column), `0002_lyrical_cargill.sql` (waitlist unique index `idx_waitlist_session_member`), `0003_audit_log_phase9.sql` (audit_log table), `0004_huge_hawkeye.sql` (enrollments `reminder_24h_sent_at` / `reminder_1h_sent_at` for cron-reminder dedup). The two-migration sequence (`0000_chemical_obadiah_stane.sql` + `0001_supreme_sabretooth.sql`) referenced in older PAD callouts was historical and deleted during Phase 1–2 remediation. All five current migrations apply successfully via `pnpm db:migrate`.

