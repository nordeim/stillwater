---
IMPORTANT: File is read fresh for every conversation. Be brief and practical.
project_type: nextjs-monorepo
version: 1.0.0
framework_version: "Next.js 16"
last_updated: 2026-07-04
---

# Stillwater

Enterprise-grade yoga studio management platform. Turborepo monorepo combining a public marketing surface (Next.js 16 + Sanity CMS, ISR), a member booking application (real-time seat availability via SSE), an RBAC-gated admin surface, Stripe subscription billing, and Trigger.dev v3 background jobs.

**Tech Stack**: Next.js 16 (App Router, Turbopack, React Compiler), React 19, TypeScript 5.7 strict, Tailwind CSS v4, tRPC v11, Drizzle ORM 0.40, PostgreSQL 17 (Neon), Better Auth 1.2, Trigger.dev v3, Stripe, Sanity CMS, Resend, pnpm 9.15 workspaces.

**Canonical Sources** (read in this order when in doubt):
1. `scaffolding_files.md` — executable truth (package.json, scripts, env vars)
2. `MASTER_EXECUTION_PLAN.md` — 13-phase plan + 35 reconciled discrepancies
3. `PAD.md` — Project Architecture Document (31 sections, 9 ADRs)
4. `design.md` / `static_landing_page_html_mockup.md` — conceptual + visual reference

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
- **Idempotent Webhooks** — `payment_events.stripe_event_id` UNIQUE INDEX + `pg_advisory_lock` for Stripe event processing.
- **Side Effects in Background Jobs** — Emails, notifications, digests never run synchronously in API routes. Always trigger a Trigger.dev task.
- **Self-Hosted Fonts** — Cormorant Garamond + DM Sans + Berkeley Mono. Zero FOUT, zero third-party font CDN in production.

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
- **Client-side**: `authClient.useSession()` hook
- **Route protection**: `proxy.ts` calls `auth.api.getSession` and enforces `PROTECTED_ROUTES` map
- **Server helpers**: `requireAuth()`, `requireRole(...roles)` in `apps/web/src/lib/auth.ts`

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
# Prerequisites: Node.js >= 22, pnpm >= 9, Docker

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
| `pnpm dev --filter=web`          | Start only `apps/web`                              |
| `pnpm build`                     | Production build across all packages               |
| `pnpm build --filter=web`        | Build only web app                                 |
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
pnpm lint              # ESLint v9 flat config (tooling/eslint/index.js)
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
9. **Forgetting `runtime = 'nodejs'` on SSE route**: SSE must run on Node runtime, not Edge
10. **Calling `next lint` in Next.js 16**: Deprecated — use `eslint .` directly
11. **Using `experimental.serverComponentsExternalPackages`**: Renamed to top-level `serverExternalPackages` in Next.js 16
12. **Hardcoded mockup `--sp-N` spacing tokens**: Use PAD's `--space-N` (off-by-one from index 5)
13. **Forgetting idempotency on Stripe webhooks**: Always check `payment_events.stripe_event_id` UNIQUE INDEX first

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

9 ADRs total (7 from PAD + 2 from MASTER_EXECUTION_PLAN):

| ADR    | Decision                                                | Status   |
|--------|---------------------------------------------------------|----------|
| ADR-001| Turborepo monorepo over independent repositories        | Accepted |
| ADR-002| tRPC v11 over REST API routes                           | Accepted |
| ADR-003| Drizzle ORM over Prisma                                 | Accepted |
| ADR-004| PostgreSQL advisory locks for booking concurrency       | Accepted |
| ADR-005| Sanity CMS for marketing content only                   | Accepted |
| ADR-006| Server-Sent Events over WebSockets for seat availability| Accepted |
| ADR-007| Trigger.dev v3 for background jobs over BullMQ          | Accepted |
| ADR-008| Better Auth supersedes Auth.js v5                       | NEW      |
| ADR-009| `proxy.ts` replaces `middleware.ts` (Next.js 16)        | NEW      |

---

## Project-Specific Standards

### Architecture

- **Turborepo monorepo**: `apps/web` (Next.js), `apps/studio` (Sanity Studio), `packages/*` (7 shared libs), `services/workers` (Trigger.dev), `tooling/*` (3 shared configs)
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
- **14 tables**: `users`, `members`, `instructors`, `class_styles`, `classes`, `rooms`, `class_sessions`, `enrollments`, `waitlist_entries`, `membership_plans`, `member_subscriptions`, `class_packages`, `payment_events`, `role_assignments`
- **8 enums**: `class_level`, `session_status`, `enrollment_status`, `waitlist_status`, `subscription_status`, `billing_interval`, `studio_role`, `payment_status`
- **5 critical indexes** (4 partial + 1 unique): see `PAD.md` §7.4
- **Two DB URLs**: `DATABASE_URL` (pooled, app queries) + `DATABASE_URL_UNPOOLED` (migrations only)
- **Read replica** for admin revenue reports (PAD §22.4)
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
- **Google Fonts CDN in production**: Self-host via `next/font/local` (Cormorant + DM Sans + Berkeley Mono)
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
