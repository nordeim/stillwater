# Project Brief — Stillwater

> **Updated:** 2026-07-09 (post-Phase 8)
> Status: Phases 0–8 ✅ complete · Phases 9–12 ⬜ pending

## What it is

Stillwater is an enterprise-grade platform for a single yoga studio (Southeast Portland). It's not a SaaS — it's one studio's bespoke operations system: public marketing site, member class-booking, staff/admin tools, Stripe subscriptions, and background email/job processing. The whole product is wrapped around an "Editorial Calm" design identity (warm mineral palette: stone/clay/water/sand — no gradients, no drop shadows, no pill buttons).

## Current build state (the honest picture)

**Phases 0 through 8 are complete and green.** Phases 9 through 12 are not yet started.

- **Phase 0 (Scaffold):** Complete. Turborepo + pnpm workspaces, 7 shared packages, 11 tooling configs, Docker Compose setup, and the full design system (self-hosted fonts, CSS tokens).
- **Phase 1 (Database):** Complete. 17-table (14 domain + 3 Better Auth) Drizzle schema, 8 enums, 9 indexes (5 critical), 3 migrations (`0000_dear_dagger.sql` + `0001_equal_iron_lad.sql` + `0002_lyrical_cargill.sql`), idempotent seed, dynamic driver selection.
- **Phase 2 (Auth & RBAC):** Complete. Better Auth v1.6.23 with Google OAuth, Magic Link, `customSession` plugin. RBAC matrix (13×6). 2-layer auth (proxy.ts + layout guards).
- **Phase 3 (API / tRPC):** Complete. 10 routers, ~30 procedures, 4 access tiers, advisory lock booking, rate limiting, full web integration.
- **Phase 4 (Marketing):** Complete. Sanity CMS client + 8 content type schemas, Sanity Studio app (`apps/studio/`), GROQ query registry with `published == true` filter, Zod response validation, Cloudflare Images signer, webhook→ISR revalidation with HMAC verification, 8 ISR-backed marketing pages (home, schedule, instructors list + detail, pricing, blog list + detail, about), MarketingNav + Footer with Editorial Calm design, skip-to-content link, error/loading boundaries, 11 shadcn/ui components with anti-generic patches (no shadows, `--radius: 0`).

- **Phase 5 (Booking):** Complete. SSE endpoint (`/api/schedule/stream`, maxDuration=300, 10s polling), `useSessionAvailability` hook (3 reconnection attempts, exponential backoff), 5 booking UI components (SeatAvailability, BookingButton, BookingConfirmation, WaitlistButton, BookingFlow) + `useBookingMutation` hook, `(studio)/book/[sessionId]` page, `ScheduleGrid` with Book CTA, Toaster mounted, waitlist unique index.

- **Phase 6 (Dashboard):** Complete. Member dashboard (`/dashboard`, `/profile`, `/membership`, `/history`), 7 dashboard components (MembershipStatusCard, CreditUsageWidget, UpcomingClassesWidget, ProfileSummaryCard, ProfileEditForm, ManageMembershipPanel, EnrollmentHistoryTable), CSV export utility, `memberships.getMySubscription` plan join, `memberships.resume` implemented (unstubbed in Phase 7).

**Phase 7 (Payments):** Complete. `@stillwater/payments` package (8 source files: client, types, subscriptions, webhooks, invoices, credit-packs, refunds, index) with 43 tests; Stripe webhook route `/api/webhooks/stripe/route.ts` (body as TEXT, HMAC verification, idempotent via `pg_advisory_xact_lock`); `CheckoutButton` component + `lib/stripe/utils.ts`; tRPC procedures unstubbed (`memberships.subscribe/cancel/pause/resume` + `payments.getPortalUrl/getInvoices`); `payments.refund` retained as D12 stub; ADR-010 accepted (Resend Native Templates for email).

**Phase 8 (Background Jobs & Email):** Complete. `@stillwater/workers` package — 11 Trigger.dev v4 task files (`attendance-summary`, `booking-confirmation`, `class-cancellation-notify`, `class-reminder-1h`, `class-reminder-24h`, `membership-credit-grant`, `membership-expiry-warn`, `payment-failed-notify`, `waitlist-expiry`, `waitlist-promotion`, `weekly-digest`), `trigger.config.ts` (root `@trigger.dev/sdk` import, `machine: "micro"`, `build.external` without `build.env`), 33 tests. `@stillwater/email` package — 13 React Email v6 templates + 3 shared components (`EmailLayout`, `EmailButton`, `EmailFooter`), dual-path `send.ts` (`sendEmail` for Server Components, `sendEmailNative` for workers per ADR-010), `template-ids.ts`, `send-helpers.ts`, 71 tests. Integration: `getJobsClient` in `@stillwater/config` (stub fallback when `TRIGGER_SECRET_KEY` unset), `bookings.book` triggers `booking-confirmation` + class reminders fire-and-forget, `bookings.cancel` → `waitlist-promotion`, `memberships.cancel/pause` send emails, Stripe `invoice.payment_failed` → `payment-failed-notify` post-commit.

**Phases 9–12:** Pending. No admin surface, no observability, no WCAG AAA audit, no landing page port.

---

## Phase completion table

| Phase | Status | Quick Summary |
|---|---|---|
| 0 — Scaffold | ✅ Complete | Monorepo, tooling, Docker, design tokens |
| 1 — DB Schema | ✅ Complete | 17 tables (14 domain + 3 Better Auth), 8 enums, 5 critical indexes, 3 migrations, seed |
| 2 — Auth & RBAC | ✅ Complete | Better Auth, Google OAuth, Magic Link, RBAC matrix |
| 3 — tRPC API | ✅ Complete | 10 routers, ~30 procedures, advisory locks, rate limiting |
| 4 — Marketing | ✅ Complete | Sanity CMS, 8 ISR pages, webhook, Cloudflare Images, shadcn/ui |
| 5 — Booking | ✅ Complete | SSE endpoint, booking UI, useSessionAvailability hook, booking page |
| 6 — Dashboard | ✅ Complete | Member dashboard, profile editing, membership status, enrollment history, CSV export |
| 7 — Payments | ✅ Complete | Stripe subscriptions + credit packs (@stillwater/payments, webhook, CheckoutButton, unstubbed tRPC) |
| 8 — Background Jobs | ✅ Complete | 11 Trigger.dev tasks (33 tests) + 13 email templates (71 tests) |
| 9 — Admin Surface | ⬜ Pending | RBAC-gated admin for schedules, members, revenue |
| 10 — Observability | ⬜ Pending | Monitoring, performance budgets |
| 11 — Accessibility | ⬜ Pending | WCAG AAA audit, SEO, OG images |
| 12 — Landing Page | ⬜ Pending | Port static mockup to Next.js production |

---

## What exists on disk (verified)

These are the files you can actually `cat` and `test` today:

### Database & Schema
- `packages/db/src/schema/*.ts` — 17 Drizzle tables across 15 schema files: `users`, `members`, `instructors`, `classStyles`, `classes`, `rooms`, `classSessions`, `enrollments`, `waitlistEntries`, `memberSubscriptions`, `membershipPlans`, `classPackages`, `paymentEvents`, `roleAssignments`, `account`, `session`, `verification`. **Note:** PAD.md / SKILL.md / AGENTS.md v2.2.0 now cite **17 tables** (corrected from the earlier 14-table undercount); verified via `pgTable` declarations — migration `0000_dear_dagger.sql` contains all 17 `CREATE TABLE` statements.
- `packages/db/src/schema/enums.ts` — 8 enums (class level, membership status, seat status, etc.).
- `packages/db/drizzle/migrations/` — 3 migrations: `0000_dear_dagger.sql` (initial 17-table schema), `0001_equal_iron_lad.sql` (instructors.published column), `0002_lyrical_cargill.sql` (waitlist unique index `idx_waitlist_session_member`). Regenerated after `ALTER COLUMN` silent-failure fix (Phase 1–2 remediation). All three applied successfully via `pnpm db:migrate`.
- `packages/db/src/seed/index.ts` + `seed/env.ts` — Idempotent seed script loading synthetic demo data (5 users, 5 members, 3 instructors, 4 class styles, 4 classes, 2 rooms, 7 sessions, 3 membership plans). Loads `.env.local` before importing `db`.
- `packages/db/src/index.ts` — Dynamic driver: `pg.Pool` for local Docker, `neon-http` for Neon URLs.
- `packages/db/src/index.test.ts` + `schema/*.test.ts` — 16 test files, 109 tests.

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
- `packages/api/src/*.test.ts` — 14 test files (13 unit + 1 integration), 113 unit tests (integration test requires Docker).

### Web App
- `apps/web/src/app/api/auth/[...all]/route.ts` — Better Auth catch-all handler.
- `apps/web/src/app/api/trpc/[trpc]/route.ts` — tRPC HTTP handler.
- `apps/web/src/app/api/webhooks/stripe/route.ts` — Stripe webhook handler (Phase 7; body as TEXT, HMAC verification).
- `apps/web/src/lib/trpc/server.ts` — RSC server caller.
- `apps/web/src/lib/trpc/client.tsx` — React Query + tRPC client provider.
- `apps/web/src/lib/trpc/query-keys.ts` — Query key factory.
- `apps/web/src/**/*.test.ts` + `apps/web/src/**/*.test.tsx` — 23 test files, 132 tests.

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

## Live quality gates (2026-07-09)

Run `pnpm check-types`, `pnpm lint`, `pnpm test`, and `pnpm build`.

| Gate | Result |
|---|---|
| `pnpm check-types` | **9/9 successful** ✅ |
| `pnpm lint` | **2/2 successful** ✅ |
| `pnpm test` | **603 tests passing** ✅ |
| `pnpm build` | **✅ Compiled successfully** (all routes) ✅ |

Test breakdown:
- `packages/db` — 16 test files / **109 tests**
- `packages/auth` — 4 test files / **102 tests**
- `packages/api` — 14 test files (13 unit + 1 integration) / **113 unit tests**
- `packages/payments` — 7 test files / **43 tests**
- `apps/web` — 23 test files / **132 tests**
- `packages/email` — 16 test files (13 template + 3 component) / **71 tests**
- `services/workers` — 11 test files / **33 tests**

Build output: 8 marketing routes (home, schedule, instructors×2, pricing, blog×2, about) + 4 auth routes + API routes (trpc, auth catch-all, schedule/stream, sanity/webhook, and `/api/webhooks/stripe` added in Phase 7). ISR revalidate times: `/about` = 1d, `/blog` = 1h, `/` = 5min. (`pnpm build` reported green per AGENTS.md v2.3.0 / CLAUDE.md v2.1.0 (13/13 static routes) — not re-run in this review.)

---

## Notable architectural commitments (now implemented vs pending)

| Commitment | Status | Where it's enforced |
|---|---|---|
| PostgreSQL advisory locks for booking | ✅ Implemented | `packages/api/src/routers/bookings.ts` uses `pg_advisory_xact_lock()` |
| 2-layer auth (cookie-only proxy + full RBAC in layouts) | ✅ Implemented | `apps/web/proxy.ts` (Layer 1) + `apps/web/src/lib/auth.ts` (Layer 2) |
| RBAC permission matrix (13 × 6 roles) | ✅ Implemented | `packages/auth/src/rbac.ts` |
| Zod at every boundary | ✅ Implemented | `env.ts`, tRPC `input` schemas, rate-limit middleware |
| React Compiler | ✅ Enabled | `apps/web/next.config.ts` — `reactCompiler: true` |
| Library discipline (Radix/shadcn only) | ✅ Enforced | `packages/ui` imports from `@radix-ui/*` |
| Self-hosted fonts (zero FOUT) | ✅ Enforced | `packages/ui/src/fonts/` |
| Idempotent Stripe webhooks | ✅ Implemented | `packages/payments/src/webhooks.ts` + `/api/webhooks/stripe` (Phase 7; `pg_advisory_xact_lock`) |
| WCAG 2.2 AAA | 🔜 Pending | Accessibility audit scheduled for Phase 11 |
| E2E testing | 🔜 Pending | Playwright config exists; no E2E scenarios written yet |
| Background jobs (Trigger.dev tasks + Resend Native Templates) | ✅ Implemented | `services/workers/src/*` + `packages/email/src/*` (Phase 8) |

---

## What is NOT yet built

To avoid false expectations — Phases 0–8 are complete. The following are Phase 9–12 pending:

- **Admin pages** — `(admin)` route group has RBAC-gated layouts (`requireRole()` at `admin/layout.tsx`, `admin/revenue/layout.tsx`, `admin/settings/layout.tsx`) but zero admin `page.tsx` files. Full admin surface pending. Phase 9 pending.
- **Observability** — No Sentry, PostHog, Axiom, or Checkly integration yet. No performance budgets enforced. Phase 10 pending.
- **WCAG 2.2 AAA + SEO** — Accessibility audit, structured data (JSON-LD), OG image generation, and full meta tag coverage pending. Phase 11 pending.
- **Landing page port** — Static HTML mockup (`static_landing_page_mockup.html`) not yet ported to Next.js production pages. Phase 12 pending.
- **E2E test suite** — One E2E spec exists (`e2e/booking.spec.ts` — Phase 5 booking flow). Full multi-browser Playwright suite not yet written; config scaffolded but scenarios pending beyond booking.

---

## Things worth flagging

- **`app_start_log.txt`** — Leftover working artifact from early Phase 0 sessions; not project source. Safe to remove. (`diff_output.txt` already cleaned up.)
- **Docs aligned through Phase 8.** Phases 0–8 implementation matches AGENTS.md v2.3.0 / CLAUDE.md v2.1.0 / MEP v1.6.0 (verified 2026-07-09). The planning docs now remain ahead only for Phases 9–12 (4 remaining phases). Verify against the live test suite (603 tests ✅), not just the docs.
- **Migrations are canonical.** Three migrations define the current DB state: `0000_dear_dagger.sql` (initial 17-table schema), `0001_equal_iron_lad.sql` (instructors.published column), `0002_lyrical_cargill.sql` (waitlist unique index `idx_waitlist_session_member`). The two-migration sequence (`0000_chemical_obadiah_stane.sql` + `0001_supreme_sabretooth.sql`) referenced in older PAD callouts was historical and deleted during Phase 1–2 remediation. All three current migrations apply successfully via `pnpm db:migrate`.

