---
IMPORTANT: File is read fresh for every conversation. Be brief and practical.
project_type: nextjs-monorepo
version: 1.7.0
framework_version: "Next.js 16.2, React 19.2.7, Tailwind v4.3, tRPC v11, Drizzle 0.45, Better Auth 1.6.23"
last_updated: 2026-07-07
---

# Stillwater

Enterprise-grade yoga studio management platform. Turborepo monorepo combining a public marketing surface (Next.js 16 + Sanity CMS, ISR), a member booking application (real-time seat availability via SSE), an RBAC-gated admin surface, Stripe subscription billing, and Trigger.dev v4 background jobs.

**Tech Stack**: Next.js 16.2 (App Router, Turbopack, React Compiler), React 19.2.7, TypeScript 5.9.0 strict, Tailwind CSS v4.3, tRPC v11, Drizzle ORM 0.45, PostgreSQL 17 (Neon), Better Auth 1.6.23, Trigger.dev v4 (SDK import path is `@trigger.dev/sdk` root — see Gotchas), Stripe 22.3 ("Dahlia" API), Sanity CMS v3, React Email 6.6 + Resend 6.17, pnpm 11.9 workspaces.

**Canonical Sources** (read in this order when in doubt — precedence: design specs → visual guidance → tech stack → architecture culmination → derived working copy):
1. `design.md` — requirement specifications + original architectural critique (some sections superseded by ADRs — warnings inline)
2. `static_landing_page_mockup.html` + `static_landing_page_html_mockup.md` — visual + UI/UX aesthetics guidance only (token VALUES come from SKILL §4.1 / PAD §11.4)
3. `stillwater_SKILL.md` — distilled project skill (v1.4.1; 21 source skills condensed); authoritative tech-stack specifics
4. `PAD.md` — Project Architecture Document (31 sections, 10 ADRs; v1.4.0); culmination of the above into codebase architecture
5. `MASTER_EXECUTION_PLAN.md` — derived working copy for the coding agent (13-phase plan + 45 reconciled discrepancies D1–D45 + all 10 Open Questions resolved; v1.3.0)
6. `scaffolding_files.md` — Phase 0 ready-to-paste configs (39 files) — **HISTORICAL: Phase 0 complete; actual files on disk are canonical**
7. `react_email_suggestion.md` / `pnpm_install_fix.md` — post-hoc ecosystem discovery docs (cited in MEP D43/D44)

**Phase 0–3 Status**: ✅ COMPLETE. Phase 0: scaffold + design tokens. Phase 1: 14 tables + 8 enums + 5 critical indexes via Drizzle. Phase 2: Better Auth v1.6.23 + RBAC + 2-layer auth. Phase 3: 10 tRPC routers (~30 procedures) with advisory lock booking, rate limiting, 4 access tiers, web integration (HTTP handler + RSC server caller + React client + query keys). 326 tests (104 api + 102 auth + 107 db + 13 web). `pnpm install` / `pnpm check-types` / `pnpm lint` / `pnpm test` all green. Phase 4–12 pending.

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
- **Session enrichment**: Use `session.sessionData` callback to attach `memberId` + `roles` from `role_assignments` table
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
pnpm check-types       # TypeScript green
pnpm lint              # ESLint green
pnpm test              # Vitest green
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
# - 17 events tracked (see PAD §19.3)

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
17. **Importing `render` from `@react-email/render`**: Deprecated in React Email v6.0.0 (April 16, 2026). Import from `react-email` root: `import { render } from 'react-email'`. See D43.
18. **Pinning `typescript: ^6.0.3` in sub-packages**: PAD §5.1 mandates `^5.9.0` for `erasableSyntaxOnly` + `verbatimModuleSyntax` compatibility. See D44 + `pnpm_install_fix.md`.
19. **Using Zod v3 patterns**: Zod v4 has breaking changes — `z.string().url()` accepts any scheme (use `z.url({ protocol: /^https:$/ })`); `{ errorMap }` removed; `{ message }` deprecated; `z.ZodIssueCode` deprecated (use string literal `'custom'`).
20. **Using Stripe `currentPeriodEnd` (camelCase)**: Stripe SDK v22 uses snake_case API (`current_period_end`), and it moved to `items.data[0].current_period_end` in the Dahlia API (2026-06-24).
21. **Enabling `reactCompiler: true` without installing `babel-plugin-react-compiler`**: The package is NOT a built-in — it must be manually installed (`pnpm add -F @stillwater/web babel-plugin-react-compiler`). Without it, every page returns 500. See Gotcha 11.
22. **Passing t3-env schema as a separate variable to `createEnv()`**: TypeScript can't infer generics — pass schema inline. Also, `clientPrefix: 'NEXT_PUBLIC_'` is required. See Gotcha 12.
23. **Using Trigger.dev v3-style `machine: { preset: "micro" }` or `build.env`**: v4 changed the type — `machine` is now a string literal; `build.env` was removed. See Gotcha 13.
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
2. **`PAD.md`** — why each architectural decision was made (31 sections, 9 ADRs)
3. **`scaffolding_files.md`** — Phase 0 ready-to-paste configs (39 files)
4. **`design.md`** — three-path critique + merged optimal architecture
5. **`static_landing_page_html_mockup.md`** — landing page spec + complete HTML mockup
6. **This `CLAUDE.md`** — agent briefing for any Claude Code session

### ADRs (Architecture Decision Records)

9 ADRs total (7 from PAD + 2 added in `MASTER_EXECUTION_PLAN.md`):

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

**Pending ADR-010** (recommended): Resend Native Templates over local JSX rendering for Trigger.dev workers — protects 30s CPU budgets from React Email v6 1.8MB bundle bloat. See `react_email_suggestion.md` Alternative A.

---

## Project-Specific Standards

### Architecture

- **Turborepo monorepo**: `apps/web` (Next.js), `apps/studio` (Sanity Studio — **Phase 4 deliverable, not yet scaffolded**), `packages/*` (7 shared libs), `services/workers` (Trigger.dev), `tooling/*` (3 shared configs)
- **Package dependency graph** (PAD §6.3): `web → api + ui + auth + config`; `api → db + payments + config`; `auth → db + config`; `workers → db + email + config`
- **`@stillwater/source` custom condition**: Declared in `.npmrc` + `pnpm-workspace.yaml` — workspace packages resolve to source (`./src/index.ts`) instead of built `dist/`, enabling zero-rebuild dev iteration
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
- **14 tables** ✅ implemented in Phase 1: `users`, `members`, `instructors`, `class_styles`, `classes`, `rooms`, `class_sessions`, `enrollments`, `waitlist_entries`, `membership_plans`, `member_subscriptions`, `class_packages`, `payment_events`, `role_assignments` — see `packages/db/src/schema/`
- **8 enums** ✅ implemented in Phase 1: `class_level`, `session_status`, `enrollment_status`, `waitlist_status`, `subscription_status`, `billing_interval`, `studio_role`, `payment_status` — see `packages/db/src/schema/enums.ts`
- **5 critical indexes** ✅ implemented in Phase 1 (4 partial + 1 unique): `idx_sessions_starts_at_status`, `idx_enrollments_session_status`, `idx_waitlist_session_position`, `idx_subscriptions_member_status`, `idx_payment_events_stripe_id` — see `PAD.md` §7.3
- **3 additional indexes** (Phase 1): `idx_members_stripe_customer_id` (D6 webhook lookup), `idx_enrollments_session_member` (unique — double-booking prevention), `idx_role_assignments_member_role` (unique — duplicate grant prevention)
- **15 FK constraints** with cascade rules: CASCADE (members→users, enrollments→sessions/members, waitlist→sessions/members, etc.), RESTRICT (class_sessions→instructors, member_subscriptions→membership_plans), SET NULL (class_sessions→rooms, payment_events→members)
- **Two DB URLs**: `DATABASE_URL` (pooled, app queries) + `DATABASE_URL_UNPOOLED` (migrations only — PgBouncer breaks prepared statements)
- **Drizzle ORM 0.45**: schema in TypeScript (`packages/db/src/schema/`); neon-http serverless driver; `db` client exported from `packages/db/src/index.ts` with `DrizzleDB` type
- **Migration**: `drizzle-kit generate` → `0000_chemical_obadiah_stane.sql` (Phase 1); apply via `pnpm db:migrate`
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

**Fix:** Import from `react-email` root: `import { render, Html, Button, Tailwind } from 'react-email'`. For Trigger.dev workers, consider Resend Native Templates (`resend.emails.send({ to, subject, templateId, variables })`) to avoid the 1.8MB bundle bloat — see `react_email_suggestion.md` Alternative A. Pending ADR-010 will formalize this decision.

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

### Gotcha 8: Vercel SSE timeout (10s Hobby / 15s Pro default)

**Symptom:** SSE endpoint silently terminates after 10–15 seconds on Vercel.

**Root cause:** Vercel serverless functions have a default timeout (10s Hobby, 15s Pro) that terminates long-running streams. As of June 2026, Vercel allows up to 30 minutes (1800s) on Pro/Enterprise, but this requires BOTH `maxDuration` AND enabling Fluid Compute in project settings.

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

### Gotcha 13: Trigger.dev v4 type changes — `machine` is string, `build.env` removed (High)

**Symptom:** `pnpm check-types` fails with TS2353 ("'env' does not exist in type") and TS2322 ("Type '{ preset: string; }' is not assignable to type 'micro' | 'small-1x' | ...").

**Root cause:** Trigger.dev v4 SDK changed the `defineConfig` type signature: `machine` is now a string literal (`"micro"`, `"small-1x"`, etc.), not an object with `preset`. The `build.env` property was removed — environment variables are injected at runtime by Trigger.dev Cloud.

**Fix:** `services/workers/trigger.config.ts` updated: `machine: { preset: "micro" }` → `machine: "micro"`; removed `build.env` block.

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

**Fix:** Phase 2 Cycle 0 changed `users.emailVerified` from `timestamp` to `boolean('email_verified').default(false).notNull()`. Migration `0001_supreme_sabretooth.sql` applies this change (destructive — drops timestamp column, adds boolean column). Also requires updating seed fixtures: `emailVerified: new Date()` → `emailVerified: true`.

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
| `pnpm check-types` fails TS2353/TS2322 in `trigger.config.ts` | Trigger.dev v4 type changes | `machine` is string not object; `build.env` removed. See Gotcha 13. |
| `pnpm check-types` fails TS1295 in workers | `verbatimModuleSyntax` requires ESM | Add `"type": "module"` to `services/workers/package.json`. |
| `pnpm check-types` fails TS6059 in workers | `rootDir: "src"` excludes `trigger.config.ts` | Remove `rootDir` and `outDir` from workers tsconfig (irrelevant with `noEmit: true`). |
| `pnpm dev --filter=web` fails "No package found" | Package name is `@stillwater/web`, not `web` | Use `--filter=@stillwater/web` or `--filter=./apps/web`. |
| `turbopackFileSystemCaching` warning in dev | Stale property name | Use `turbopackFileSystemCacheForDev` (Next.js 16.2.10). |

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
