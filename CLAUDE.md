---
IMPORTANT: File is read fresh for every conversation. Be brief and practical.
project_type: nextjs-monorepo
version: 2.9.0
framework_version: "Next.js 16.2, React 19.2.7, Tailwind v4.3, tRPC v11, Drizzle 0.45, Better Auth 1.6.23, Stripe 22.3 (Dahlia), Trigger.dev v4"
last_updated: 2026-07-11
---

# Stillwater

Enterprise-grade yoga studio management platform. Turborepo monorepo combining a public marketing surface (Next.js 16 + Sanity CMS, ISR), a member booking application (real-time seat availability via SSE), an RBAC-gated admin surface, Stripe subscription billing, and Trigger.dev v4 background jobs.

**Tech Stack**: Next.js 16.2 (App Router, Turbopack, React Compiler), React 19.2.7, TypeScript 5.9.0 strict, Tailwind CSS v4.3, tRPC v11, Drizzle ORM 0.45, PostgreSQL 17 (Neon), Better Auth 1.6.23, Trigger.dev v4 (SDK import path is `@trigger.dev/sdk` root — see Gotchas), Stripe 22.3 ("Dahlia" API), Sanity CMS v3, React Email 6.6 + Resend 6.17, pnpm 11.9 workspaces.

**Canonical Sources** (read in this order when in doubt — precedence: design specs → visual guidance → tech stack → architecture culmination → derived working copy):
1. `design.md` — requirement specifications + original architectural critique (some sections superseded by ADRs — warnings inline)
2. `static_landing_page_mockup.html` + `static_landing_page_html_mockup.md` — visual + UI/UX aesthetics guidance only (token VALUES come from SKILL §4.1 / PAD §11.4)
3. `stillwater_SKILL.md` — distilled project skill (v2.3.0; 21 source skills condensed; 75 lessons); authoritative tech-stack specifics
4. `PAD.md` — Project Architecture Document (31 sections, 11 ADRs; v1.13.0); culmination of the above into codebase architecture
5. `MASTER_EXECUTION_PLAN.md` — derived working copy for the coding agent (13-phase plan + 45 reconciled discrepancies D1–D45 + all 10 Open Questions resolved; v1.6.0)
6. `scaffolding_files.md` — Phase 0 ready-to-paste configs (39 files) — **HISTORICAL: Phase 0 complete; actual files on disk are canonical**
7. `react_email_suggestion.md` / `pnpm_install_fix.md` — post-hoc ecosystem discovery docs (cited in MEP D43/D44)

**Phase 0–12 Status**: ✅ ALL 13 PHASES COMPLETE. Phase 0: scaffold + design tokens. Phase 1: 18 tables (15 domain + 3 Better Auth) + 8 enums + 5 critical indexes via Drizzle (migrations `0000_dear_dagger.sql` + `0001_equal_iron_lad.sql` + `0002_lyrical_cargill.sql` + `0003_audit_log_phase9.sql`). Phase 2: Better Auth v1.6.23 + RBAC + 2-layer auth. Phase 3: 10 tRPC routers (~42 procedures) with advisory lock booking, rate limiting, 4 access tiers, web integration. Phase 4: Sanity CMS + 8 content types + Studio app, GROQ queries with `published == true`, Zod validation, Cloudflare Images signer, webhook→ISR with HMAC, 8 ISR marketing pages, 18 shadcn components, `transpilePackages` build fix (ADR-011). Phase 5: SSE endpoint (`/api/schedule/stream`, maxDuration=300), `useSessionAvailability` hook (3 reconnection attempts), 5 booking UI components, `(studio)/book/[sessionId]` page, `ScheduleGrid` with Book CTA, Toaster mounted, waitlist unique index. Phase 6: Member dashboard (`/dashboard`, `/profile`, `/membership`, `/history`), 7 dashboard components, CSV export utility, `memberships.getMySubscription` plan join. Phase 7: Stripe payment integration — `@stillwater/payments` package (7 source files, 43 tests: `client.ts` singleton with Dahlia API, `types.ts` 7-event discriminated union, `subscriptions.ts` 5 lifecycle helpers, `webhooks.ts` idempotent handler with `pg_advisory_xact_lock` + 7 event handlers, `invoices.ts` cursor pagination, `credit-packs.ts` one-off checkout, `refunds.ts` D12 thin wrapper), Stripe webhook route at `/api/webhooks/stripe/route.ts` (body as TEXT, signature verification, 400/500/200), `CheckoutButton` component, `lib/stripe/utils.ts`, all tRPC procedures unstubbed (`memberships.subscribe/cancel/pause/resume` + `payments.getPortalUrl/getInvoices`), `payments.refund` retained as D12 stub, ADR-010 accepted (Resend Native Templates), 5 STRIPE acceptance tests passing. Phase 8: Background jobs + email — `@stillwater/email` package (19 source files, 71 tests: 3 shared components, 13 React Email v6 templates, dual-path send.ts with sendEmail for Server Components + sendEmailNative for workers per ADR-010, 13 send-helpers, template-ids.ts), `@stillwater/workers` package (12 source files, 33 tests: 11 Trigger.dev v4 tasks with per-task maxDuration + retry, all use sendEmailNative via send-helpers), integration wiring (getJobsClient in @stillwater/config with stub fallback, bookings.book triggers booking-confirmation + reminders fire-and-forget, bookings.cancel job ID fixed to waitlist-promotion, memberships.cancel/pause send emails, Stripe webhook invoice.payment_failed triggers payment-failed-notify post-commit). Phase 9: Admin surface (RBAC-gated) — 11 admin pages (`/admin` dashboard, `/admin/classes` + `[id]` + `new`, `/admin/schedule`, `/admin/instructors`, `/admin/members` + `[id]`, `/admin/revenue`, `/admin/settings`, `/admin/audit-log`), 9 admin components (AdminShell, KpiCard, ClassForm, SessionForm, ScheduleCalendar with @dnd-kit/core, RosterTable with check-in, RevenueChart via Recharts, MemberRoleEditor owner-only, SignOutButton), 12 admin tRPC procedures (`listClasses`, `deleteClass`, `listMembers`, `getMemberDetail`, `getRevenueDetails` with real MRR/churn/attendance, `assignRole` owner-only, `removeRole` owner-only, `listAuditLog`, `getDashboard`, `getRevenue`, `getClassRoster`, `getAttendanceStats`), `audit_log` table (migration `0003_audit_log_phase9.sql`) with 3 indexes, 7 new shadcn components (table, form, input, textarea, checkbox, calendar, command), `cmdk` dependency, `lib/admin/audit-log.ts` helper, 5 E2E spec files with skipIf guards. All admin mutations audit-logged. 2-layer auth defense-in-depth via nested layouts (revenue=manager+, settings=owner). Phase 10: Observability (Sentry + PostHog 18 events + Axiom + Checkly 3 checks). Phase 11: WCAG AAA audit + SEO (robots, sitemap, manifest, 4 OG images, JSON-LD, SkipLink, SrOnly, focus-utils). Phase 12: Landing page port (19 marketing components, 3 hooks, mobile nav drawer, scroll progress bar). **643 tests passing** (117 db + 102 auth + 118 api + 43 payments + 159 web + 71 email + 33 workers). All quality gates green: `pnpm check-types` ✅, `pnpm lint` ✅ (0 errors, 9 intentional warnings), `pnpm test` ✅ (643/643), `pnpm build` ✅ (9/9 packages, 16 static pages).

---

## Foundational Principles

### Meticulous Approach (Six-Phase Workflow)

Follow this six-phase workflow for all implementation tasks:

1. **ANALYZE** - Deep, multi-dimensional requirement mining
   - Never make surface-level assumptions
   - Identify explicit requirements, implicit needs, and potential ambiguities
   - Read source documents (PAD, MASTER_EXECUTION_PLAN, scaffolding_files) before touching code
   - Perform risk assessment against the 15 documented risks in `MASTER_EXECUTION_PLAN.md` §8

2. **PLAN** - Structured execution roadmap
   - Create detailed plan with sequential phases
   - Present plan for explicit user confirmation
   - Reference the relevant Phase in `MASTER_EXECUTION_PLAN.md` §6
   - Never proceed without validation

3. **VALIDATE** - Explicit confirmation checkpoint
   - Obtain explicit user approval before implementation
   - Address the 10 Open Questions in `MASTER_EXECUTION_PLAN.md` §9 if relevant

4. **IMPLEMENT** - Modular, tested, documented builds
   - Follow TDD: RED → GREEN → REFACTOR → COMMIT (one cycle per atomic commit)
   - Apply Phase 0 patches (D15–D24) before any other phase begins
   - Set up environment via `pnpm install && docker compose up -d && pnpm db:migrate`

5. **VERIFY** - Rigorous QA against success criteria
   - All 8 CI gates must pass: `check-types`, `lint`, `test`, `build`, `test:e2e`, `lighthouse`, `bundle-size`, `audit`
   - Verify per-phase acceptance criteria in `MASTER_EXECUTION_PLAN.md` §6
   - Consider edge cases, accessibility (WCAG 2.2 AAA), performance (Core Web Vitals)

6. **DELIVER** - Complete handoff with knowledge transfer
   - Update `MASTER_EXECUTION_PLAN.md` with phase completion timestamp
   - Add ADR if significant decision was made (PAD §23)
   - Include rollback script as PR comment for any migration

### Project-Specific Principles

- **Editorial Calm Design** — Anti-generic enforcement: no purple gradients, no Inter-only typography, no drop shadows, no pill CTAs, no 3-column card grids. See `PAD.md` §11.2 for full banned/required contract.
- **WCAG 2.2 Level AAA** — Non-negotiable for the 35–65 yoga demographic. 7:1 contrast minimum, full keyboard nav, reduced-motion globally respected.
- **TypeScript Strict, No `any`** — `strict: true` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `useUnknownInCatchVariables`. Use `unknown` and narrow.
- **Library Discipline** — If Radix UI / shadcn provides a primitive, USE IT. Never rebuild. Wrap or style to achieve "Editorial Calm" look, but the underlying primitive must come from the library.
- **Zod at Every Boundary** — tRPC procedure inputs, env vars (t3-env), webhook payloads, form values. No exception.
- **Advisory Locks for Concurrency** — `pg_advisory_xact_lock()` for booking (ADR-004). Never optimistic locking for limited-capacity resources.
- **Idempotent Webhooks** — `payment_events.stripe_event_id` UNIQUE INDEX + `pg_advisory_xact_lock` (transaction-scoped, NOT session-scoped — Neon PgBouncer) for Stripe event processing.
- **Side Effects in Background Jobs** — Emails, notifications, digests never run synchronously in API routes. Always trigger a Trigger.dev v4 task.
- **Self-Hosted Fonts** — Cormorant Garamond + DM Sans + JetBrains Mono (Apache 2.0; Berkeley Mono was Phase 1 proposal but paid/unlicensed). Zero FOUT, zero third-party font CDN in production.
- **2-Layer Auth Pattern** (ADR-009) — `proxy.ts` does cookie-existence-only check via `getSessionCookie()` (Edge-compatible, NO DB); full validation + RBAC via `requireAuth()`/`requireRole()` in Server Component layouts (Node.js runtime). NEVER call `auth.api.getSession()` in `proxy.ts`.

---

## Implementation Standards

### General Coding Practices

- **Early Returns**: Prefer early returns over deeply nested conditionals
- **Composition over Inheritance**: Favor composition patterns
- **Self-Documenting Code**: Clear naming and structure
- **Test-Driven Development**: Red-Green-Refactor cycle, one atomic commit per cycle
- **Surgical Changes**: Touch only what you must. Don't "improve" adjacent code. Match existing style.
- **Goal-Driven Execution**: Transform tasks into verifiable goals (`pnpm test --grep "BOOK-006"`)

### Next.js 16 Specific

- **App Router**: Use `app/` directory for all routes and layouts
- **`proxy.ts` NOT `middleware.ts`**: Next.js 16 renamed middleware to proxy; exported function must be named `proxy` (ADR-009)
- **Server Components by default**: Add `'use client'` only when interactivity needed (state, effects, event handlers)
- **React Compiler**: Enabled via `reactCompiler: true` in `next.config.ts` — no `useMemo`/`useCallback` unless profiler evidence
- **Turbopack**: Default bundler in dev (`next dev --turbopack`) and prod (`next build`)
- **`serverExternalPackages`** (top-level, NOT `experimental.serverComponentsExternalPackages`): `@neondatabase/serverless`, `drizzle-orm`, `better-auth`
- **Next.js Image**: Use `<Image>` for all images with explicit `width` + `height` (CLS prevention); `priority` ONLY on above-fold LCP
- **next/font/local**: Self-host all fonts (no Google Fonts CDN in production)
- **Metadata API**: Use `generateMetadata()` and `export const metadata` for SEO
- **Route Handlers**: `app/api/*/route.ts` ONLY for external webhooks and SSE; all app data goes through tRPC
- **Rendering Strategy per Route** (see `PAD.md` §12):
  - Marketing pages → ISR (1 hour revalidate)
  - Schedule → ISR (5 min revalidate)
  - Blog → SSG + On-Demand Revalidation (Sanity webhook)
  - Dashboard, admin, profile → SSR (no cache, auth-gated)
  - Booking flow → CSR (real-time seat data via SSE)

### TypeScript Strict Mode

- `strict: true` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `useUnknownInCatchVariables` in `tooling/typescript/base.json`
- Never use `any` — use `unknown` and narrow with type guards
- Prefer `interface` for object shapes; `type` for unions/intersections/mapped types
- Avoid explicit return types unless needed for public API; lean on type inference
- Zod schemas generate types: `type BookingFormValues = z.infer<typeof bookingSchema>`
- `as any` is an absolute last resort — always use real type safety

### React 19 Patterns

- **No `forwardRef`**: React 19 allows `ref` as a regular prop
- **Server Components by default**: Fetch data, render UI, access backend directly
- **Client Islands**: Only add `'use client'` when using `useState`, `useEffect`, event handlers, or browser APIs
- **Composition**: Co-locate `Component.tsx` with `Component.test.tsx`
- **Error Handling**: `error.tsx` and `loading.tsx` at every route segment
- **No inline object/array creation in JSX** (causes re-renders)
- **`useMemo`/`useCallback` ONLY with profiler evidence** — React Compiler handles memoization

### Tailwind CSS v4

- **CSS-first config**: Design tokens live in `apps/web/src/app/globals.css` via `@theme` directive
- **No `tailwind.config.js` required**: `tailwind.config.ts` only declares content paths + plugins
- **Token names from PAD**: Use `--space-N` (NOT mockup's `--sp-N`), `--duration-*` (NOT `--dur-*`)
- **No arbitrary values**: Extend `@theme` instead
- **Plugins used**: `@tailwindcss/typography` (blog), `@tailwindcss/container-queries` (component responsive)
- **Sharp edges by design**: `borderRadius.DEFAULT: 0` — editorial feel, no rounded cards

### tRPC v11

- **10 routers** merged in `packages/api/src/root.ts`: `schedule`, `classes`, `sessions`, `bookings`, `waitlist`, `members`, `instructors`, `memberships`, `payments`, `admin`
- **4 procedure tiers**: `publicProcedure`, `protectedProcedure`, `staffProcedure`, `ownerProcedure`
- **Server Components** use `apiCaller()` from `apps/web/src/lib/trpc/server.ts` (zero HTTP round-trip)
- **Client Components** use tRPC React Query adapter from `apps/web/src/lib/trpc/client.ts`
- **Zod input on every procedure**: No exceptions, no `any` inputs
- **No raw DB queries in components**: All data through tRPC
- **Rate limiting**: Via Upstash Redis middleware on `bookings.book` (10/min) and auth mutations

### Drizzle ORM

- **Schema in TypeScript**: Files in `packages/db/src/schema/*.ts` — no `.prisma` file
- **No codegen step**: Schema changes are immediately reflected in types
- **Migrations**: `pnpm db:generate` (creates SQL) → review → `pnpm db:migrate` (applies)
- **Always use `DATABASE_URL_UNPOOLED` for migrations** (PgBouncer breaks prepared statements)
- **No N+1 queries**: Use Drizzle's `with` for relations
- **Cursor-based pagination** for large datasets (admin tables, attendance history)
- **Advisory locks**: `sql\`SELECT pg_advisory_xact_lock(${hashStringToBigInt(sessionId)})\`` inside transactions
- **Never `SELECT *`**: Project only needed columns

### Better Auth (replaces Auth.js v5 — ADR-008)

- **Drizzle adapter**: `drizzleAdapter(db, { provider: 'pg' })`
- **Providers**: Google OAuth + Magic Link via Resend
- **Session enrichment**: Use the `customSession` plugin from `better-auth/plugins/custom-session` to attach `memberId` + `roles` from `role_assignments` table (NOT `session.sessionData` — that API doesn't exist in v1.6.23; see Gotcha 20)
- **Server-side**: `auth.api.getSession({ headers: await headers() })`
- **Client-side**: `authClient.useSession()` hook returns `{ data, error, refetch, isPending }` (NOT Auth.js `{ data, status, update }`)
- **Route handler path**: `/api/auth/[...all]/route.ts` (NOT `[...nextauth]`) using `toNextJsHandler(auth)`
- **2-Layer Route Protection** (ADR-009, mandatory):
  - **Layer 1 — `proxy.ts` (Edge)**: Cookie-existence-only check via `getSessionCookie(request)` from `better-auth/cookies`. NO DB access. NO `auth.api.getSession()`. NO RBAC role checks. Fast redirect for unauthenticated.
  - **Layer 2 — Server Component layouts (Node.js)**: Full session validation via `requireAuth()` / `requireRole(...roles)` in `(studio)/layout.tsx`, `(admin)/layout.tsx`, nested revenue/settings layouts.
- **Server helpers**: `getSession()`, `requireAuth()`, `requireRole(...roles)` in `apps/web/src/lib/auth.ts` (throws `NEXT_REDIRECT` — never wrap in try/catch)

### Library Discipline (Critical)

If a UI library provides a primitive, USE IT. Do not rebuild:

| Need                  | Use                              | Don't rebuild                |
|-----------------------|----------------------------------|------------------------------|
| Dialog / Modal        | Radix `Dialog`                   | Custom overlay               |
| Tabs                  | Radix `Tabs`                     | Custom tab logic             |
| Select dropdown       | Radix `Select`                   | Custom dropdown              |
| Toast notifications   | `sonner`                         | Custom toast                 |
| Date picker           | `react-day-picker`               | Custom calendar              |
| Data tables           | `@tanstack/react-table`          | Custom table                 |
| Forms                 | `react-hook-form` + Zod resolver | Custom form state            |
| Server state          | `@tanstack/react-query` (via tRPC) | Custom fetch hooks       |
| URL state             | `nuqs`                           | Custom URL parsing           |
| Animations            | `framer-motion`                  | Custom CSS keyframes (mostly)|

Exception: You may wrap or style library components to achieve the "Editorial Calm" look, but the underlying primitive must come from the library.

### UI State Completeness

Every data-dependent UI must implement all 4 states:

- ✅ **Loading**: Skeleton components (NOT spinners for layout-defining content)
- ✅ **Error**: Inline error with retry action + Sentry capture
- ✅ **Empty**: Meaningful empty state with a clear call-to-action
- ✅ **Success**: The actual content

Rule: Show loading state ONLY when no data exists. For re-fetches, keep showing stale data.

---

## Development Workflow

### Environment Setup

```bash
# Prerequisites: Node.js >= 22, pnpm >= 11, Docker

# Clone and install
git clone https://github.com/nordeim/stillwater.git
cd stillwater
pnpm install                            # Uses @stillwater/source custom condition

# Configure env
cp .env.example .env.local
# Edit .env.local:
#   - BETTER_AUTH_SECRET=$(openssl rand -base64 32)
#   - DATABASE_URL password must match docker-compose (stillwater_local_dev)

# Start local services
docker compose up -d                    # Postgres 17 + Redis 7 + Adminer

# Initialize database
pnpm db:migrate                         # Uses DATABASE_URL_UNPOOLED
pnpm db:seed                            # Loads 5 members, 3 instructors, 4 classes, 7 sessions

# Start dev
pnpm dev                                # Next.js on :3000 + Trigger.dev worker
```

### Build Commands

| Command                          | Purpose                                            |
|----------------------------------|----------------------------------------------------|
| `pnpm dev`                       | Start all apps in dev mode (Turbopack)             |
| `pnpm dev --filter=@stillwater/web`          | Start only `apps/web`                              |
| `pnpm build`                     | Production build across all packages               |
| `pnpm build --filter=@stillwater/web`        | Build only web app                                 |
| `pnpm check-types`               | TypeScript type check across all packages          |
| `pnpm lint`                      | ESLint across all packages                         |
| `pnpm lint:fix`                  | Auto-fix ESLint issues                             |
| `pnpm format`                    | Prettier write                                     |
| `pnpm format:check`              | Prettier verify (CI)                               |
| `pnpm clean`                     | Remove all build artifacts + node_modules          |

### Database Commands

| Command                | Purpose                                                       |
|------------------------|---------------------------------------------------------------|
| `pnpm db:generate`     | Generate Drizzle migration SQL from schema changes            |
| `pnpm db:migrate`      | Apply pending migrations (uses `DATABASE_URL_UNPOOLED`)       |
| `pnpm db:push`          | Push schema directly (dev only, no migration generated)       |
| `pnpm db:seed`         | Seed development data (idempotent via `onConflictDoNothing`)  |
| `pnpm db:studio`       | Open Drizzle Studio GUI (DB browser)                          |
| `pnpm db:reset`        | Drop all tables + migrate + seed (LOCAL ONLY — refuses in prod)|

### Background Jobs

| Command              | Purpose                                    |
|----------------------|--------------------------------------------|
| `pnpm jobs:dev`      | Start Trigger.dev local worker             |
| `pnpm jobs:deploy`   | Deploy jobs to Trigger.dev Cloud           |

### Stripe Webhook Local Testing

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# In another terminal, trigger test events:
stripe trigger invoice.paid
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.updated
```

---

## Testing Strategy

### Test Pyramid

- **~300 Unit Tests** (Vitest, fast, isolated) — pure business logic, factory-pattern test data
- **~80 Integration Tests** (Vitest + Testcontainers Postgres) — full transaction flows, webhook processing
- **~20 E2E Tests** (Playwright) — critical user journeys across chromium + firefox + webkit
- **Visual Regression** (Playwright + Percy) — weekly on UI package changes
- **A11y Automated** (`@axe-core/playwright` + Lighthouse Accessibility) — target: 100

### Test Commands

```bash
# Unit + integration
pnpm test                                # All packages
pnpm test --filter=@stillwater/api       # Single package
pnpm test:watch                          # Watch mode
pnpm test:coverage                       # With V8 coverage report

# E2E
pnpm test:e2e                            # All browsers
pnpm test:e2e --ui                       # Interactive Playwright UI
pnpm test:e2e -- --grep "booking"        # Filter by scenario name

# A11y + Lighthouse
pnpm lighthouse ci                       # Lighthouse CI (target: A11y 100, SEO 100)
```

### Testing Standards

- **Test files co-located**: `Component.tsx` next to `Component.test.tsx`
- **Integration tests**: `*.integration.test.ts` in package `test/` directory
- **E2E tests**: `e2e/<scenario>.spec.ts` in root
- **Factory pattern for all test data** — never hardcoded fixtures:
  ```typescript
  const getMockMember = (overrides?: Partial<Member>): Member => ({
    id: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    displayName: 'Test Member',
    joinedAt: new Date(),
    ...overrides,
  });
  ```
- **Mock Drizzle client** for unit tests; use **Testcontainers Postgres** for integration tests
- **Use `@testing-library/react`** for component tests
- **Test behavior, not implementation**

### Coverage Targets

| Package                          | Target | Why                                              |
|----------------------------------|--------|--------------------------------------------------|
| `packages/api/routers/*`         | 90%    | Booking logic, waitlist, credit consumption      |
| `packages/payments/*`            | 95%    | Subscription state machine, webhook handlers     |
| `packages/db/schema/*`           | 80%    | Constraints, relationships                       |
| `apps/web/components/*`          | 70%    | Interaction behavior, state transitions          |
| `services/workers/*`             | 85%    | Job execution, error paths                       |

### Critical Test Scenarios (must exist)

- **BOOK-001** through **BOOK-006**: Booking flow including concurrent booking (10 simultaneous requests, 1 seat → exactly 1 confirmed, 9 waitlisted)
- **WAIT-001** through **WAIT-005**: Waitlist promotion, offer expiry, credit return
- **STRIPE-001** through **STRIPE-005**: Idempotent webhook processing, signature verification, subscription lifecycle

---

## Code Quality Standards

### Linting & Formatting

```bash
pnpm lint              # ESLint v9.39.4 flat config (tooling/eslint/index.js) — DO NOT upgrade to v10 (see Gotchas)
pnpm lint:fix          # Auto-fix
pnpm format            # Prettier (printWidth 100, singleQuote, semi, trailingComma all)
pnpm format:check      # Verify in CI
pnpm check-types       # tsc --noEmit across all packages
```

### ESLint Rules (enforced)

Key rules from `tooling/eslint/index.js`:

- `@typescript-eslint/no-explicit-any`: **error** (use `unknown`)
- `@typescript-eslint/consistent-type-imports`: **error** (prefer `import type`)
- `@typescript-eslint/consistent-type-definitions`: **error** (interface over type)
- `@typescript-eslint/no-floating-promises`: **error**
- `@typescript-eslint/await-thenable`: **error**
- `react-hooks/exhaustive-deps`: **error**
- `import/order`: **error** (groups: builtin, external, internal, parent, sibling, index, type; `@stillwater/**` treated as internal; newlines-between: always; alphabetize: asc)
- `import/no-cycle`: **error**
- `tailwindcss/no-contradicting-classname`: **error**

### Import Order Convention

```typescript
// 1. React
import { useState } from 'react';

// 2. Next.js
import { headers } from 'next/headers';
import Image from 'next/image';

// 3. External packages
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

// 4. Internal packages (@stillwater/*)
import { db } from '@stillwater/db';
import { auth } from '@stillwater/auth';

// 5. Relative imports
import { BookingFlow } from './BookingFlow';

// 6. Types (import type)
import type { Session } from '@stillwater/auth';
```

### Naming Conventions

| Element           | Convention           | Example                       |
|-------------------|----------------------|-------------------------------|
| Components        | PascalCase           | `BookingFlow.tsx`             |
| Files (utility)   | camelCase            | `formatDate.ts`               |
| Files (config)    | kebab-case           | `next.config.ts`              |
| Hooks             | `use` prefix         | `useSessionAvailability.ts`   |
| tRPC routers      | camelCase + `Router` | `bookingsRouter`              |
| DB tables         | snake_case           | `class_sessions`              |
| DB schema files   | kebab-case           | `class-sessions.ts`           |
| CSS variables     | kebab-case           | `--color-clay-400`            |
| PostHog events    | snake_case, past tense | `class_booked`              |
| Conventional commits | `<type>(<scope>): <subject>` | `feat(bookings): add advisory lock` |

---

## Git & Version Control

### Branching Strategy

```
main         ← Production. Protected. PR + all 8 CI gates + 1 reviewer.
develop      ← Staging. Integration branch. PR + CI gates.
feature/*    ← Feature branches. Branch from develop.
fix/*        ← Bug fixes.
hotfix/*     ← Emergency fixes. Branch from main. PR → main + backport to develop.
```

Short-lived branches (merge within 1–3 days).

### Commit Standards

Follow **Conventional Commits**:

```
feat(bookings): add advisory lock for concurrent booking safety
fix(stripe): handle duplicate webhook events idempotently
docs(pad): add ADR-008 Better Auth migration
chore(deps): bump next to 16.0.1
test(api): add BOOK-006 concurrent booking regression
refactor(ui): consolidate Button variants
perf(schedule): add partial index on sessions.starts_at
```

Atomic commits: one logical change per commit. Each TDD cycle = one commit.

### Pre-commit Checklist

Before committing, verify locally:

```bash
pnpm check-types       # TypeScript green (9/9 tasks)
pnpm lint              # ESLint green (2/2 tasks)
pnpm test              # Vitest green (643 tests: 117 db + 102 auth + 118 api + 43 payments + 159 web + 71 email + 33 workers)
pnpm build             # Next.js production build (13/13 pages)
```

### PR Template

Every PR must complete the Architecture Validation Checklist (`.github/PULL_REQUEST_TEMPLATE.md`):
- **Security**: Correct procedure access level, Zod validation, no client-side secrets
- **Data**: NOT NULL constraints, indexes added, reversible migration with rollback script
- **Performance**: No N+1 queries, follows rendering strategy, image dimensions explicit
- **Reliability**: Side effects in background jobs, webhooks idempotent
- **Accessibility**: Component a11y tests, 7:1 contrast, keyboard nav tested
- **Documentation**: PAD updated if architecture changed, ADR added if significant decision, `.env.example` updated if new env var

---

## Error Handling & Debugging

### Error Handling Approach

- **Anticipate potential failures**: Every async operation wrapped in try/catch or surfaced via Result type
- **Graceful error recovery**: tRPC `TRPCError` with proper codes (`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `BAD_REQUEST`, `INTERNAL_SERVER_ERROR`, `PAYMENT_REQUIRED`)
- **User-friendly error messages**: Specific and actionable; never expose stack traces to client
- **Sentry capture**: All unhandled errors sent to Sentry with `userId` + `requestId` context
- **Aria-live for dynamic errors**: Form errors announced to screen readers via `aria-describedby`

### Debugging Tools

```bash
# Drizzle Studio (DB GUI)
pnpm db:studio                          # Opens at https://local.studio.drizzle.com

# Adminer (alternative DB GUI)
open http://localhost:8080              # After `docker compose up -d`

# Next.js DevTools
# - React Compiler tab in browser DevTools
# - Server Components inspector

# Trigger.dev dashboard
# - Local: https://local.trigger.dev
# - Cloud: https://cloud.trigger.dev

# Stripe webhook logs
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Sentry
# - Source maps uploaded in CI via SENTRY_AUTH_TOKEN
# - Session replay enabled for booking flow (PII-aware mask)

# PostHog
# - Reverse proxied at /_analytics/ for privacy
# - 18 events tracked (see SKILL §20.10 / PAD §19.3)

# Axiom logs
# - All server logs structured JSON
# - Queryable by requestId
```

### Common Pitfalls to Avoid

1. **Client Component overuse**: Default to Server Components; add `'use client'` only for interactivity
2. **Missing error boundaries**: Create `error.tsx` at every route segment
3. **No loading states**: Create `loading.tsx` for streaming UI
4. **Inline styles**: Use Tailwind classes or CSS Modules, never `style={{}}` props
5. **Importing Server Components in Client Components**: Creates boundary violations
6. **Missing image optimization**: Use `<Image>` not `<img>` for all images
7. **Unoptimized fonts**: Use `next/font/local` not `<link>` for fonts
8. **Using `DATABASE_URL` for migrations**: Always use `DATABASE_URL_UNPOOLED` (PgBouncer breaks prepared statements)
9. **Forgetting `runtime = 'nodejs'` on SSE route**: SSE must run on Node runtime, not Edge. Do NOT set `export const dynamic = 'force-dynamic'` — incompatible with `cacheComponents: true` (Next.js 16 build error)
10. **Calling `next lint` in Next.js 16**: Deprecated — use `eslint .` directly (D23)
11. **Using `experimental.serverComponentsExternalPackages`**: Renamed to top-level `serverExternalPackages` in Next.js 16 (D21)
12. **Hardcoded mockup `--sp-N` spacing tokens**: Use PAD's `--space-N` (off-by-one from index 5; D26)
13. **Forgetting idempotency on Stripe webhooks**: Always check `payment_events.stripe_event_id` UNIQUE INDEX first; use `pg_advisory_xact_lock` (transaction-scoped), NOT `pg_advisory_lock` (session-scoped — leaks under Neon PgBouncer)
14. **Calling `auth.api.getSession()` inside `proxy.ts`**: Too expensive for every request regardless of runtime (Edge or Node.js — Next.js 16 docs are inconsistent on the default). Use `getSessionCookie()` (cookie-only) in proxy.ts; full validation in Server Component layouts (D36, ADR-009)
15. **Importing `@trigger.dev/sdk/v3` (deprecated)**: Use root `import { defineConfig } from "@trigger.dev/sdk"` per official Trigger.dev v4 docs. The `/v3` subpath is the deprecated v3-era pattern (both resolve to the same file, but root is the official v4 path). The `/v4` export does NOT exist. See Gotchas §1.
16. **Upgrading ESLint to v10**: `eslint-plugin-react@7.37.5` and `eslint-plugin-import@2.32.0` do NOT support ESLint v10 (no v10-compatible versions exist). Stay on ESLint v9.39.4 (`maintenance` dist-tag). See D45.
17. **Importing `render` from `@react-email/render`**: React Email v6.0.0 (April 16, 2026) unified all imports into the `react-email` root package. While `@react-email/render` itself is NOT deprecated (still actively published as a v6 dependency), the recommended pattern is `import { render } from 'react-email'`. The actually deprecated package is `@react-email/components`. See D43.
18. **Pinning `typescript: ^6.0.3` in sub-packages**: PAD §5.1 mandates `^5.9.0` for `erasableSyntaxOnly` + `verbatimModuleSyntax` compatibility. See D44 + `pnpm_install_fix.md`.
19. **Using Zod v3 patterns**: Zod v4 has breaking changes — `z.string().url()` accepts any scheme (use `z.url({ protocol: /^https:$/ })`); `{ errorMap }` removed; `{ message }` deprecated; `z.ZodIssueCode` deprecated (use string literal `'custom'`).
20. **Using Stripe `currentPeriodEnd` (camelCase)**: Stripe SDK v22 uses snake_case API (`current_period_end`), and it moved to `items.data[0].current_period_end` in the Dahlia API (2026-06-24).
21. **Enabling `reactCompiler: true` without installing `babel-plugin-react-compiler`**: The package is NOT a built-in — it must be manually installed (`pnpm add -F @stillwater/web babel-plugin-react-compiler`). Without it, every page returns 500. See Gotcha 11.
22. **Passing t3-env schema as a separate variable to `createEnv()`**: TypeScript can't infer generics — pass schema inline. Also, `clientPrefix: 'NEXT_PUBLIC_'` is required. See Gotcha 12.
23. **Using Trigger.dev v3-style `machine: { preset: "micro" }`**: v4 promotes the string literal form (`machine: "micro"`) as the canonical/documented pattern. The object form `{ preset: "..." }` still type-accepts for backward compatibility but is no longer documented. Note: env vars in v4 are managed via the Trigger.dev dashboard/CLI (the `deploy.env` field still exists in the type but is no longer documented; there was never a `build.env` field). See Gotcha 13.
24. **Using `--filter=web` instead of `--filter=@stillwater/web`**: Turbo matches by package name, not directory. The package name is `@stillwater/web`.

---

## Communication & Documentation

### Documentation Standards

- **Explain "why", not just "what"**: Capture rationale in ADRs
- **Document assumptions and constraints**: In PR descriptions and ADRs
- **Keep PAD.md as canonical**: Architecture decisions go in `PAD.md` §23 (ADRs)
- **Update `MASTER_EXECUTION_PLAN.md`**: Mark phase complete with timestamp
- **Update `.env.example`**: Any new env var must be documented before merge

### Key Documents (read in priority order)

1. **`MASTER_EXECUTION_PLAN.md`** — what to build, in what order, with what tests
2. **`PAD.md`** — why each architectural decision was made (31 sections, 11 ADRs)
3. **`scaffolding_files.md`** — Phase 0 ready-to-paste configs (39 files)
4. **`design.md`** — three-path critique + merged optimal architecture
5. **`static_landing_page_html_mockup.md`** — landing page spec + complete HTML mockup
6. **This `CLAUDE.md`** — agent briefing for any Claude Code session

### ADRs (Architecture Decision Records)

11 ADRs total (all Accepted as of 2026-07-09 when ADR-010 was accepted):

| ADR    | Decision                                                | Status   |
|--------|---------------------------------------------------------|----------|
| ADR-001| Turborepo monorepo over independent repositories        | Accepted |
| ADR-002| tRPC v11 over REST API routes                           | Accepted |
| ADR-003| Drizzle ORM over Prisma                                 | Accepted |
| ADR-004| PostgreSQL advisory locks for booking concurrency       | Accepted |
| ADR-005| Sanity CMS for marketing content only                   | Accepted |
| ADR-006| Server-Sent Events over WebSockets for seat availability| Accepted |
| ADR-007| Trigger.dev v4 for background jobs over BullMQ          | Accepted |
| ADR-008| Better Auth v1.6.23 supersedes Auth.js v5               | Accepted |
| ADR-009| `proxy.ts` replaces `middleware.ts` (Next.js 16)        | Accepted |
| ADR-010| Resend Native Templates for Trigger.dev workers (protects CPU budgets from React Email v6 1.8MB bundle bloat) | Accepted |
| ADR-011| Source resolution via `transpilePackages` + `exports.default` → `./src/*.ts` (Turbopack ignores custom conditions) | Accepted |

See `react_email_suggestion.md` Alternative A for the ADR-010 rationale.

---

## Project-Specific Standards

### Architecture

- **Turborepo monorepo**: `apps/web` (Next.js), `apps/studio` (Sanity Studio — ✅ Phase 4 complete), `packages/*` (7 shared libs), `services/workers` (Trigger.dev), `tooling/*` (3 shared configs)
- **Package dependency graph** (PAD §6.3): `web → api + ui + auth + config`; `api → db + payments + config`; `auth → db + config`; `workers → db + email + config`
- **Workspace package resolution** (ADR-011): `exports.default` in all 7 `packages/*/package.json` points to `./src/*.ts` (source). `transpilePackages` in `next.config.ts` tells Turbopack to transpile them inline. The `@stillwater/source` custom condition is kept for tsc/vitest parity but is **redundant for Turbopack** (it ignores custom conditions — see Gotcha 34). No `dist/` directories needed; no `tsc --build` step required before `next build`.
- **3 route groups**: `(marketing)` public ISR, `(studio)` auth-gated SSR, `(admin)` RBAC-gated SSR

### API Design

- **tRPC v11 with 10 routers** (see Implementation Standards above)
- **4 procedure tiers**: `publicProcedure`, `protectedProcedure`, `staffProcedure`, `ownerProcedure`
- **Zod input on every procedure**: No exceptions
- **Discriminated union returns**: e.g., `BookingResult = { status: 'confirmed' } | { status: 'waitlisted'; position: number }`
- **Rate limiting**: Upstash Redis middleware on `bookings.book` (10/min) + auth mutations
- **No raw DB queries in components**: All data through tRPC server caller (RSC) or React Query (client)

### Database / Data Layer

- **PostgreSQL 17** on Neon (serverless, branching for preview envs)
- **18 tables** ✅ implemented (15 domain + 3 Better Auth): `users`, `members`, `instructors`, `class_styles`, `classes`, `rooms`, `class_sessions`, `enrollments`, `waitlist_entries`, `membership_plans`, `member_subscriptions`, `class_packages`, `payment_events`, `role_assignments`, `audit_log` (Phase 9) + `session`, `account`, `verification` (Better Auth) — see `packages/db/src/schema/`
- **8 enums** ✅ implemented in Phase 1: `class_level`, `session_status`, `enrollment_status`, `waitlist_status`, `subscription_status`, `billing_interval`, `studio_role`, `payment_status` — see `packages/db/src/schema/enums.ts`
- **5 critical indexes** ✅ implemented in Phase 1 (4 partial + 1 unique): `idx_sessions_starts_at_status`, `idx_enrollments_session_status`, `idx_waitlist_session_position`, `idx_subscriptions_member_status`, `idx_payment_events_stripe_id` — see `PAD.md` §7.3
- **3 additional indexes** (Phase 1): `idx_members_stripe_customer_id` (D6 webhook lookup), `idx_enrollments_session_member` (unique — double-booking prevention), `idx_role_assignments_member_role` (unique — duplicate grant prevention)
- **1 Phase 5 index**: `idx_waitlist_session_member` (unique — prevents duplicate waitlist entries for same session+member; migration `0002_lyrical_cargill.sql`)
- **15 FK constraints** with cascade rules: CASCADE (members→users, enrollments→sessions/members, waitlist→sessions/members, etc.), RESTRICT (class_sessions→instructors, member_subscriptions→membership_plans), SET NULL (class_sessions→rooms, payment_events→members)
- **Two DB URLs**: `DATABASE_URL` (pooled, app queries) + `DATABASE_URL_UNPOOLED` (migrations only — PgBouncer breaks prepared statements)
- **Drizzle ORM 0.45**: schema in TypeScript (`packages/db/src/schema/`); neon-http serverless driver; `db` client exported from `packages/db/src/index.ts` with `DrizzleDB` type
- **Migration**: `drizzle-kit generate` → migrations: `0000_dear_dagger.sql` (Phase 1), `0001_equal_iron_lad.sql` (Phase 4 — instructors.published), `0002_lyrical_cargill.sql` (Phase 5 — waitlist unique index), `0003_audit_log_phase9.sql` (Phase 9 — audit_log table + 3 indexes); apply via `pnpm db:migrate`
- **Seed**: `pnpm db:seed` loads 5 members, 3 instructors, 4 classes, 7 sessions, 3 membership plans — idempotent via `onConflictDoNothing`
- **Reset**: `pnpm db:reset` (LOCAL ONLY — refuses in production) drops schema, re-migrates, re-seeds
- **Read replica** for admin revenue reports (PAD §22.4 — Phase 9)
- **Migration rules**: Additive by default; deprecate columns before dropping; column renames = add new → backfill → migrate reads → drop old; every migration PR requires rollback script

### Environment Variables

Critical env vars (full list in `.env.example`):

| Variable                    | Purpose                                              | Example                          |
|-----------------------------|------------------------------------------------------|----------------------------------|
| `DATABASE_URL`              | Pooled PG connection (app queries)                   | `postgresql://...-pooler...`     |
| `DATABASE_URL_UNPOOLED`     | Direct PG connection (migrations ONLY)               | `postgresql://...direct...`      |
| `BETTER_AUTH_SECRET`        | Session cookie signing (min 32 chars)                | `openssl rand -base64 32`        |
| `BETTER_AUTH_URL`           | Auth callback base URL                               | `http://localhost:3000`          |
| `GOOGLE_CLIENT_ID`          | Google OAuth                                         | `...apps.googleusercontent.com`  |
| `GOOGLE_CLIENT_SECRET`      | Google OAuth secret                                  | `GOCSPX-...`                     |
| `STRIPE_SECRET_KEY`         | Stripe server key                                    | `sk_test_...` / `sk_live_...`    |
| `STRIPE_WEBHOOK_SECRET`     | Webhook signature verification                       | `whsec_...`                      |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client Stripe key                          | `pk_test_...`                    |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Sanity project ID                                | `abc123xy`                       |
| `SANITY_WEBHOOK_SECRET`     | Sanity webhook HMAC                                  | `whsec_...`                      |
| `RESEND_API_KEY`            | Email delivery                                       | `re_...`                         |
| `EMAIL_FROM`                | From address                                         | `hello@stillwater.studio`        |
| `TRIGGER_SECRET_KEY`        | Trigger.dev Cloud auth                               | `tr_dev_...`                     |
| `UPSTASH_REDIS_REST_URL`   | Rate limiting + idempotency                          | `https://...upstash.io`          |
| `UPSTASH_REDIS_REST_TOKEN` | Redis auth                                           | `AY...`                          |

All env vars validated via `t3-env` Zod schema in `packages/config/src/env.ts`. Server vs client prefix enforced (`NEXT_PUBLIC_*` for client).

### RBAC Permission Matrix

6 roles × 13 permissions (see `PAD.md` §9.4 for full table). Key rules:

- **Guest**: View schedule only
- **Member**: Book, cancel own, view own history
- **Instructor**: + View own schedule
- **Staff**: + Check in members, manage schedule, view all members
- **Manager**: + Revenue reports, manage memberships/pricing
- **Owner**: + Assign roles, studio settings

Enforced at two layers:
1. **Edge** (`proxy.ts`): Route-level redirect if role insufficient
2. **Procedure** (tRPC middleware): `staffProcedure` / `ownerProcedure` throw `FORBIDDEN` if role insufficient

---

## Gotchas & Troubleshooting (Phase 0 Lessons Learnt)

These are real issues encountered during Phase 0 implementation. Each has a verified root cause and fix.

### Gotcha 1: Trigger.dev v4 SDK import — use root `@trigger.dev/sdk`

**Symptom:** Using `@trigger.dev/sdk/v3` still works but is the deprecated v3-era pattern. Using `@trigger.dev/sdk/v4` fails — module not found.

**Root cause:** `@trigger.dev/sdk@4.5.0` (latest on npm, July 2026) exports both `.` (root) and `./v3` subpaths — both resolve to the identical file (`./dist/esm/v3/index.js`). However, official Trigger.dev v4 documentation mandates: "ALWAYS import from `@trigger.dev/sdk`. NEVER import from `@trigger.dev/sdk/v3`." The `/v3` subpath is the deprecated v3-era pattern. The `/v4` subpath does NOT exist (and is not needed — the root import IS the v4 path).

**Fix:** Use `import { defineConfig } from "@trigger.dev/sdk"` (root import, NOT `/v3`). This is the official Trigger.dev v4 pattern. The `services/workers/trigger.config.ts` file has been updated to use the root import. Validated July 2026 via web research (Qwen + DeepSeek) + codebase verification.

### Gotcha 2: ESLint v10 plugin incompatibility

**Symptom:** `pnpm lint` crashes with `context.getFilename is not a function` (eslint-plugin-react) or `SourceCode.getTokenOrCommentAfter is not a function` (eslint-plugin-import).

**Root cause:** ESLint v10 removed several APIs that `eslint-plugin-react@7.37.5` and `eslint-plugin-import@2.32.0` depend on. No v10-compatible versions of these plugins exist (they are the latest versions on npm). See MEP D45.

**Fix:** ESLint is pinned at `^9.39.4` (the `maintenance` dist-tag, actively receiving security/bug fixes) in 3 files: root `package.json`, `apps/web/package.json`, `tooling/eslint/package.json` (`@eslint/js: ^9.39.4`). Do NOT upgrade to ESLint v10 until both plugins release v10-compatible versions. Revisit in Q4 2026.

### Gotcha 3: React Email v6 paradigm shift

**Symptom:** `import { render } from '@react-email/render'` — package deprecated or missing.

**Root cause:** React Email v6.0.0 (released April 16, 2026) unified all component packages (`@react-email/components`, `@react-email/render`, `@react-email/button`, etc.) into a single `react-email` package. The v0.x sub-packages are deprecated. v6 bundle is 1.8MB (514KB gzipped) — pulls `prismjs`, `marked`, `tailwindcss` compiler at runtime, which threatens Trigger.dev 30s CPU budgets.

**Fix:** Import from `react-email` root: `import { render, Html, Button, Tailwind } from 'react-email'`. For Trigger.dev workers, use Resend Native Templates (`resend.emails.send({ to, subject, templateId, variables })`) per ADR-010 (Accepted 2026-07-09) to avoid the 1.8MB bundle bloat — see `react_email_suggestion.md` Alternative A.

### Gotcha 4: TypeScript 6.0.3 in sub-packages

**Symptom:** TypeScript 6.0.3 is "available" per pnpm, but PAD says stay on 5.9.0.

**Root cause:** TS 6.0.3 (October 2025) exists but PAD §5.1 + `pnpm_install_fix.md` explicitly mandate `^5.9.0` for compatibility with `erasableSyntaxOnly` (forbids `enum`, `namespace`, parameter properties — TS 5.8+) and `verbatimModuleSyntax` (requires `import type`). During initial package version bumping, 9 sub-package.json files were accidentally set to `^6.0.3`.

**Fix:** All 9 sub-packages reverted to `typescript: "^5.9.0"` (D44). The `pnpm install` output saying "6.0.3 is available" is expected — we intentionally ignore it.

### Gotcha 5: `pg_advisory_lock` vs `pg_advisory_xact_lock`

**Symptom:** Lock leaks under Neon PgBouncer connection pooling; pool exhaustion.

**Root cause:** `pg_advisory_lock()` is session-scoped — it releases when the database session ends. Under Neon's managed PgBouncer (transaction pooling, default), sessions are returned to the pool after each transaction, so session-scoped locks may not release on the same backend.

**Fix:** Always use `pg_advisory_xact_lock()` (transaction-scoped) — auto-releases at COMMIT/ROLLBACK. This applies to BOTH the booking flow AND the Stripe webhook idempotency handler. See PAD §7.4 + audit reports.

### Gotcha 6: `proxy.ts` — don't call `auth.api.getSession()` regardless of runtime

**Symptom:** `proxy.ts` works in dev but causes latency issues or caching bugs in production. If running on Edge runtime, may fail with "Edge runtime cannot access database".

**Root cause:** Next.js 16 `proxy.ts` can run on Edge or Node.js runtime (official documentation is inconsistent on the default — some docs say Edge, others say Node.js). Regardless of runtime, calling `auth.api.getSession()` (which does DB lookup + JWT verification) on every request is too expensive and breaks Next.js 16's caching model.

**Fix:** Use the 2-layer auth pattern (ADR-009): Layer 1 (`proxy.ts`) uses `getSessionCookie(request)` from `better-auth/cookies` — cookie-existence-only check, fast, NO DB. Layer 2 (Server Component layouts) calls `requireAuth()` / `requireRole(...roles)` for full validation + RBAC. This pattern works on both Edge and Node.js runtimes.

### Gotcha 7: `cacheComponents: true` + `force-dynamic` conflict

**Symptom:** Next.js 16 build error: `force-dynamic` is incompatible with `cacheComponents`.

**Root cause:** When `cacheComponents: true` is enabled in `next.config.ts` (SKILL.md §2.1 recommends this for Phase 4+), setting `export const dynamic = 'force-dynamic'` on any route handler causes a build error.

**Fix:** Don't set `force-dynamic` on SSE or streaming route handlers — they're dynamic by default (they read `req.url` or stream). See SKILL.md §13.8. Note: `cacheComponents` is NOT yet enabled in Phase 0 (deferred to pre-Phase 4).

### Gotcha 8: Vercel SSE timeout (300s default — Hobby and Pro)

**Symptom:** SSE endpoint silently terminates after 300 seconds on Vercel.

**Root cause:** Vercel serverless functions have a default timeout of 300 seconds (applies to both Hobby and Pro plans) that terminates long-running streams. As of June 2026, Vercel allows up to 30 minutes (1800s) on Pro/Enterprise, but this requires BOTH `maxDuration` AND enabling Fluid Compute in project settings.

**Fix:** Phase 5 F5-01 (`/api/schedule/stream/route.ts`) must set `export const maxDuration = 300` (5 min) AND the Vercel project must have Fluid Compute enabled. See PAD §13.2 + audit report A.

### Gotcha 9: shadcn/ui `style` field conflict

**Symptom:** Confusion about whether shadcn `components.json` should have `"style": "new-york"` or `"style": "default"`.

**Root cause:** SKILL.md §2.1 previously said `"new-york"` but §3.2 table said `"default"`. The actual `apps/web/components.json` file has `"style": "default"`.

**Fix:** Use `"style": "default"` (SKILL.md §2.1 has been corrected). The `new-york` style was a stale reference from an earlier draft.

### Gotcha 10: Stripe API version (Dahlia vs Acacia)

**Symptom:** Stripe SDK v22 expects `apiVersion: '2026-06-24.dahlia'` but code had `'2024-12-18.acacia'`.

**Root cause:** Stripe SDK v22.3.0 pins the "Dahlia" API (2026-06-24). The `current_period_end` field moved from the subscription object to `items.data[0].current_period_end`. SDK exposes snake_case (NOT camelCase).

**Fix:** SKILL.md §15.6 code example updated to `apiVersion: '2026-06-24.dahlia'`. Always use snake_case field names (`current_period_end`, not `currentPeriodEnd`).

### Gotcha 11: `reactCompiler: true` requires `babel-plugin-react-compiler` (Critical)

**Symptom:** Dev server boots ("Ready in 1099ms") but every page returns HTTP 500. Log shows: "Failed to resolve package babel-plugin-react-compiler while attempting to resolve React Compiler."

**Root cause:** `next.config.ts` has `reactCompiler: true`, which tells Next.js 16 to enable the React Compiler. However, `babel-plugin-react-compiler` is NOT a built-in — it must be manually installed as a devDependency. Without it, Next.js cannot initialize the React Compiler Babel plugin, causing every page render to fail.

**Fix:** Install the package: `pnpm add -F @stillwater/web babel-plugin-react-compiler`. The package is now in `apps/web/package.json` devDependencies as `^1.0.0`.

### Gotcha 12: t3-env `createEnv()` requires `clientPrefix` + inline schema (High)

**Symptom:** `pnpm check-types` fails with TS2345: "Type ... is not assignable to parameter of type 'EnvOptions'... Property 'clientPrefix' is missing."

**Root cause:** t3-env v0.13.11's `createEnv()` requires a `clientPrefix` property (e.g., `'NEXT_PUBLIC_'`). Additionally, TypeScript cannot infer the generic types when the schema is passed as a separate variable — the schema must be passed inline to `createEnv()`.

**Fix:** `packages/config/src/env.ts` was restructured: schemas extracted as `serverSchema` and `clientSchema` consts (for the build-context fallback), then passed inline to `createEnv({ clientPrefix: 'NEXT_PUBLIC_', server: serverSchema, client: clientSchema, runtimeEnv: {...} })`.

### Gotcha 13: Trigger.dev v4 type changes — `machine` string canonical, env vars via dashboard/CLI (High)

**Symptom:** `pnpm check-types` fails with TS2353 ("'env' does not exist in type") and TS2322 ("Type '{ preset: string; }' is not assignable to type 'micro' | 'small-1x' | ...").

**Root cause:** Trigger.dev v4 SDK promotes the string literal form (`machine: "micro"`) as the canonical/documented `machine` configuration. The object form (`{ preset: "..." }`) still type-accepts for backward compatibility but is no longer documented. For environment variables, v4 promotes the dashboard/CLI as the primary management method (the `deploy.env` field still exists in the type definition but is no longer documented; there was never a `build.env` field in v3 or v4).

**Fix:** `services/workers/trigger.config.ts` uses `machine: "micro"` (string literal). Environment variables are configured via the Trigger.dev dashboard or `trigger.dev env set` CLI, not in `trigger.config.ts`.

### Gotcha 14: Drizzle 0.45 column API — `.isUnique` not `.unique` (Phase 1)

**Symptom:** Schema unit tests fail with `expect(emailColumn.unique).toBe(true)` — `unique` is `undefined`.

**Root cause:** Drizzle 0.45 stores uniqueness on the column config object, not as a direct `.unique` property. The accessible property is `.isUnique` (boolean). The unique constraint name is in `.uniqueName`. Similarly, foreign keys are stored at the table level (accessible via `getTableConfig` in the generated migration SQL), not on the column — `.foreignKey` is `undefined` on columns.

**Fix:** In schema tests, assert `.isUnique` (not `.unique`). For FK cascade behavior, verify via the generated migration SQL (`drizzle-kit generate` output contains `ON DELETE cascade`/`restrict`/`set null`). See `packages/db/src/schema/*.test.ts` for the established pattern.

### Gotcha 15: Drizzle partial index `.where()` requires SQL template, not object (Phase 1)

**Symptom:** `pnpm check-types` fails with TS2353: `'status' does not exist in type 'SQL<unknown>'` on `.where({ status: 'scheduled' })`.

**Root cause:** Drizzle 0.45's index builder `.where()` method expects a `SQL` object (from the `sql` tagged template), not a plain JavaScript object. The object syntax was never valid but TypeScript only caught it at the index definition site.

**Fix:** Import `sql` from `drizzle-orm` and use template syntax:
```typescript
import { sql } from 'drizzle-orm';
// ✅ CORRECT
index('idx_sessions_starts_at_status')
  .on(table.startsAt, table.status)
  .where(sql`${table.status} = 'scheduled'`)
```
See `packages/db/src/schema/sessions.ts`, `enrollments.ts`, `waitlist.ts`, `memberships.ts` for the 4 partial indexes that use this pattern.

### Gotcha 16: `neon()` validates connection string format — db client needs try/catch (Phase 1)

**Symptom:** `import { db } from '@stillwater/db'` throws in test context: "Database connection string format for `neon()` should be: postgresql://user:password@host.tld/dbname".

**Root cause:** The `neon()` function from `@neondatabase/serverless` validates the connection string format at call time. In test/build contexts, `env.DATABASE_URL` returns a placeholder (`postgresql://placeholder@localhost:5432/placeholder`) which fails validation. Per SKILL §3.4, infrastructure clients must use `process.env` directly (not the Zod `env` module) to avoid throwing.

**Fix:** `packages/db/src/index.ts` wraps `neon()` in a try/catch with a no-op fallback that throws a clear error only when a query is actually executed:
```typescript
const connectionString = process.env['DATABASE_URL'] ?? 'postgresql://placeholder@localhost:5432/placeholder';
let sql: ReturnType<typeof neon>;
try {
  sql = neon(connectionString);
} catch {
  sql = (() => { throw new Error('Database not configured. Set DATABASE_URL.') }) as unknown as ReturnType<typeof neon>;
}
export const db = drizzle(sql, { schema });
```
This allows module import in any context; actual queries fail with a clear message if DATABASE_URL isn't set.

### Gotcha 17: `packages/db/tsconfig.json` must exclude test files from tsc (Phase 1)

**Symptom:** `pnpm check-types` fails with TS7053 errors in `*.test.ts` files: "Element implicitly has an 'any' type because expression of type 'string' can't be used to index type 'PgTable<...>'".

**Root cause:** `packages/db/tsconfig.json` had its own `exclude` array that overrode the `library.json` base config's test-file exclusions. The base config excludes `**/*.test.ts` etc., but the db package's `exclude: ["node_modules", "dist", ".turbo"]` replaced it, causing tsc to type-check test files. Test files use dynamic indexing (`members[col]`) which strict mode rejects.

**Fix:** `packages/db/tsconfig.json` `exclude` array now includes all test file patterns:
```json
"exclude": ["node_modules", "dist", ".turbo", "src/**/*.test.ts", "src/**/*.test.tsx", "src/**/*.spec.ts", "src/**/*.spec.tsx", "src/**/*.integration.test.ts"]
```
Test files are run by vitest (which uses esbuild, not tsc), so they don't need tsc type-checking.

### Gotcha 18: Integration tests must use `skipIf` guard for environments without Docker (Phase 1)

**Symptom:** `pnpm test` fails in CI or environments without Docker because the seed integration test tries to connect to a non-existent Postgres.

**Root cause:** The seed integration test (`packages/db/src/seed/index.integration.test.ts`) requires a live PostgreSQL database. In environments without Docker (or where `DATABASE_URL` is a placeholder), the test cannot run.

**Fix:** Two-layer guard:
1. **File naming**: `.integration.test.ts` suffix — excluded from default `pnpm test` by `packages/db/vitest.config.ts` `exclude` array
2. **Runtime guard**: `describe.skipIf(!process.env['DATABASE_URL'] || process.env['DATABASE_URL'].includes('placeholder'))(...)` skips the suite if DATABASE_URL is unset or a placeholder

Run integration tests explicitly via `pnpm test:integration` (requires `docker compose up -d` first).

### Gotcha 19: Better Auth `magicLink` is a plugin, NOT a social provider (Phase 2)

**Symptom:** `authClient.signIn.magicLink` is `undefined` — TypeScript error TS2339.

**Root cause:** Better Auth's Magic Link is at `better-auth/plugins/magic-link` (a plugin), not at `better-auth/providers` (where Google lives). The client-side `authClient` must also register the `magicLinkClient` plugin from `better-auth/client/plugins` — otherwise `signIn.magicLink` doesn't exist on the client object.

**Fix:**
```typescript
// Server-side (packages/auth/src/config.ts)
import { magicLink } from 'better-auth/plugins/magic-link';
export const auth = betterAuth({
  plugins: [magicLink({ sendMagicLink: async ({ email, url }) => { /* ... */ } })],
});

// Client-side (packages/auth/src/client.ts)
import { magicLinkClient } from 'better-auth/client/plugins';
export const authClient = createAuthClient({
  plugins: [magicLinkClient()],  // ← REQUIRED for signIn.magicLink on client
});
```

### Gotcha 20: Better Auth `customSession` plugin for session enrichment (Phase 2)

**Symptom:** `session.user.memberId` and `session.user.roles` are `undefined` — the MEP F2-01 `session.sessionData` callback API doesn't exist in Better Auth v1.6.23.

**Root cause:** The MEP F2-01 interface referenced a `session.sessionData` callback that was from an earlier Better Auth API. In v1.6.23, session enrichment is done via the `customSession` plugin from `better-auth/plugins/custom-session`.

**Fix:** Use `customSession` plugin instead of `session.sessionData`:
```typescript
import { customSession } from 'better-auth/plugins/custom-session';
export const auth = betterAuth({
  plugins: [
    customSession(async (sessionData) => {
      const member = await db.query.members.findFirst({
        where: (m, { eq }) => eq(m.userId, sessionData.user.id),
      });
      return { ...sessionData, user: { ...sessionData.user, memberId: member?.id ?? null, roles: [...] } };
    }),
  ],
});
```

### Gotcha 21: `users.emailVerified` must be boolean for Better Auth (Phase 2)

**Symptom:** Better Auth throws type errors or behaves unexpectedly when `emailVerified` is a timestamp.

**Root cause:** Better Auth v1.6.23 expects `emailVerified` as a `boolean` (default `false`), NOT a `timestamp`. Phase 1 created the column as `timestamp('email_verified', { mode: 'date' })` per PAD §7.2. This is a known divergence — PAD §7.2 specified timestamp, but Better Auth requires boolean.

**Fix:** Phase 2 Cycle 0 changed `users.emailVerified` from `timestamp` to `boolean('email_verified').default(false).notNull()`. This change was originally authored in migration `0001_supreme_sabretooth.sql` (Phase 2 era), but that migration was **deleted and consolidated** into a single clean `0000_dear_dagger.sql` during the Phase 1–2 remediation (PAD v1.8.0). The current `0000_dear_dagger.sql` creates `emailVerified` as `boolean` directly from scratch — no `ALTER COLUMN` needed. Also requires updating seed fixtures: `emailVerified: new Date()` → `emailVerified: true`.

### Gotcha 22: `drizzleAdapter` schema mapping for plural table names (Phase 2)

**Symptom:** Better Auth can't find the `user` table — it looks for `user` (singular) but our table is `users` (plural).

**Root cause:** Better Auth's default schema uses singular table names (`user`, `session`, `account`, `verification`). Phase 1 created `users` (plural) per PAD §7.2. The `drizzleAdapter` needs explicit `schema` config to map Better Auth's defaults to our table names.

**Fix:** Configure `drizzleAdapter` with `schema` mapping:
```typescript
drizzleAdapter(db, {
  provider: 'pg',
  schema: {
    user: { modelName: 'users' },
    session: { modelName: 'session' },
    account: { modelName: 'account' },
    verification: { modelName: 'verification' },
  },
}),
```

### Gotcha 23: `'guest'` role is NOT in the `studio_role` DB enum (Phase 2)

**Symptom:** TypeScript error: `Type '"guest"' is not assignable to type '"member" | "instructor" | "staff" | "manager" | "owner"'`.

**Root cause:** The `studio_role` PostgreSQL enum (PAD §7.2) has 5 values: `member`, `instructor`, `staff`, `manager`, `owner`. The `guest` role (unauthenticated users) is NOT stored in the database — it only exists in the PAD §9.2 permission matrix. The `StudioRole` type derived from `studioRoleEnum.enumValues` doesn't include `'guest'`.

**Fix:** In `packages/auth/src/rbac.ts`, define a separate `Role` type that extends `StudioRole` with `'guest'`:
```typescript
export type Role = StudioRole | 'guest';
```
The `can()` function accepts `Role[]` (not `StudioRole[]`) so it can check permissions for unauthenticated users: `can(['guest'], 'schedule:view')` returns `true`.

### Gotcha 24: `import 'server-only'` throws in vitest — must mock (Phase 2)

**Symptom:** `pnpm test` fails with "This module cannot be imported from a Client Component module" when testing `apps/web/src/lib/auth.ts`.

**Root cause:** The `server-only` package throws when imported outside a Next.js Server Component context. Vitest runs in Node.js (not Next.js server context), so the import fails.

**Fix:** Mock `server-only` at the top of the test file:
```typescript
vi.mock('server-only', () => ({}));
```
This must come BEFORE the import of the module under test. The mock returns an empty module, allowing the test to proceed. The actual `server-only` guard works correctly in production (Next.js Server Component context).

### Gotcha 25: tRPC middleware must use `t.middleware()` factory — not raw function (Phase 3)

**Symptom:** `No result from middlewares - did you forget to return next()` when using custom rate-limit middleware.

**Root cause:** The rateLimit middleware was written as a plain function `({ ctx, next }) => { ... }` instead of using tRPC's `t.middleware()` factory. tRPC v11's middleware pipeline requires the middleware to be created via the factory so it properly chains `next({ ctx })` — raw functions don't integrate with the procedure builder's type system.

**Fix:** Import `middleware` from `trpc.ts` and use the factory:
```typescript
import { middleware } from '../trpc';
export function rateLimit(opts) {
  return middleware(async ({ ctx, next }) => {
    // ... rate limit check
    return next({ ctx });  // ← MUST pass ctx to next()
  });
}
```

### Gotcha 26: Zod v4 `z.string().uuid()` is strict — test UUIDs must use valid v4 format (Phase 3)

**Symptom:** Zod validation fails on test UUIDs like `11111111-1111-1111-1111-111111111111` with `invalid_format` error.

**Root cause:** Zod v4 enforces RFC 4122 v4 UUID format strictly — the variant digit (first character of the 4th group) must be `8`, `9`, `a`, or `b`. The UUID `11111111-1111-1111-1111-111111111111` has variant `1` which is invalid. The nil UUID (`00000000-0000-0000-0000-000000000000`) is also rejected.

**Fix:** Use valid v4 UUIDs in test fixtures: `11111111-1111-4111-8111-111111111111` (version `4`, variant `8`).

### Gotcha 27: Drizzle relational query types infer as `never` without `defineRelations()` (Phase 3)

**Symptom:** TypeScript error `Property 'maxCapacity' does not exist on type 'never'` when accessing `session.class?.maxCapacity` after `findFirst({ with: { class: true } })`.

**Root cause:** Drizzle ORM v0.45's relational query API v1 (`db.query.*`) uses `with` for eager loading, but TypeScript can't infer the nested relation types unless `defineRelations()` (v2 API, requires ≥1.0.0-beta) is called. In v0.45, the `with` clause types default to `never` for nested relations.

**Fix:** Cast the result to access nested fields:
```typescript
const sessionData = session as {
  overrideCapacity: number | null;
  class: { maxCapacity: number | null } | null;
  room: { capacity: number | null } | null;
};
```
When upgrading to Drizzle ORM 1.0+, call `defineRelations()` to get proper type inference without casts.

### Gotcha 28: Drizzle mock chains must include `.where()` between `.set()` and `.returning()` (Phase 3)

**Symptom:** `ctx.db.update(...).set(...).where is not a function` in tests.

**Root cause:** The mock chain for Drizzle's update builder was `update().set({ returning })` — missing the `.where()` step. The actual Drizzle API calls `update().set().where().returning()`, so the mock must mirror the full chain.

**Fix:** Add `.where()` to the mock:
```typescript
const returning = vi.fn().mockResolvedValue([updated]);
const where = vi.fn().mockReturnValue({ returning });
const set = vi.fn().mockReturnValue({ where });
const update = vi.fn().mockReturnValue({ set });
```

### Gotcha 29: `exactOptionalPropertyTypes` — optional `onError` needs spread-conditional (Phase 3)

**Symptom:** `TS2379: Type 'undefined' is not assignable to type 'HTTPErrorHandler'` on `fetchRequestHandler({ onError: undefined })`.

**Root cause:** TypeScript's `exactOptionalPropertyTypes: true` (enabled in Stillwater's tsconfig) forbids explicitly passing `undefined` to optional properties. The tRPC `fetchRequestHandler`'s `onError` is optional, but conditionally setting it to `undefined` triggers the error.

**Fix:** Use a spread-conditional instead of ternary with `undefined`:
```typescript
fetchRequestHandler({
  endpoint: '/api/trpc',
  req,
  router: appRouter,
  createContext,
  ...(process.env.NODE_ENV === 'development'
    ? { onError: ({ path, error }) => { console.error(...); } }
    : {}),
});
```

### Gotcha 30: Migration `ALTER COLUMN ... SET DATA TYPE` fails silently on incompatible types (Phase 1–2 remediation)

**Symptom:** `pnpm db:migrate` exits with code 1 after "Using 'pg' driver for database querying" with **no error message**. drizzle-kit swallows the PostgreSQL error.

**Root cause:** The deleted migration `0001_supreme_sabretooth.sql` (Phase 2 era, later consolidated into `0000_dear_dagger.sql` during v1.8.0 remediation) contained `ALTER TABLE "users" ALTER COLUMN "email_verified" SET DATA TYPE boolean;`. PostgreSQL **cannot automatically cast** `timestamp` → `boolean` without a `USING` clause (e.g., `USING (email_verified IS NOT NULL)`). Without it, PG throws:
```
ERROR: column "email_verified" cannot be cast automatically to type boolean
```
But drizzle-kit 0.31.10 **swallows this error** — it exits with code 1 without printing the PostgreSQL error message. This is a drizzle-kit bug (poor error reporting), but the root cause is the migration SQL itself.

**Fix:** For fresh databases (no production data), delete both old migrations and regenerate a single consolidated migration from the current schema. The current schema already has `emailVerified` as `boolean`, so the new migration creates it correctly from scratch — no `ALTER COLUMN` needed. Run `rm drizzle/migrations/*.sql`, then `pnpm db:generate`. For databases with data, add a `USING` clause manually.

### Gotcha 31: Database driver must switch between `pg` (local) and `neon-http` (Neon) (Phase 1–2 remediation)

**Symptom:** `pnpm db:seed` fails with `NeonDbError: Error connecting to database: TypeError: fetch failed`.

**Root cause:** `packages/db/src/index.ts` unconditionally used `drizzle-orm/neon-http`, which makes HTTP requests to a Neon endpoint. Local Docker Postgres speaks TCP, not HTTP — the `neon` driver cannot connect to it.

**Fix:** `packages/db/src/index.ts` now dynamically selects the driver: URLs containing `neon.tech` use `neon-http`; all others use `node-postgres` with `pg.Pool`. The `pg.iconpackage` is in `dependencies` (not devDependencies) so it's available at runtime for local development. No consumer code changes needed — the `db` export is transparent. 

**Verification:** `pnpm db:migrate` prints "Using 'pg' driver for database querying" (drizzle-kit logs the driver), then applies the migration successfully.

### Gotcha 32: Seed script must load `.env.local` before importing `db` (Phase 1–2 remediation)

**Symptom:** Seed script fails with `SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string` — the `pg` Pool is initialized with a fallback connection string (no password) because `DATABASE_URL` wasn't set yet.

**Root cause:** The seed script imports `db` from `../index`, which reads `process.env['DATABASE_URL']` at import time. But `.env.local` isn't loaded by default when running via `tsx` — the env var is `undefined`, and the Pool is created with a fallback URL that has no password.

**Fix:** `packages/db/src/seed/env.ts` loads `.env.local` via `dotenv` when `DATABASE_URL` is not set. It's imported at the top of `seed/index.ts` — before the `db` import — so the env is available by the time the `db` client is instantiated. 

### Gotcha 33: Zod v4 enforces strict UUID v4 variant (Phase 3)

**Sym_ibt:** Seed fixtures with UUIDs like `00000000-0000-4000-g000-000000000001` fail Zod v4 validation: `invalid_format`.

**Root cause:** Zod v4 v4 enforces the RFC 4122 variant nibble (first character of the 4th group) must be `8`, `9`, `a`, or `b`. The `g` variant in test fixtures is invalid. This affects `packages/db/src/seed/fixtures/membership-plans.ts`.

**Fix:** Use valid v4 variant in test fixtures: `00000000-0000-4000-a000-000000000001` (variant `a`).

### Gotcha 34: Turbopack ignores custom `exports` conditions (Critical — Phase 4 build fix)

**Symptom:** `pnpm build` fails with `Module not found: Can't resolve '@stillwater/auth'` (or `@stillwater/api`, `@stillwater/db`, etc.), even though `pnpm test` and `pnpm check-types` work fine.

**Root cause:** Turbopack's Rust resolver only matches standard Node.js conditions (`default`, `import`, `require`, `browser`, `types`). It ignores custom-named conditions like `@stillwater/source`. When resolving `@stillwater/*` packages, Turbopack skips `@stillwater/source` (→ `./src/index.ts`) and falls through to `default` (→ `./dist/index.js`) — a file that doesn't exist because `tooling/typescript/library.json` sets `emitDeclarationOnly: true`.

**Fix:** Two-part fix (ADR-011):
1. Point `exports.default` to `./src/*.ts` (source) in all 7 `packages/*/package.json` files.
2. Add `transpilePackages: ['@stillwater/auth', '@stillwater/api', ...]` to `apps/web/next.config.ts`.

The `@stillwater/source` condition is kept for tsc/vitest parity but is redundant for Turbopack. No `dist/` directories needed; no `tsc --build` step required.

### Gotcha 35: shadcn v4 + `exactOptionalPropertyTypes` — `checked` prop (High — Phase 4)

**Symptom:** `pnpm check-types` fails: `Type 'CheckedState | undefined' is not assignable to type 'CheckedState'` in `dropdown-menu.tsx`.

**Root cause:** shadcn v4's `DropdownMenuCheckboxItem` destructures `checked` from props (which is optional → `CheckedState | undefined`), then passes it to `DropdownMenuPrimitive.CheckboxItem` which expects `checked: CheckedState` (not undefined). With `exactOptionalPropertyTypes: true`, passing `checked={undefined}` is not allowed.

**Fix:** Use spread-conditional to only pass `checked` when defined:
```tsx
{...(checked !== undefined ? { checked } : {})}
```

### Gotcha 36: `eslint-plugin-tailwindcss` v4.0.6 — `src/style.css` bug (Medium — Phase 4)

**Symptom:** `pnpm lint` crashes: `Error: ENOENT: no such file or directory, open '.../apps/web/src/style.css'`.

**Root cause:** `eslint-plugin-tailwindcss@4.0.6` has a bug where it defaults to `src/style.css` regardless of the `cssFiles` setting in ESLint config. The actual CSS file is `src/app/globals.css`.

**Fix:** Disable the affected rules in `tooling/eslint/index.js`:
```js
rules: {
  "tailwindcss/classnames-order": "off",
  "tailwindcss/no-contradicting-classname": "off",
}
```
Tailwind v4 class validation is handled at build time by the compiler.

### Gotcha 37: `@vitest-environment jsdom` for React component tests (Medium — Phase 4)

**Symptom:** `pnpm test` fails: `ReferenceError: document is not defined` when using `@testing-library/react`'s `render()`.

**Root cause:** `apps/web/vitest.config.ts` sets `environment: 'node'` (for server-side tests). React component tests using `@testing-library/react` need a DOM environment.

**Fix:** Add `// @vitest-environment jsdom` as the FIRST line of `.tsx` test files that use `render()`:
```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
```
This overrides the global `node` env per-file without slowing down non-component tests.

### Gotcha 38: Drizzle 0.45 relational query types infer as `never` (Medium — Phase 4)

**Symptom:** TypeScript errors like `Property 'name' does not exist on type 'never'` when accessing nested relations from `db.query.classSessions.findMany({ with: { class: true, instructor: true } })`.

**Root cause:** Drizzle 0.45's relational query API v1 (`db.query.*`) infers nested `with` types as `never` without `defineRelations()` (which requires Drizzle ≥1.0.0-beta).

**Fix:** Cast the result to the expected shape:
```typescript
type ScheduleSession = {
  id: string;
  startsAt: Date;
  class: { name: string };
  instructor: { slug: string };
};
const typedSessions = sessions as unknown as ScheduleSession[];
```
This is a known limitation documented in SKILL §9.9 Gotcha 27. Will be fixed when upgrading to Drizzle 1.0+.

### Gotcha 39: Sanity slug is an object with `.current` property (Low — Phase 4)

**Symptom:** GROQ query `slug == $slug` returns no results, even though the slug exists.

**Root cause:** In Sanity, the `slug` field is an object `{ _type: 'slug', current: 'the-slug' }`, not a plain string. GROQ queries must use `slug.current == $slug`.

**Fix:** Use `slug.current` in GROQ queries:
```groq
*[_type == "blogPost" && published == true && slug.current == $slug][0]
```
Zod schema: `z.object({ current: z.string().min(1) })`.

### Gotcha 40: Zod v4 `z.string().email()` deprecated (Low — Phase 4)

**Symptom:** ESLint warning: `email` is deprecated. Use `z.email()` instead.

**Root cause:** Zod v4 introduced `z.email()` as a top-level method, deprecating `z.string().email()`.

**Fix:** Replace `z.string().email()` with `z.email()`:
```typescript
// Before
contactEmail: z.string().email().optional(),
// After
contactEmail: z.email().optional(),
```

### Gotcha 41: ESLint `import/order` — `crypto` before `vitest` (Low — Phase 4)

**Symptom:** ESLint error: `crypto import should occur before import of vitest`.

**Root cause:** The `import/order` rule sorts imports by group (builtin → external → internal). `crypto` is a Node.js builtin; `vitest` is an external package. Builtins must come first.

**Fix:** Move `import { createHmac } from 'crypto'` above `import { describe, ... } from 'vitest'`, with an empty line between groups:
```typescript
import { createHmac } from 'crypto';

import { describe, it, expect } from 'vitest';
```

### Gotcha 42: SSE route must NOT set `force-dynamic` (Critical — Phase 5)

**Symptom:** `pnpm build` fails on the SSE route with: `Error: Route "/api/schedule/stream" used "export const dynamic = 'force-dynamic'" which is not allowed when "cacheComponents" is enabled.`

**Root cause:** SSE/streaming routes are dynamic by default (they read `req.url` or stream). Setting `force-dynamic` is redundant and conflicts with `cacheComponents: true` (which is deferred but may be enabled in future phases). Per SKILL §9.1 Gotcha 7.

**Fix:** Do NOT add `export const dynamic = 'force-dynamic'` to the SSE route. Only set `export const maxDuration = 300`.

### Gotcha 43: `useSessionAvailability` hook cleanup is non-negotiable (High — Phase 5)

**Symptom:** Memory leaks — EventSource connections accumulate, reconnection timers fire after unmount.

**Root cause:** The SSE hook creates an `EventSource` and sets up reconnection timers. If the component unmounts without closing the EventSource and clearing timers, the browser keeps the connection open and timers keep firing.

**Fix:** Always clean up in `useEffect` return:
```typescript
useEffect(() => {
  isCancelledRef.current = false;
  connect();
  return () => {
    isCancelledRef.current = true;
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (eventSourceRef.current) eventSourceRef.current.close();
  };
}, [sessionId, connect]);
```

### Gotcha 44: `bookings.book` throws CONFLICT — UI must catch and show WaitlistButton (High — Phase 5)

**Symptom:** Booking a full session returns CONFLICT error; user sees a generic error instead of a "Join Waitlist" option.

**Root cause:** The `bookings.book` mutation throws `TRPCError({ code: 'CONFLICT' })` when the session is full. It does NOT auto-waitlist. The UI must catch CONFLICT and call `waitlist.join` separately.

**Fix:** In `useBookingMutation` hook:
```typescript
onError: (error) => {
  if (error.data?.code === 'CONFLICT') {
    setIsConflict(true);
    toast.error('Session is full. Join the waitlist?');
  }
}
```
Then in `BookingFlow`, show `<WaitlistButton>` when `isConflict` is true.

### Gotcha 45: `waitlist_entries` needs unique index on (sessionId, memberId) (High — Phase 5)

**Symptom:** Concurrent `waitlist.join` calls for the same member + session both insert rows, creating duplicate waitlist entries.

**Root cause:** Unlike `enrollments` (which has `idx_enrollments_session_member` unique index), `waitlist_entries` originally had no unique constraint. The `waitlist.join` procedure uses an app-layer `findFirst` check — under concurrent load, both calls pass the check and both insert.

**Fix:** Add `uniqueIndex('idx_waitlist_session_member').on(table.sessionId, table.memberId)` to the waitlist schema. Migration `0002_lyrical_cargill.sql`.

### Gotcha 46: `@testing-library/react` cleanup between test files (Medium — Phase 5)

**Symptom:** Tests fail with "Found multiple elements with role 'button'" — DOM from a previous test file is leaking into the next.

**Root cause:** `vitest` with `pool: 'forks'` doesn't auto-clean the jsdom DOM between test files in the same process. `@testing-library/react` auto-cleans within a test file but NOT across files.

**Fix:** Add `afterEach(() => cleanup())` to every `.tsx` test file that uses `render()`:
```tsx
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

describe('Component', () => {
  afterEach(() => cleanup());
  // ...
});
```

### Gotcha 47: Radix Dialog `onOpenChange` void expression (Low — Phase 5)

**Symptom:** ESLint error: `Returning a void expression from an arrow function shorthand is forbidden` on `<Dialog onOpenChange={(isOpen) => !isOpen && onClose()}>`.

**Root cause:** `onClose()` returns `void`. The arrow function shorthand `(x) => expr && voidFn()` returns `void`, which violates `@typescript-eslint/no-confusing-void-expression`.

**Fix:** Use a block body with `if`:
```tsx
<Dialog onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
```

### Gotcha 48: `event.data` in `MessageEvent` is typed as `any` (Low — Phase 5)

**Symptom:** ESLint error: `Unsafe argument of type 'any' assigned to a parameter of type 'string'` when calling `JSON.parse(event.data)`.

**Root cause:** The DOM's `MessageEvent.data` property is typed as `any` (it can be a string, object, or ArrayBuffer). `JSON.parse()` expects `string`, so passing `any` triggers `no-unsafe-argument`.

**Fix:** Cast via `String()`:
```typescript
const rawData: unknown = JSON.parse(String(event.data));
```

### Gotcha 49: Template literal expressions with `number` type (Low — Phase 5)

**Symptom:** ESLint error: `Invalid type "number" of template literal expression` on `` `${enrolled} of ${capacity}` ``.

**Root cause:** `@typescript-eslint/restrict-template-expressions` forbids `number` in template literals because `Number.prototype.toString()` can produce unexpected results for `NaN`, `Infinity`, and very large numbers.

**Fix:** Explicitly cast with `String()`:
```typescript
aria-label={`${String(enrolled)} of ${String(capacity)} spots taken`}
```

### Gotcha 50: `/dashboard` redirect ghost — 7 files redirect to non-existent route (Critical — Phase 6)

**Symptom:** After authentication, users are redirected to `/dashboard` but hit a 404. Seven source files redirect to `/dashboard` (post-login callback, sign-in default, `requireRole` fallback, MagicLinkForm, SignInForm, admin layout, auth test).

**Root cause:** Phase 5 created the `(studio)` route group with `requireAuth()` but no `/dashboard` page existed. Every authenticated redirect landed on a 404.

**Fix:** Create `(studio)/dashboard/page.tsx` — Phase 6 resolved this. If you add new auth-gated redirects, always verify the target route exists.

### Gotcha 51: `react-hook-form` empty strings vs undefined in tRPC mutations (High — Phase 6)

**Symptom:** `ProfileEditForm` submits successfully but empty form fields are saved as empty strings instead of being left unchanged.

**Root cause:** `react-hook-form` returns empty strings `''` for empty inputs. `members.updateProfile` filters `undefined` (via `Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined))`) but NOT empty strings. So `''` passes through and overwrites the existing value.

**Fix:** Strip empty strings → `undefined` before passing to the mutation:
```typescript
const patch = Object.fromEntries(
  Object.entries(data)
    .filter(([, v]) => v !== '' && v !== undefined)
    .map(([k, v]) => [k, v === '' ? undefined : v]),
);
```

### Gotcha 52: Disabled buttons with toast for Phase 7 stubs (Medium — Phase 6)

**Symptom:** Clicking pause/cancel/resume on the membership management panel throws `PRECONDITION_FAILED` and shows an error toast.

**Root cause:** `memberships.pause`, `cancel`, and `resume` are stubs that throw `PRECONDITION_FAILED` until Phase 7 (Stripe integration).

**Fix:** Use `disabled` buttons with `onClick` that shows an informational toast:
```tsx
<button disabled onClick={() => toast.info('Coming Phase 7')}>
  Pause Membership (Coming Phase 7)
</button>
```
Do NOT call the mutation — the disabled state prevents the click, and the toast explains why.

### Gotcha 53: CSV `no-base-to-string` — `String(unknown)` triggers ESLint (Low — Phase 6)

**Symptom:** ESLint error: `'value' will use Object's default stringification format ('[object Object]') when stringified` on `String(value)` in the CSV utility.

**Root cause:** `@typescript-eslint/no-base-to-string` flags `String(unknown)` because `unknown` could be an object, and `Object.prototype.toString()` returns `'[object Object]'`.

**Fix:** Narrow with `typeof` checks before calling `String()`:
```typescript
if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
  str = String(value);
} else {
  str = JSON.stringify(value);
}
```

### Gotcha 54: Dashboard components eslint override for Drizzle casts (Medium — Phase 6)

**Symptom:** ESLint errors: `Unnecessary condition` and `Invalid type "number" of template literal expression` in dashboard components that receive Drizzle relational query results.

**Root cause:** Dashboard pages cast Drizzle `with` results to expected shapes (`as unknown as SubscriptionWithPlan`). After the cast, TypeScript knows the types are non-null, so `??` is "unnecessary". Template literals with `number` trigger `restrict-template-expressions`.

**Fix:** Add eslint override in `apps/web/eslint.config.mjs`:
```js
{
  files: ['src/components/dashboard/**/*.tsx'],
  rules: {
    '@typescript-eslint/no-unnecessary-condition': 'off',
    '@typescript-eslint/restrict-template-expressions': 'off',
  },
}
```

### Gotcha 55: `memberships.getMySubscription` plan join — Drizzle `never` types (Medium — Phase 6)

**Symptom:** TypeScript errors like `Property 'name' does not exist on type 'never'` when accessing `subscription.plan.name` in the dashboard.

**Root cause:** `memberships.getMySubscription` was enhanced with `with: { plan: true }` in Phase 6. Drizzle 0.45's relational query API infers nested `with` types as `never` without `defineRelations()` (same as SKILL §9.9 Gotcha 27 / Lesson 46).

**Fix:** Cast the subscription to the expected shape in the dashboard page:
```typescript
type SubscriptionWithPlan = {
  id: string; status: string; currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean; creditsRemaining: number | null;
  plan: { name: string; interval: string; classCreditsPerCycle: number | null } | null;
};
const typedSubscription = subscription as unknown as SubscriptionWithPlan | null;
```

### Gotcha 56: Parallel data fetching with `Promise.all` — avoid waterfall (Medium — Phase 6)

**Symptom:** Dashboard page loads slowly because profile, subscription, and history are fetched sequentially.

**Root cause:** Each `await caller.X()` blocks the next. Three sequential queries = 3x latency.

**Fix:** Use `Promise.all` for parallel fetching:
```typescript
const [profile, subscription, history] = await Promise.all([
  caller.members.getProfile(),
  caller.memberships.getMySubscription(),
  caller.members.getHistory(),
]);
```
This runs all three queries concurrently — total latency ≈ max(individual) instead of sum.

### Gotcha 57: `ProfileEditForm` with `react-hook-form` + `zodResolver` (Low — Phase 6)

**Symptom:** Form validation doesn't work, or mutation is called with invalid data.

**Root cause:** `react-hook-form` requires `zodResolver` from `@hookform/resolvers/zod` to connect Zod schema validation to the form lifecycle. Without it, `handleSubmit` doesn't validate.

**Fix:** Always pass `resolver: zodResolver(schema)` to `useForm`:
```typescript
const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
  resolver: zodResolver(profileSchema),
  defaultValues: initialValues,
});
```

### Gotcha 58: Stripe SDK v22 `current_period_end` moved to `items.data[0]` (Critical — Phase 7)

**Symptom:** Accessing `subscription.current_period_end` returns `undefined` or triggers a deprecation warning.

**Root cause:** Stripe's Basil API (2025-03-31) **removed** the top-level `subscription.current_period_start` and `subscription.current_period_end` fields in a single step (per the Basil changelog: "removes subscription-level periods"), adding subscription item-level billing periods instead. In the Dahlia API (2026-06-24, SDK v22+), these fields are accessed at `subscription.items.data[0].current_period_end`. The SDK exposes snake_case throughout to match the API wire format.

**Fix:** Access period dates via the items array:
```typescript
// WRONG (removed in Basil 2025-03-31, not available in Dahlia):
const periodEnd = subscription.current_period_end;

// CORRECT (Dahlia):
const periodEnd = subscription.items.data[0].current_period_end;
```
The webhook handler (`packages/payments/src/webhooks.ts`) uses this pattern in `handleSubscriptionCreated` + `handleSubscriptionUpdated`.

### Gotcha 59: `pg_advisory_xact_lock` key must be a bigint, not a string (Critical — Phase 7)

**Symptom:** `SELECT pg_advisory_xact_lock(...)` silently fails or throws a type error at runtime.

**Root cause:** PostgreSQL's `pg_advisory_xact_lock(bigint)` expects a 64-bit integer argument. Passing a string or number causes a type mismatch. Additionally, BigInt literals (`5381n`) require ES2020 target — the web app's tsconfig targets below ES2020, causing `error TS2737: BigInt literals are not available when targeting lower than ES2020`.

**Fix:** Use `BigInt()` constructor (not literals) and ensure the value fits in 32 bits for the single-argument variant:
```typescript
// WRONG (BigInt literal — fails on ES2019 targets):
let hash = 5381n;

// CORRECT (BigInt constructor — works on all targets):
let hash = BigInt(5381);
const mask = BigInt(0xffffffff);
```
See `packages/payments/src/webhooks.ts` `eventIdToLockKey()` for the full pattern.

### Gotcha 60: Stripe webhook body must be read as TEXT, not JSON (Critical — Phase 7)

**Symptom:** `stripe.webhooks.constructEvent()` throws `SignatureVerificationError` even though the signature is correct.

**Root cause:** Stripe's signature verification computes HMAC over the **raw request body**. If you use `await request.json()` first, the body is parsed and re-serialized, changing the byte representation. The signature no longer matches.

**Fix:** Read the body as text and pass the raw string to `constructEvent`:
```typescript
// WRONG:
const body = await request.json();
const event = stripe.webhooks.constructEvent(JSON.stringify(body), sig, secret);

// CORRECT:
const body = await request.text();
const event = stripe.webhooks.constructEvent(body, sig, secret);
```
See `apps/web/src/app/api/webhooks/stripe/route.ts` for the full implementation.

### Gotcha 61: Drizzle relational query `with: { plan: true }` infers as `never` without `defineRelations()` (Medium — Phase 7)

**Symptom:** Accessing `sub.plan.classCreditsPerCycle` in the `invoice.paid` webhook handler triggers `Property 'classCreditsPerCycle' does not exist on type 'never'`.

**Root cause:** Drizzle 0.45's relational query API (v1, `db.query.*`) infers nested `with` types as `never` without `defineRelations()` (v2, requires ≥1.0.0-beta). This is the same issue documented in SKILL Lesson 46 / Gotcha 38, but it resurfaced in the Phase 7 webhook handler when joining `memberSubscriptions` with `plan`.

**Fix:** Cast the query result to the expected shape:
```typescript
const sub = (await tx.query.memberSubscriptions.findFirst({
  where: eq(memberSubscriptions.stripeSubscriptionId, invoice.subscription),
  with: { plan: true },
})) as { planId: string; plan?: { classCreditsPerCycle: number | null } | null } | undefined;
```
See `packages/payments/src/webhooks.ts` `handleInvoicePaid()` for the full pattern.

### Gotcha 62: `exactOptionalPropertyTypes` requires conditional spread for optional params (Medium — Phase 7)

**Symptom:** `tsc --noEmit` fails with `TS2379: Argument of type '{ limit: number | undefined; }' is not assignable to parameter of type '{ limit?: number; }' with 'exactOptionalPropertyTypes: true'.

**Root cause:** With `exactOptionalPropertyTypes: true` in `tsconfig.json`, passing `{ limit: undefined }` is NOT the same as omitting the property. `input?.limit` is `number | undefined`, but the target type expects `limit?: number` (property absent or `number`, never `undefined`).

**Fix:** Use conditional spread to include the property only when it's defined:
```typescript
// WRONG:
listInvoices({ customerId, limit: input?.limit });

// CORRECT:
listInvoices({
  customerId,
  ...(input?.limit !== undefined ? { limit: input.limit } : {}),
});
```
See `packages/api/src/routers/payments.ts` `getInvoices` procedure for the full pattern.

### Gotcha 63: Workers tsconfig `verbatimModuleSyntax` conflicts with `@stillwater/db` CommonJS (Critical — Phase 8)

**Symptom:** `TS1295: ECMAScript imports and exports cannot be written in a CommonJS file under 'verbatimModuleSyntax'` when importing from @stillwater/db in workers

**Root cause:** Workers tsconfig uses `moduleResolution: NodeNext` (required by @trigger.dev/sdk v4) but @stillwater/db package.json doesn't have `"type": "module"`. The `verbatimModuleSyntax: true` from base config conflicts.

**Fix:** Set `verbatimModuleSyntax: false` in `services/workers/tsconfig.json`. Also exclude test files from tsc: `"exclude": ["node_modules", "dist", ".turbo", "src/**/*.test.ts"]`

### Gotcha 64: Drizzle relational query `with` types infer as `never` in workers (Medium — Phase 8)

**Symptom:** `Property 'instructor' does not exist on type 'never'` in worker task files

**Root cause:** Same as Lesson 69 (Phase 7) — Drizzle 0.45's relational query API needs `defineRelations()`. Workers can't import schema tables directly (NodeNext issue), so the callback `where` syntax also fails type checking.

**Fix:** Cast `(db.query.enrollments as any).findFirst({...})` and cast result to typed interface

### Gotcha 65: Trigger.dev SDK v4 uses `tasks.trigger()` not `TriggerClient.sendEvent()` (Critical — Phase 8)

**Symptom:** `Property 'sendEvent' does not exist on type 'TriggerClient'` or `Property 'id' does not exist in type 'TriggerClientConfig'`

**Root cause:** Trigger.dev SDK v4 API changed from v3. `TriggerClient` constructor takes `TriggerClientConfig` (which extends `ApiClientConfiguration`, not a custom `id` field). Triggering is done via `tasks.trigger(taskId, payload)` imported from `@trigger.dev/sdk`, not `client.sendEvent()`.

**Fix:** Use `import { tasks } from '@trigger.dev/sdk'` then `tasks.trigger(task, payload)`. Don't instantiate `TriggerClient` directly for triggering.

### Gotcha 66: Turbopack resolves dynamic `import()` with string concatenation (Critical — Phase 8)

**Symptom:** `Module not found: Can't resolve '@trigger.dev/sdk'` during `pnpm build` even with dynamic `import()`

**Root cause:** Turbopack (Next.js 16's bundler) statically analyzes `import()` calls. Even `const m = '@trigger.dev/' + 'sdk'; await import(m)` gets resolved at build time. If the module isn't a dependency of the package doing the import, the build fails.

**Fix:** Add `@trigger.dev/sdk` as a real dependency of the package that needs it (`@stillwater/config` in this case). The stub fallback (checking `TRIGGER_SECRET_KEY`) prevents runtime usage in test/build envs.

### Gotcha 67: Post-commit job triggers must use post-transaction pattern (Medium — Phase 8)

**Symptom:** Job triggered inside a transaction that later rolls back → job processes non-existent data

**Root cause:** Calling `jobs.trigger()` inside `db.transaction(async (tx) => {...})` fires immediately. If the transaction rolls back, the job runs against data that was never committed.

**Fix:** Collect post-commit actions in an array during the transaction, then execute them after `db.transaction()` returns successfully:
```typescript
const postCommitActions: Array<() => Promise<void>> = [];
await db.transaction(async (tx) => {
  // ... handler pushes to postCommitActions
});
// Only runs if transaction committed
for (const action of postCommitActions) {
  action().catch(() => {});
}
```

### Gotcha 68: `cmdk` not installed — command component requires manual install (High — Phase 9)

**Symptom:** `Module not found: Can't resolve 'cmdk'` when using the `Command` shadcn component for combobox selectors (class/instructor/room selectors in admin forms).

**Root cause:** The `command.tsx` shadcn component imports from `cmdk`, but `cmdk` is NOT a built-in dependency. It must be manually installed.

**Fix:** `pnpm add cmdk` (or `pnpm --filter @stillwater/web add cmdk`). The package is already listed in `apps/web/package.json` at `^1.0.4`.

### Gotcha 69: `bookings.checkIn` takes `sessionId + memberId`, NOT `enrollmentId` (Critical — Phase 9)

**Symptom:** `TRPCError: BAD_REQUEST` or `NOT_FOUND` when calling `bookings.checkIn` from the RosterTable.

**Root cause:** The `bookings.checkIn` procedure input schema is `{ sessionId: uuid, memberId: uuid }` — NOT `{ enrollmentId: uuid }`. The RosterTable initially called `handleCheckIn(entry.id)` (enrollment ID) but must call `handleCheckIn(entry.member.id)` (member ID).

**Fix:** Pass `sessionId` (from the page prop) + `memberId` (from `entry.member.id`):
```typescript
checkInMutation.mutate({ sessionId, memberId: entry.member.id });
```

### Gotcha 70: `schedule.getWeek` requires `weekStart` date input (Medium — Phase 9)

**Symptom:** `TRPCError: BAD_REQUEST` when calling `schedule.getWeek({})` from the admin dashboard.

**Root cause:** The `getWeek` procedure input schema requires `{ weekStart: z.coerce.date() }`. An empty object `{}` fails Zod validation.

**Fix:** Pass a `weekStart` date:
```typescript
const weekStart = new Date();
weekStart.setHours(0, 0, 0, 0); // midnight today
const sessions = await caller.schedule.getWeek({ weekStart });
```

### Gotcha 71: Admin audit logging must be fire-and-forget (Medium — Phase 9)

**Symptom:** Admin mutation fails or delays because the audit log insert throws or blocks.

**Root cause:** Audit logging should NEVER block the actual mutation. If the `audit_log` insert fails (e.g., DB constraint violation, connection issue), the mutation should still succeed.

**Fix:** The `logAdminAction()` helper in `lib/admin/audit-log.ts` wraps the insert in try/catch and logs errors to `console.error` only. It does NOT throw. For inline audit logging in tRPC procedures (e.g., `admin.assignRole`), use `.catch(() => {})` on the insert promise:
```typescript
await ctx.db.insert(auditLog).values({...}).catch(() => {
  // Audit logging should never block the mutation
});
```

### Gotcha 72: Drizzle `ilike` + `or` for admin search queries (Medium — Phase 9)

**Symptom:** TypeScript error: `Cannot find name 'ilike'` or `'or'` when building admin search queries.

**Root cause:** `ilike` and `or` are Drizzle ORM operators that must be imported from `drizzle-orm`.

**Fix:** Import `ilike` and `or` from `drizzle-orm`:
```typescript
import { eq, and, gte, lte, sql, ilike, or, desc } from 'drizzle-orm';
// Search across multiple columns:
or(
  ilike(classes.title, `%${search}%`),
  ilike(classes.slug, `%${search}%`),
)
```

### Gotcha 73: `ownerProcedure` tier for role assignment (Critical — Phase 9)

**Symptom:** `TRPCError: FORBIDDEN` when a non-owner admin tries to assign roles.

**Root cause:** Role assignment (`admin.assignRole` / `admin.removeRole`) uses `ownerProcedure` (Tier 4 — highest privilege), NOT `staffProcedure` (Tier 3). Only the `owner` role can assign/remove roles per PAD §9.2 RBAC matrix.

**Fix:** Use `ownerProcedure` for role management procedures. The `MemberRoleEditor` component is only rendered when `session.user.roles.includes('owner')` (checked in the member detail page).

### Gotcha 74: `SignOutButton` uses form POST for CSRF safety (Medium — Phase 9)

**Symptom:** Sign-out works but a security audit flags potential CSRF vulnerability.

**Root cause:** Sign-out via `fetch()` or `<a>` link is vulnerable to CSRF (an attacker can craft a form/image that triggers sign-out). The `/auth/sign-out` route rejects GET requests (returns 405) — only POST is allowed.

**Fix:** `SignOutButton` uses `<form action="/auth/sign-out" method="POST">` — a native form POST that the browser handles directly. No fetch/XHR needed. The POST-only route prevents CSRF via image tags or links.

### Gotcha 75: AdminShell sidebar link visibility uses role hierarchy (Medium — Phase 9)

**Symptom:** Staff user sees "Revenue" or "Settings" links in the admin sidebar (should be hidden).

**Root cause:** The `AdminShell` component uses a `ROLE_LEVEL` map to determine link visibility: `{ member: 0, instructor: 0, staff: 1, manager: 2, owner: 3 }`. Each nav item has a `minRole` — the link is only shown if any of the user's roles has a level ≥ the item's min level.

**Fix:** The `canSeeLink()` function checks:
```typescript
function canSeeLink(userRoles: StudioRole[], minRole: StudioRole): boolean {
  const minLevel = ROLE_LEVEL[minRole];
  return userRoles.some((role) => ROLE_LEVEL[role] >= minLevel);
}
```
Revenue link: `minRole: 'manager'` (visible to manager + owner only). Settings link: `minRole: 'owner'` (visible to owner only).

### Gotcha 76: Recharts bundle size — use `next/dynamic` for admin charts (Medium — Phase 9)

**Symptom:** Admin route bundle exceeds 400kb budget because Recharts (~200kb) is imported at the top level.

**Root cause:** Recharts is a large library. Importing it statically in a Server Component adds it to the route bundle.

**Fix:** Use `next/dynamic` to lazy-load chart components:
```typescript
import dynamic from 'next/dynamic';
const RevenueChart = dynamic(() => import('@/components/admin/RevenueChart').then(m => m.RevenueChart), { ssr: false });
```
Note: The current implementation imports RevenueChart directly (it's a Client Component already). For Phase 10, consider dynamic import if bundle size becomes an issue.

### Gotcha 77: `@dnd-kit/core` drag-to-reschedule deferred to Phase 10 (Medium — Phase 9)

**Symptom:** Dragging a session in the ScheduleCalendar shows an info toast but does NOT update the session time.

**Root cause:** The ScheduleCalendar has `@dnd-kit/core` DnD wired, but actual session time updates require a `sessions.update` procedure that doesn't exist yet. The current `sessions` router only has `create` + `cancel` — no `update`.

**Fix:** The `handleDragEnd` handler shows an info toast: `"Drag-to-reschedule requires sessions.update procedure (Phase 10)"`. Phase 10 will add `sessions.update` and wire the DnD handler to call it.

### Gotcha 78: Revenue chart monthly breakdown needs GROUP BY query (Low — Phase 9)

**Symptom:** The RevenueChart shows a single data point ("Total") instead of a 12-month line chart.

**Root cause:** The current `admin.getRevenueDetails` returns a single total for the period. A monthly breakdown requires a `GROUP BY` query on `payment_events.createdAt` truncated to month.

**Fix:** Phase 10 enhancement — add a `GROUP BY date_trunc('month', created_at)` query to return `Array<{ month: string; mrr: number }>` for the chart. The current chart renders with a single-point placeholder.

### Gotcha 79: `react-day-picker` v10 API — `IconLeft`/`IconRight` components (Low — Phase 9)

**Symptom:** Calendar component renders without navigation arrows, or TypeScript error on `components` prop.

**Root cause:** `react-day-picker` v10 changed the API for custom icons. Instead of passing icon components as props, you pass them via the `components` option:
```typescript
components={{
  IconLeft: () => <ChevronLeft className="h-4 w-4" />,
  IconRight: () => <ChevronRight className="h-4 w-4" />,
}}
```

**Fix:** The `calendar.tsx` component already uses the v10 `components` API. If upgrading react-day-picker, verify the icon API hasn't changed again.

### Gotcha 80: `audit_log.metadata` is jsonb nullable — use `null`, not `undefined` (Low — Phase 9)

**Symptom:** TypeScript error: `Type 'undefined' is not assignable to type '...'` when inserting into `audit_log` without metadata.

**Root cause:** The `metadata` column is defined as `jsonb('metadata')` (nullable). In Drizzle, nullable columns accept `null` but NOT `undefined` (with `exactOptionalPropertyTypes: true`).

**Fix:** Pass `null` explicitly when there's no metadata:
```typescript
await db.insert(auditLog).values({
  staffMemberId,
  action,
  entityType,
  entityId,
  metadata: metadata ?? null, // NOT undefined
});
```

### Gotcha 81: `paymentEvents.amountCents` does not exist — amount is in `payload` jsonb (Critical — Phase 10 fix)

**Symptom:** `pnpm check-types` fails with `TS2339: Property 'amountCents' does not exist on type 'PgTableWithColumns<...>'` in `packages/api/src/routers/admin.ts`.

**Root cause:** The `payment_events` table has NO `amountCents` column. The table schema is: `id`, `memberId`, `stripeEventId`, `type`, `payload` (jsonb), `status`, `processedAt`, `createdAt`. The Stripe payment amount is stored inside the `payload` jsonb field (the raw Stripe event payload), NOT as a top-level column. The `admin.getRevenueDetails` procedure tried to `SUM(paymentEvents.amountCents)` which doesn't exist.

**Fix:** Extract the amount from the jsonb payload using PostgreSQL's `->>` operator:
```typescript
// WRONG (column doesn't exist):
totalCents: sql<number>`coalesce(sum(${paymentEvents.amountCents}), 0)::int`,

// CORRECT (extract from payload jsonb):
totalCents: sql<number>`coalesce(sum((${paymentEvents.payload}->>'amount_received')::bigint), 0)::int`,
```
The `amount_received` field is a standard Stripe invoice/payment intent property in the event payload.

### Gotcha 82: Workers ESLint `projectService` + typed rules need test files (High — Phase 10 fix)

**Symptom:** `pnpm lint` fails with `Parsing error: *.test.ts was not found by the project service` for all worker test files + `vitest.config.ts`.

**Root cause:** Workers `tsconfig.json` excludes `src/**/*.test.ts` (correct for tsc). `projectService: true` can't find them. **Setting `projectService: false` strips type info and crashes the shared config's typed rules** (`await-thenable`, `no-floating-promises`, `no-misused-promises`, `require-await` — they need type info).

**Fix (4 components in `services/workers/eslint.config.mjs` + 1 new file):**
1. **`allowDefaultProject` + `defaultProject`** pointing at a real `tsconfig.eslint.json` (extends `tsconfig.json`, re-includes test files). Globs can't contain `**`; matched against `path.relative(tsconfigRootDir, absolutePath)` (package-relative `src/*.test.ts`). Set `maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING` ≥ file count (default 8, workers 12).
```javascript
projectService: {
  allowDefaultProject: ['src/*.test.ts', 'vitest.config.ts'],
  defaultProject: './tsconfig.eslint.json',
  maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 20,
},
```
2. **Test-file typed-rule exceptions** — vitest mocks return `any`, triggering `no-unsafe-assignment`/`no-unsafe-argument`:
```javascript
{ files: ['src/**/*.test.ts'], rules: { '@typescript-eslint/no-unsafe-assignment': 'off', '@typescript-eslint/no-unsafe-argument': 'off' } }
```
3. **`services/workers/tsconfig.eslint.json`** (NEW): `{ "extends": "./tsconfig.json", "include": ["src/**/*.ts", "vitest.config.ts"], "exclude": ["node_modules", "dist", ".turbo"] }`
4. **`vitest.config.ts` import order** — `import { resolve } from 'node:path';` before `import { defineConfig } from 'vitest/config';` (builtin before external).

See `stillwater_SKILL.md` §15.24.2, `AGENTS.md` Gotcha 75.

### Gotcha 83: Workers `db.query.X as any` casts trigger 70+ ESLint errors (High — Phase 10 fix)

**Symptom:** `pnpm lint` fails with ~70 errors: `no-explicit-any`, `no-unsafe-call`, `no-unsafe-member-access`, `no-unsafe-return` across all 9 worker source files.

**Root cause:** Workers use `db.query.enrollments as any` casts per Gotcha 64 / Lesson 71 — Drizzle 0.45 relational query types infer as `never` in NodeNext without `defineRelations()`. The per-line `eslint-disable-next-line` comments only covered the FIRST line of the cast, but the `any` type propagated to subsequent lines (chained `.findFirst()` calls, callback parameters, return values).

**Fix:** Added a scoped ESLint override for `src/**/*.ts` in `services/workers/eslint.config.mjs` that disables the 4 affected rules. Removed all 10 per-line `eslint-disable-next-line` comments from the 9 worker files (they're now redundant). These rules will be re-enabled when upgrading to Drizzle 1.0+ with `defineRelations()`.
```javascript
{
  files: ['src/**/*.ts'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
  },
},
```

### Gotcha 84: `async` methods without `await` trigger `require-await` + `restrict-template-expressions` on numbers (Medium — Phase 10 fix)

**Symptom:** `pnpm lint` fails with `@typescript-eslint/require-await` on `attendance-summary.ts` and `membership-credit-grant.ts`, and `@typescript-eslint/restrict-template-expressions` on `class-reminder-1h.ts`.

**Root cause:**
1. Two worker tasks have `async run()` methods that don't use `await` (v1 no-op stubs that just return success).
2. `class-reminder-1h.ts` uses a `number` variable in a template literal: `` `in ${diffMin} minutes` `` — ESLint forbids this because `Number.prototype.toString()` can produce unexpected results for `NaN`, `Infinity`.

**Fix:**
1. For Trigger.dev no-op `run()` stubs, return `Promise.resolve({...})` **without** `async`. Removing `async` alone breaks `task()`'s `Promise<unknown>` return type (`TS2769: No overload matches this call`). `Promise.resolve(...)` satisfies the type AND avoids `require-await`.
2. Wrap with `String()`: `` `in ${String(diffMin)} minutes` ``.

### Gotcha 85: `server-only` package throws in Vitest tests (Critical — Phase 10 fix)

**Symptom:** `logger.test.ts` fails with: `Error: This module cannot be imported from a Client Component module. It should only be used from a Server Component.`

**Root cause:** `apps/web/src/lib/auth.ts` and `apps/web/src/lib/observability/logger.ts` both have `import 'server-only'` at the top. The `server-only` package (by Meta/React) throws when imported outside of React Server Components. Vitest runs in a Node context that the package considers "client-side," so it throws.

**Fix:** Two approaches (both needed):
1. Add `vi.mock('server-only', () => ({}))` to `test/setup.ts` (global mock for all tests).
2. Add a `server-only` alias in `apps/web/vitest.config.ts` pointing to an empty stub file (`test/empty-server-only.ts` with `export {};`). This is more reliable than `vi.mock` for side-effect-only imports.

See `test/empty-server-only.ts` and the `resolve.alias` entry in `apps/web/vitest.config.ts`.

### Gotcha 86: `@testing-library/jest-dom` not registered — `toBeInTheDocument` fails (Critical — Phase 10 fix)

**Symptom:** `KpiCard.test.tsx` (7 tests) fails with: `Invalid Chai property: toBeInTheDocument`.

**Root cause:** The test file uses `// @vitest-environment jsdom` magic comment (correct for DOM tests), but `toBeInTheDocument()` is a `@testing-library/jest-dom` matcher that is NOT registered. Four issues:
1. `@testing-library/jest-dom` was NOT installed (not in `apps/web/package.json` devDeps).
2. `test/setup.ts` did not import `@testing-library/jest-dom/vitest`.
3. `apps/web/vitest.config.ts` had no `setupFiles` array — the shared setup file was never loaded.
4. `tsc --noEmit` also reported TS2339 because the type augmentation wasn't registered.

**Fix:**
1. Install: `pnpm add -D -F @stillwater/web @testing-library/jest-dom` (also install at root for shared setup resolution).
2. Add `import '@testing-library/jest-dom/vitest';` to `test/setup.ts`.
3. Add `setupFiles: [resolve(__dirname, '../../test/setup.ts')]` to `apps/web/vitest.config.ts`.
4. Add `src/vitest-setup.d.ts` with `/// <reference types="@testing-library/jest-dom/vitest" />` for `tsc` type augmentation.

### Gotcha 87: `react-day-picker` v10 API — `IconLeft`/`IconRight` removed (High — Phase 10 fix)

**Symptom:** `calendar.tsx` fails TS2353: `'IconLeft' does not exist in type 'Partial<CustomComponents>'` and `'caption' does not exist in type 'Partial<ClassNames>'`.

**Root cause:** `apps/web/package.json` installs `react-day-picker: ^10.0.1`, but `calendar.tsx` used the v8 API (`components.IconLeft`, `components.IconRight`, `classNames.caption`, `classNames.nav_button_previous`). v9/v10 removed `IconLeft`/`IconRight` in favor of a single `Chevron` component with an `orientation` prop. Several `classNames` keys were also renamed.

**Fix:** Rewrite `calendar.tsx` to the v10 API:
- Replace `IconLeft`/`IconRight` with `Chevron: ({ orientation }) => orientation === 'left' ? <ChevronLeft/> : <ChevronRight/>`
- Update `classNames` keys: `caption` → `month_caption`, `nav_button_previous` → `button_previous`, `nav_button_next` → `button_next`, `head_row` → `weekdays`, `head_cell` → `weekday`, `row` → `week`, `month_grid` replaces `table`

See `apps/web/src/components/ui/calendar.tsx` for the full v10 implementation.

### Gotcha 88: PostHog `capture_pageviews` (plural) is not a valid `PostHogConfig` key (Medium — Phase 10 fix)

**Symptom:** `posthog.ts` fails TS2561: `'capture_pageviews' does not exist in type 'Partial<PostHogConfig>'. Did you mean 'capture_pageview'?`

**Root cause:** The code used `capture_pageviews: true` (plural). PostHog's official config type uses `capture_pageview` (singular, Boolean|String, default `true`). The plural form may be accepted as a runtime alias in some older PostHog versions but is NOT in the typed config interface.

**Fix:** Change `capture_pageviews: true` → `capture_pageview: true` in both `posthog.ts` (line 20) and `posthog.test.ts` (line 71, which asserts the config). Verified via PostHog official docs: https://posthog.com/docs/libraries/js/config

### Gotcha 89: `zodResolver` generic mismatch with `z.coerce.number()` + `.default()` (Medium — Phase 10 fix)

**Symptom:** `SessionForm.tsx` and `ClassForm.tsx` fail TS2322: `Type 'Resolver<{...durationMinutes: unknown...}>' is not assignable to type 'Resolver<{...durationMinutes: number...}>'`.

**Root cause:** `@hookform/resolvers` v5 has stricter generic inference. When a Zod schema uses `z.coerce.number().default(60)`, the **input** type has `durationMinutes?: unknown` (coerced from string) but the **output** type has `durationMinutes: number`. `z.infer<typeof schema>` returns the output type, but `zodResolver` infers the input type for the resolver generic. This creates a mismatch: `Resolver<InputType>` can't be assigned to `Resolver<OutputType>`.

**Fix:** Cast the resolver: `resolver: zodResolver(sessionSchema) as Resolver<SessionFormValues>`. Import `Resolver` type from `react-hook-form`. This is a known limitation of `@hookform/resolvers` v5 with coercing schemas — the cast is safe because the form values type (`z.infer`) represents what the form produces after validation.

---

## Troubleshooting Quick Reference

| Issue | First Check | Fix |
|---|---|---|
| `pnpm install` fails with `ERR_PNPM_NO_MATCHING_VERSION` for `@opentelemetry/core@2.9.0` | `pnpm-workspace.yaml` `overrides` block | OTEL overrides pin `@opentelemetry/core: 2.8.0` (Sentry 10.63.0 demands 2.9.0 which isn't propagated). See `pnpm_install_fix.md`. |
| `pnpm install` warns `ERR_PNPM_IGNORED_BUILDS` | `pnpm-workspace.yaml` `allowBuilds` block | `allowBuilds` map allows `@sentry/cli`, `esbuild`, `sharp`, `core-js` postinstall scripts. |
| `[WARN] The "pnpm" field in package.json is no longer read` | Root `package.json` has orphaned `pnpm` block | Delete the `pnpm.overrides` + `pnpm.onlyBuiltDependencies` block — moved to `pnpm-workspace.yaml` in pnpm v11. |
| `missing peer eslint` warning | ESLint not hoisted to root | `pnpm add -Dw eslint` installs eslint at workspace root (satisfies shared plugin peer deps). |
| `TS18003: No inputs were found` in `packages/db` | `packages/db/src/` doesn't exist yet | ✅ FIXED in Phase 1 — `packages/db/src/schema/*.ts` now exists with 14 table definitions. If you see this error, run `pnpm install` to ensure workspace symlinks are created. |
| `TS7053: Element implicitly has an 'any' type` in `packages/db/src/schema/*.test.ts` | `packages/db/tsconfig.json` `exclude` array missing test file patterns | Add `src/**/*.test.ts` + `src/**/*.integration.test.ts` to the `exclude` array. See Gotcha 17. Test files are run by vitest, not tsc. |
| Drizzle partial index `.where({ status: '...' })` fails TS2353 | `.where()` expects `SQL` object, not plain object | Use `sql\`\${table.status} = 'scheduled'\` template syntax. Import `sql` from `drizzle-orm`. See Gotcha 15. |
| `import { db } from '@stillwater/db'` throws in test context | `neon()` validates connection string format | The db client uses try/catch fallback. Ensure `DATABASE_URL` env var is set for integration tests, or use the `skipIf` guard. See Gotcha 16. |
| `pnpm test` fails with "No test files found" in `packages/db` | Vitest can't find test files | Ensure `packages/db/vitest.config.ts` exists and `pnpm install` has run. Phase 1 added 15 test files. |
| Schema test asserts `.unique` but gets `undefined` | Drizzle 0.45 API: uniqueness is `.isUnique`, not `.unique` | Use `.isUnique` in test assertions. FK cascade behavior is verified via migration SQL, not column properties. See Gotcha 14. |
| `authClient.signIn.magicLink` is `undefined` (TS2339) | magicLink client plugin not registered | Import `magicLinkClient` from `better-auth/client/plugins` and add to `createAuthClient({ plugins: [magicLinkClient()] })`. See Gotcha 19. |
| `session.user.memberId` / `roles` are `undefined` | MEP F2-01 `session.sessionData` API doesn't exist in v1.6.23 | Use `customSession` plugin from `better-auth/plugins/custom-session` instead. See Gotcha 20. |
| Better Auth can't find `user` table | drizzleAdapter not configured with `schema` mapping | Add `schema: { user: { modelName: 'users' } }` to `drizzleAdapter` config. See Gotcha 22. |
| `Type '"guest"' is not assignable to StudioRole` | `guest` not in `studio_role` DB enum | Use `Role` type (`StudioRole \| 'guest'`) from `rbac.ts` for permission checks. See Gotcha 23. |
| `server-only` throws "cannot be imported from Client Component" in tests | `server-only` package throws outside Next.js server context | Mock at top of test: `vi.mock('server-only', () => ({}))`. See Gotcha 24. |
| `z.string().email()` lint error: `email` is deprecated | Zod v4 deprecated `z.string().email()` | Use `z.email('message')` instead (Zod v4 native). |
| `No result from middlewares - did you forget next()` (Phase 3) | Rate-limit middleware is a raw function, not tRPC middleware | Use `t.middleware()` factory from `trpc.ts`; call `next({ ctx })`. See Gotcha 25. |
| Zod `invalid_format` on test UUIDs (Phase 3) | UUIDs like `11111111-1111-1111-1111-111111111111` are invalid v4 | Use valid v4: `11111111-1111-4111-8111-111111111111` (variant digit 8/9/a/b). See Gotcha 26. |
| `Property 'maxCapacity' does not exist on type 'never'` (Phase 3) | Drizzle relational query types need `defineRelations()` | Cast result to access nested `with` fields. See Gotcha 27. |
| `ctx.db.update(...).set(...).where is not a function` (Phase 3) | Mock chain missing `.where()` step | Add `where` between `set` and `returning` in mock. See Gotcha 28. |
| `TS2379: Type 'undefined' not assignable to HTTPErrorHandler` (Phase 3) | `exactOptionalPropertyTypes` forbids `onError: undefined` | Use spread-conditional `...(cond ? { onError: fn } : {})`. See Gotcha 29. |
| `Cannot find module '@stillwater/db'` | `.npmrc` missing `custom-conditions=@stillwater/source` | D15 fix — both `.npmrc` AND `pnpm-workspace.yaml` must declare the custom condition. |
| `pnpm lint` crashes on `proxy.ts` with `getFilename is not a function` | ESLint v10 installed (should be v9) | Downgrade: `pnpm add -Dw eslint@^9.39.4` + `pnpm add -D -F @stillwater/eslint-config @eslint/js@^9.39.4`. See D45. |
| `react-email` templates import from `@react-email/components` | React Email v6 unified all imports | Change to `import { Html, Button } from 'react-email'`. See D43. |
| Stripe webhook `400 Invalid signature` | `STRIPE_WEBHOOK_SECRET` mismatch | Use `stripe listen --forward-to localhost:3000/api/webhooks/stripe` for local testing; verify secret matches Stripe CLI output. |
| Better Auth Google OAuth `redirect_uri_mismatch` | Preview URL not in Google Console | Add `https://stillwater-pr-<n>.vercel.app/api/auth/callback/google` to authorized redirect URIs. |
| `proxy.ts` not running | `config.matcher` too restrictive | Verify matcher excludes `_next/static`, `_next/image`, favicon, and asset extensions. See `apps/web/proxy.ts`. |
| Tailwind v4 classes not applying | `globals.css` import order | Must import `@stillwater/ui/globals` BEFORE `tailwindcss`; `@theme` block maps every token. |
| Dev server returns 500 on every page | `babel-plugin-react-compiler` not installed | `pnpm add -F @stillwater/web babel-plugin-react-compiler`. `reactCompiler: true` requires this package. See Gotcha 11. |
| `pnpm check-types` fails TS2345 in `packages/config` | t3-env `createEnv()` missing `clientPrefix` | Add `clientPrefix: 'NEXT_PUBLIC_'` and pass schema inline to `createEnv()`. See Gotcha 12. |
| `pnpm check-types` fails TS2353/TS2322 in `trigger.config.ts` | Trigger.dev v4 type changes | Use `machine: "micro"` (string literal, canonical form). Env vars via dashboard/CLI, not `trigger.config.ts`. See Gotcha 13. |
| `pnpm check-types` fails TS1295 in workers | `verbatimModuleSyntax` requires ESM | Add `"type": "module"` to `services/workers/package.json`. |
| `pnpm check-types` fails TS6059 in workers | `rootDir: "src"` excludes `trigger.config.ts` | Remove `rootDir` and `outDir` from workers tsconfig (irrelevant with `noEmit: true`). |
| `pnpm dev --filter=web` fails "No package found" | Package name is `@stillwater/web`, not `web` | Use `--filter=@stillwater/web` or `--filter=./apps/web`. |
| `turbopackFileSystemCaching` warning in dev | Stale property name | Use `turbopackFileSystemCacheForDev` (Next.js 16.2.10). |
| `pnpm build` fails: `Can't resolve '@stillwater/auth'` (Phase 4) | Turbopack ignores `@stillwater/source` custom condition | Point `exports.default` to `./src/*.ts` + add `transpilePackages` to `next.config.ts`. See Gotcha 34. |
| `pnpm check-types` fails: `CheckedState \| undefined` not assignable (Phase 4) | shadcn v4 + `exactOptionalPropertyTypes` conflict | Use spread-conditional `{...(checked !== undefined ? { checked } : {})}`. See Gotcha 35. |
| `pnpm lint` crashes: `ENOENT: no such file: 'src/style.css'` (Phase 4) | `eslint-plugin-tailwindcss` v4.0.6 bug | Disable `tailwindcss/classnames-order` + `no-contradicting-classname` rules. See Gotcha 36. |
| `pnpm test` fails: `ReferenceError: document is not defined` (Phase 4) | React component test needs DOM environment | Add `// @vitest-environment jsdom` as first line of `.tsx` test. See Gotcha 37. |
| `Property 'name' does not exist on type 'never'` in RSC (Phase 4) | Drizzle 0.45 relational query type inference | Cast result: `sessions as unknown as ScheduleSession[]`. See Gotcha 38. |
| Sanity GROQ `slug == $slug` returns no results (Phase 4) | Sanity slug is object, not string | Use `slug.current == $slug` in GROQ queries. See Gotcha 39. |
| ESLint: `email` is deprecated (Phase 4) | Zod v4 deprecates `z.string().email()` | Use `z.email()` instead. See Gotcha 40. |
| ESLint: `crypto import should occur before vitest` (Phase 4) | `import/order` rule sorts builtins first | Move `import { createHmac } from 'crypto'` above vitest imports. See Gotcha 41. |
| `pnpm build` fails on SSE route: `force-dynamic` not allowed (Phase 5) | `cacheComponents` + `force-dynamic` conflict | Remove `export const dynamic = 'force-dynamic'` from SSE route. Only set `maxDuration = 300`. See Gotcha 42. |
| Memory leaks: EventSource connections accumulate (Phase 5) | Missing cleanup in `useEffect` return | Close EventSource + clear reconnection timers on unmount. See Gotcha 43. |
| Booking full session shows generic error instead of waitlist option (Phase 5) | `bookings.book` throws CONFLICT, doesn't auto-waitlist | Catch CONFLICT in `useBookingMutation`, set `isConflict` flag, show `WaitlistButton`. See Gotcha 44. |
| Duplicate waitlist entries from concurrent joins (Phase 5) | No unique constraint on `waitlist_entries (sessionId, memberId)` | Added `idx_waitlist_session_member` unique index. Migration `0002_lyrical_cargill.sql`. See Gotcha 45. |
| Tests fail: "Found multiple elements with role 'button'" (Phase 5) | jsdom DOM leaking between test files | Add `afterEach(() => cleanup())` to every `.tsx` test file. See Gotcha 46. |
| ESLint: `void expression from arrow function shorthand` (Phase 5) | Radix Dialog `onOpenChange` returns void | Use block body: `(isOpen) => { if (!isOpen) onClose(); }`. See Gotcha 47. |
| ESLint: `Unsafe argument of type 'any'` on `JSON.parse(event.data)` (Phase 5) | `MessageEvent.data` is typed as `any` | Cast: `JSON.parse(String(event.data))`. See Gotcha 48. |
| ESLint: `Invalid type "number" of template literal expression` (Phase 5) | `restrict-template-expressions` forbids `number` | Cast: `String(number)` in template literals. See Gotcha 49. |
| Authenticated user hits 404 on `/dashboard` (Phase 6) | No `(studio)/dashboard/page.tsx` existed | ✅ Fixed in Phase 6 — dashboard page created. Always verify redirect targets exist. See Gotcha 50. |
| `ProfileEditForm` saves empty strings instead of leaving unchanged (Phase 6) | `react-hook-form` returns `''` for empty inputs | Strip empty strings → `undefined` before passing to tRPC mutation. See Gotcha 51. |
| Pause/cancel/resume buttons throw `PRECONDITION_FAILED` (Phase 6) | `memberships` stubs threw until Phase 7 | ✅ Fixed in Phase 7 — all procedures now call real Stripe helpers. Phase 8 added email integration: `memberships.cancel` + `memberships.pause` now also trigger `payment-failed-notify`-style background jobs via `getJobsClient()`. See Gotcha 52. |
| ESLint: `no-base-to-string` on `String(unknown)` in CSV utility (Phase 6) | `unknown` could be an object | Narrow with `typeof` checks before `String()`. See Gotcha 53. |
| ESLint: `unnecessary-condition` + `restrict-template-expressions` in dashboard components (Phase 6) | Drizzle cast produces non-null types | Add eslint override for `src/components/dashboard/**/*.tsx`. See Gotcha 54. |
| `subscription.plan.name` TypeScript error: `never` (Phase 6) | Drizzle 0.45 `with: { plan: true }` infers as `never` | Cast to `SubscriptionWithPlan` type. See Gotcha 55. |
| Dashboard page loads slowly — sequential data fetching (Phase 6) | Three `await` calls in sequence | Use `Promise.all` for parallel fetching. See Gotcha 56. |
| `react-hook-form` validation not working (Phase 6) | Missing `zodResolver` in `useForm` config | Pass `resolver: zodResolver(schema)` to `useForm`. See Gotcha 57. |
| `subscription.current_period_end` is `undefined` (Phase 7) | Stripe Basil removed top-level field (2025-03-31) | Access via `subscription.items.data[0].current_period_end`. See Gotcha 58. |
| `pg_advisory_xact_lock` type error or silent failure (Phase 7) | BigInt literal (`5381n`) needs ES2020; key must be bigint | Use `BigInt(5381)` constructor; mask to 32 bits for single-arg variant. See Gotcha 59. |
| Stripe webhook `400 Invalid signature` even with correct secret (Phase 7) | Body parsed as JSON, re-serialized → signature mismatch | Read body as `await request.text()`, pass raw string to `constructEvent`. See Gotcha 60. |
| `sub.plan.classCreditsPerCycle` TypeScript error: `never` (Phase 7) | Drizzle 0.45 `with: { plan: true }` infers as `never` | Cast query result to expected shape. See Gotcha 61. |
| `TS2379: limit: number \| undefined not assignable to limit?: number` (Phase 7) | `exactOptionalPropertyTypes` forbids `undefined` | Use conditional spread `...(val !== undefined ? { limit: val } : {})`. See Gotcha 62. |
| `Cannot find module '@stillwater/payments'` in web app (Phase 7) | `@stillwater/payments` not added as workspace dependency | `pnpm --filter @stillwater/web add @stillwater/payments@workspace:*`. |
| `Cannot find module 'drizzle-orm'` in payments package (Phase 7) | `drizzle-orm` not a dependency of `@stillwater/payments` | `pnpm --filter @stillwater/payments add drizzle-orm`. Needed for `eq`, `sql`, query types. |
| `pnpm test` fails: "No test files found" in `@stillwater/payments` or `@stillwater/ui` | Vitest exits code 1 with zero test files | ✅ Fixed via Phase A.1 — `passWithNoTests: true` in vitest.config.ts. |
| `TS1295: verbatimModuleSyntax error in workers` (Phase 8) | Workers tsconfig `verbatimModuleSyntax: true` conflicts with CJS `@stillwater/db` | Set `verbatimModuleSyntax: false` in workers tsconfig. See Gotcha 63. |
| `Property 'instructor' does not exist on type 'never' in worker` (Phase 8) | Drizzle 0.45 `with` types infer as `never` (NodeNext issue) | Cast `(db.query.X as any).findFirst({...})` — see Gotcha 64. |
| `Property 'sendEvent' does not exist on TriggerClient` (Phase 8) | Trigger.dev SDK v4 API changed from v3 | Use `tasks.trigger()` from `@trigger.dev/sdk` — see Gotcha 65. |
| `Module not found: Can't resolve '@trigger.dev/sdk' in build` (Phase 8) | Turbopack statically analyzes dynamic `import()` calls | Add as real dependency — see Gotcha 66. |
| `Job triggered but data doesn't exist` (Phase 8) | Job triggered inside a transaction that rolled back | Use post-commit pattern — see Gotcha 67. |
| `Cannot find module '@stillwater/email'` in api (Phase 8) | `@stillwater/email` not added as workspace dependency | `pnpm --filter @stillwater/api add @stillwater/email@workspace:*`. |
| `vitest test files fail with TS2835 (explicit file extensions)` in workers (Phase 8) | NodeNext requires `.js` extensions in `import` paths; test files type-checked by tsc | Exclude test files from workers tsconfig: `"exclude": [..., "src/**/*.test.ts"]`. |
| `Module not found: Can't resolve 'cmdk'` (Phase 9) | `cmdk` not installed for shadcn command component | `pnpm --filter @stillwater/web add cmdk`. See Gotcha 68. |
| `TRPCError: BAD_REQUEST` calling `bookings.checkIn` from RosterTable (Phase 9) | `bookings.checkIn` takes `{ sessionId, memberId }`, NOT `{ enrollmentId }` | Pass `entry.member.id` (member ID), not `entry.id` (enrollment ID). See Gotcha 69. |
| `TRPCError: BAD_REQUEST` calling `schedule.getWeek({})` (Phase 9) | `getWeek` requires `{ weekStart: date }` input | Pass `weekStart: new Date()` (set hours to 0). See Gotcha 70. |
| `Cannot find name 'ilike'` or `'or'` in admin search (Phase 9) | Drizzle operators not imported | `import { ilike, or } from 'drizzle-orm'`. See Gotcha 72. |
| `TRPCError: FORBIDDEN` when assigning roles (Phase 9) | `admin.assignRole` uses `ownerProcedure`, not `staffProcedure` | Only owner role can assign/remove roles. See Gotcha 73. |
| Staff sees Revenue/Settings in sidebar (Phase 9) | `AdminShell` role-based visibility not working | Verify `canSeeLink()` + `ROLE_LEVEL` map. See Gotcha 75. |
| Drag session in calendar doesn't update time (Phase 9) | `sessions.update` procedure doesn't exist yet | Phase 10 will add it. See Gotcha 77. |
| Revenue chart shows single point, not 12 months (Phase 9) | Monthly GROUP BY query not implemented | Phase 10 enhancement. See Gotcha 78. |
| `Type 'undefined' not assignable` inserting to `audit_log` (Phase 9) | `metadata` is jsonb nullable — use `null`, not `undefined` | `metadata: metadata ?? null`. See Gotcha 80. |
| `TS2339: Property 'amountCents' does not exist` in admin.ts (Phase 10 fix) | `payment_events` table has no `amountCents` column — amount is in `payload` jsonb | Use `(payload->>'amount_received')::bigint` SQL extraction. See Gotcha 81. |
| `Parsing error: *.test.ts was not found by the project service` in workers (Phase 10 fix) | Workers tsconfig excludes test files (correct for tsc); `projectService: true` can't find them; `projectService: false` crashes typed rules | Use `projectService: { allowDefaultProject, defaultProject: './tsconfig.eslint.json', maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 20 }`. Create `tsconfig.eslint.json`. Add `no-unsafe-assignment`/`no-unsafe-argument` override for test files. Fix `vitest.config.ts` import order. See Gotcha 82. |
| ~70 `no-explicit-any` + `no-unsafe-*` errors in workers (Phase 10 fix) | `db.query.X as any` casts (Gotcha 64) — per-line eslint-disable only covers one line | Scoped ESLint override for all worker src files. See Gotcha 83. |
| `require-await` on worker `async run()` methods (Phase 10 fix) | `async` method doesn't use `await` (v1 no-op stubs); but removing `async` alone breaks `task()`'s `Promise<unknown>` return type | Use `run: () => Promise.resolve({...})` — satisfies both type and lint. See Gotcha 84. |
| `restrict-template-expressions` on number in template literal (Phase 10 fix) | `number` type in `${diffMin}` — ESLint forbids (NaN/Infinity risk) | Wrap with `String()`: `${String(diffMin)}`. See Gotcha 84. |
| `This module cannot be imported from a Client Component` in tests (Phase 10 fix) | `server-only` package throws in Vitest; `lib/auth.ts` + `lib/observability/logger.ts` import it | Alias `server-only` to empty stub in `vitest.config.ts` + `vi.mock('server-only', () => ({}))` in `test/setup.ts`. See Gotcha 85. |
| `Invalid Chai property: toBeInTheDocument` in KpiCard tests (Phase 10 fix) | `@testing-library/jest-dom` not installed + not wired in vitest setup | Install package, import in `test/setup.ts`, add `setupFiles` to web vitest config, add `vitest-setup.d.ts` for tsc. See Gotcha 86. |
| `TS2353: 'IconLeft' does not exist in type 'Partial<CustomComponents>'` (Phase 10 fix) | `react-day-picker` v10 removed `IconLeft`/`IconRight` in favor of single `Chevron` component | Rewrite `calendar.tsx` to v10 API: `Chevron: ({ orientation }) => ...`. See Gotcha 87. |
| `TS2561: 'capture_pageviews' does not exist in type 'Partial<PostHogConfig>'` (Phase 10 fix) | PostHog config key is `capture_pageview` (singular), not `capture_pageviews` (plural) | Change to `capture_pageview: true` in `posthog.ts` + `posthog.test.ts`. See Gotcha 88. |
| `TS2322: Resolver<{...unknown...}> not assignable to Resolver<{...number...}>` (Phase 10 fix) | `@hookform/resolvers` v5 generic mismatch with `z.coerce.number()` + `.default()` | Cast: `zodResolver(schema) as Resolver<FormValues>`. See Gotcha 89. |
| `caller.admin.X is not a function` in admin.test.ts (Phase 10 fix) | `adminRouter` is a flat router — `caller = adminRouter.createCaller(ctx)` accesses procedures at top level, not nested under `.admin` | Change `caller.admin.listClasses(...)` → `caller.listClasses(...)`. |
| `pnpm build` fails: `turbo` can't find package manager binary | pnpm not on PATH (corepack shim at `/usr/lib/node_modules/corepack/shims/pnpm`) | `export PATH="/usr/lib/node_modules/corepack/shims:$PATH"` before running `pnpm build`. |
| `git push` fails: `Invalid command: 'git-receive-pack '"'"'...'` | SSH wrapper `shlex.join()` re-quotes single-string remote command; GitHub git-shell rejects it | Use the fixed wrapper at `skills/how-to-git-push-using-ssh-wrapper/scripts/ssh_git_wrapper_v3.py` (normalizes via `shlex.split()` → `shlex.join()`). See that skill for full instructions. |

---

## Anti-Patterns to Avoid

- **Over-Engineering**: Don't build for hypothetical needs. If 50 lines solves it, don't write 200.
- **Premature Optimization**: Optimize only with profiler evidence (React DevTools Profiler, `EXPLAIN ANALYZE`)
- **Magic Numbers/Strings**: Use named constants or Zod enums
- **Hardcoding**: Use configuration (`@stillwater/config/env`) or design tokens
- **Generic UI**: No purple gradients, no Inter-only, no drop shadows, no pill CTAs, no 3-column card grids (see `PAD.md` §11.2 anti-generic contract)
- **`any` type**: Use `unknown` and narrow with type guards
- **`forwardRef`**: React 19 allows `ref` as regular prop
- **`useMemo`/`useCallback` without profiler evidence**: React Compiler handles memoization
- **Client Component overuse**: Default to Server Components
- **Synchronous side effects in API routes**: Always trigger a Trigger.dev task
- **Optimistic locking for booking**: Use PostgreSQL advisory locks (ADR-004)
- **Self-signed Stripe webhook**: Always verify signature via `stripe.webhooks.constructEvent`
- **`middleware.ts` filename**: Renamed to `proxy.ts` in Next.js 16 (ADR-009)
- **`next lint`**: Deprecated in Next.js 16 — use `eslint .` directly
- **Google Fonts CDN in production**: Self-host via `next/font/local` (Cormorant + DM Sans + JetBrains Mono)
- **Mockup `--sp-N` spacing tokens**: Use PAD's `--space-N` naming (off-by-one from index 5)

---

## Success Metrics

You are successful when:

- **G1**: Zero booking-related support tickets per week
- **G2**: Schedule changes live in < 5 minutes via admin UI
- **G3**: Sanity publish → ISR propagates in < 5 minutes
- **G4**: p95 response time < 200ms at 500 RPS
- **G5**: Zero unreconciled Stripe transactions
- **G6**: Lighthouse Accessibility score: 100; WCAG 2.2 AAA compliant
- **G7**: New dev runs `pnpm dev` successfully within 30 minutes

(See `PAD.md` §2.3 for full success criteria.)

---

## Continuous Improvement

After each phase:

- Reflect on what went well and what could be improved
- Update `MASTER_EXECUTION_PLAN.md` with phase completion timestamp
- Add ADR if a significant decision was made during implementation
- Update `PAD.md` if architecture changed
- Update `.env.example` if new env vars introduced
- Update this `CLAUDE.md` if conventions or commands changed
- Run `pnpm audit` and address any high-severity findings
- Verify all 8 CI gates still pass on `develop`

---

## Quick Reference — Common Tasks

| Task                                  | Command / Location                                                |
|---------------------------------------|-------------------------------------------------------------------|
| Add a new tRPC procedure              | `packages/api/src/routers/<router>.ts` + co-located test file     |
| Add a new DB table                    | `packages/db/src/schema/<table>.ts` + export in `schema/index.ts` |
| Generate a migration                  | `pnpm db:generate` → review SQL → `pnpm db:migrate`               |
| Add a new background job              | `services/workers/src/<job-id>.ts` + register in `trigger.config.ts` `dirs` |
| Add a new email template              | `packages/email/src/templates/<Name>.tsx` + export in `index.ts`  |
| Add a new Radix UI component          | `pnpm dlx shadcn@latest add <component>` (uses `components.json`) |
| Add a new env var                     | Add to `.env.example` + `packages/config/src/env.ts` Zod schema   |
| Add a new PostHog event               | `apps/web/src/lib/analytics/posthog.ts` `analytics` object         |
| Update design tokens                  | `packages/ui/src/tokens/<file>.css` (colors/typography/spacing/motion) |
| Add a new admin route                 | `apps/web/src/app/(admin)/admin/<route>/page.tsx` + RBAC in `proxy.ts` |
| Test booking concurrency              | `pnpm test --filter=@stillwater/api -- --grep "BOOK-006"`         |
| Verify Stripe webhook locally         | `stripe listen --forward-to localhost:3000/api/webhooks/stripe`   |
| Open Drizzle Studio                   | `pnpm db:studio`                                                  |
| Check bundle size                     | `ANALYZE=true pnpm build`                                         |
