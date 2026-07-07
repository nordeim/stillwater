# Project Brief — Stillwater

> **Updated:** 2026-07-08 (post-Phase 3)
> Status: Phases 0–3 ✅ complete · Phases 4–12 ⬜ pending

## What it is

Stillwater is an enterprise-grade platform for a single yoga studio (Southeast Portland). It's not a SaaS — it's one studio's bespoke operations system: public marketing site, member class-booking, staff/admin tools, Stripe subscriptions, and background email/job processing. The whole product is wrapped around an "Editorial Calm" design identity (warm mineral palette: stone/clay/water/sand — no gradients, no drop shadows, no pill buttons).

## Current build state (the honest picture)

**Phases 0 through 3 are complete and green.** Phases 4 through 12 are not yet started.

- **Phase 0 (Scaffold):** Complete. Turborepo + pnpm workspaces, 7 shared packages, 11 tooling configs, Docker Compose setup, and the full design system (self-hosted fonts, CSS tokens).
- **Phase 1 (Database):** Complete. 14-table Drizzle schema, 8 enums, 5 critical indexes, a single clean migration (`0000_dear_dagger.sql`), an idempotent seed script, and dynamic database driver selection (`pg` for local Docker, `neon-http` for production Neon).
- **Phase 2 (Auth & RBAC):** Complete. Better Auth v1.6.23 with Google OAuth, Magic Link, and a `customSession` plugin for `memberId`/`roles` enrichment. RBAC permission matrix (13 permissions × 6 roles). 2-layer auth pattern: lightweight `proxy.ts` (cookie-only existence check) and full validation in Server Component layouts (`requireAuth` / `requireRole`).
- **Phase 3 (API / tRPC):** Complete. 10 routers with ~30 procedures, 4 access tiers (public, protected, staff, owner), advisory lock booking concurrency, rate limiting (Upstash Redis), and full web integration (HTTP handler, RSC caller, React client, query keys).

**Phases 4–12:** Pending. No Sanity Studio, no marketing pages, no booking UI, no Stripe client, no background jobs, no admin surface.

---

## Phase completion table

| Phase | Status | Quick Summary |
|---|---|---|
| 0 — Scaffold | ✅ Complete | Monorepo, tooling, Docker, design tokens |
| 1 — DB Schema | ✅ Complete | 14 tables, 8 enums, 5 indexes, migration, seed |
| 2 — Auth & RBAC | ✅ Complete | Better Auth, Google OAuth, Magic Link, RBAC matrix |
| 3 — tRPC API | ✅ Complete | 10 routers, ~30 procedures, advisory locks, rate limiting |
| 4 — Marketing | ⬜ Pending | Sanity CMS, ISR pages |
| 5 — Booking | ⬜ Pending | Booking flow, SSE real-time seat availability |
| 6 — Dashboard | ⬜ Pending | Member dashboard, membership management |
| 7 — Payments | ⬜ Pending | Stripe subscriptions, credit packs |
| 8 — Background Jobs | ⬜ Pending | 11 Trigger.dev tasks, 13 email templates |
| 9 — Admin Surface | ⬜ Pending | RBAC-gated admin for schedules, members, revenue |
| 10 — Observability | ⬜ Pending | Monitoring, performance budgets |
| 11 — Accessibility | ⬜ Pending | WCAG AAA audit, SEO, OG images |
| 12 — Landing Page | ⬜ Pending | Port static mockup to Next.js production |

---

## What exists on disk (verified)

These are the files you can actually `cat` and `test` today:

### Database & Schema
- `packages/db/src/schema/*.ts` — 14 Drizzle tables (users, members, instructors, class styles, classes, rooms, sessions, enrollments, waitlist, payments, memberships, role assignments, plus auth tables `session`, `account`, `verification`).
- `packages/db/src/schema/enums.ts` — 8 enums (class level, membership status, seat status, etc.).
- `packages/db/drizzle/migrations/0000_dear_dagger.sql` — Single clean migration (regenerated after ALTER COLUMN silent-failure fix).
- `packages/db/src/seed/index.ts` + `seed/env.ts` — Idempotent seed script loading synthetic demo data (5 users, 5 members, 3 instructors, 4 class styles, 4 classes, 2 rooms, 7 sessions, 3 membership plans). Loads `.env.local` before importing `db`.
- `packages/db/src/index.ts` — Dynamic driver: `pg.Pool` for local Docker, `neon-http` for Neon URLs.
- `packages/db/src/index.test.ts` + `schema/*.test.ts` — 16 test files, 107 tests.

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
- `packages/api/src/*.test.ts` — 13 test files, 104 tests.

### Web App
- `apps/web/src/app/api/auth/[...all]/route.ts` — Better Auth catch-all handler.
- `apps/web/src/app/api/trpc/[trpc]/route.ts` — tRPC HTTP handler.
- `apps/web/src/lib/trpc/server.ts` — RSC server caller.
- `apps/web/src/lib/trpc/client.tsx` — React Query + tRPC client provider.
- `apps/web/src/lib/trpc/query-keys.ts` — Query key factory.
- `apps/web/*.test.ts` — 3 test files, 13 tests.

### Config & Infrastructure
- `packages/config/src/env.ts` — t3-env Zod-validated schema covering **34 environment variables** with build-context Ernst fallbacks.
- `.npmrc` + `pnpm-workspace.yaml` — `@stillwater/source` custom condition declared in both.
- `docker-compose.yml` — Postgres 17 + Redis 7 + Adminer.
- `infrastructure/postgres/init/00-create-extensions.sql` — Docker init (uuid-ossp + pgcrypto).

### Design System
- `packages/ui/src/fonts/` — Self-hosted Cormorant Garamond, DM Sans, JetBrains Mono (`.woff2`).
- `packages/ui/src/index.ts` — CSS design token exports (colors, typography, spacing, motion).

---

## Live quality gates (2026-07-08)

Run `pnpm check-types`, `pnpm lint`, and `pnpm test`.

| Gate | Result |
|---|---|
| `pnpm check-types` | **16/16 successful** ✅ |
| `pnpm lint` | **2/2 successful** ✅ |
| `pnpm test` | **326 tests passing** ✅ |

Test breakdown:
- `packages/db` — 16 test files / **107 tests**
- `packages/auth` — 4 test files / **102 tests**
- `packages/api` — 13 test files / **104 tests**
- `apps/web` — 3 test files / **13 tests**

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
| Idempotent Stripe webhooks | 🔜 Pending | Schema ready (`payments` table); implementation in Phase 7 |
| WCAG 2.2 AAA | 🔜 Pending | Accessibility audit scheduled for Phase 11 |
| E2E testing | 🔜 Pending | Playwright config exists; no E2E scenarios written yet |

---

## What is NOT yet built

To avoid false expectations:

- **`apps/studio/`** — Not scaffolded. Sanity Studio will be hosted at `stillwater.sanity.studio` (Phase 4 decision).
- **Marketing pages** — No `(marketing)` route group, no Sanity CMS integration, no ISR.
- **Booking UI / SSE** — No `/book`, class schedule display, or real-time seat availability.
- **Member dashboard** — No `/(studio)/` route group or membership management pages.
- **Stripe integration** — `packages/payments/src/index.ts` is a `// Phase 0 placeholder`. No subscriptions, credit packs, or checkout.
- **Background jobs** — `services/workers/src/index.ts` is a placeholder. Zero Trigger.dev task files. Zero email templates (`packages/email/src/index.ts` is a placeholder).
- **Admin surface** — No `(admin)` route group or RBAC-gated management UI.
- **E2E / visual regression** — Playwright config exists but no test scenarios.

---

## Things worth flagging

- **`diff_output.txt` and `app_start_log.txt`** — Leftover working artifacts from early Phase 0 sessions; not project source. Safe to remove.
- **Docs still outpace code.** The repository contains ~230 KB of planning docs (PAD, MEP, SKILL, audit reports, mockups). The gap between documentation and implementation widens with each phase. Verify against the live test suite, not just the docs.
- **Migration is canonical.** The single `0000_dear_dagger.sql` is the definitive DB state; the two-migration sequence (`0000_chemical_obadiah_stane.sql` + `0001_supreme_sabretooth.sql`) referenced in some older PAD callouts is historical and was deleted during the Phase 1–2 remediation.
