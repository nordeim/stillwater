# AGENTS.md

> Compact instruction file for AI coding agents working in the Stillwater monorepo.
> Every line below is hard-earned context that an agent would likely get wrong without it.
> For the full project briefing, see [`CLAUDE.md`](./CLAUDE.md). For architecture, see [`PAD.md`](./PAD.md).

---

## Stack (exact versions — do not drift)

| Layer | Version | Notes |
|---|---|---|
| Node.js | ≥ 22.0.0 | Required for native `fetch`, ESM stability |
| pnpm | **11.9.0** (`^11.0.0`) | pnpm 9.x is EOL. Root `package.json` `packageManager` field pins this. |
| TypeScript | **5.9.0** (`^5.9.0`) | Do NOT upgrade to 6.x. Required for `erasableSyntaxOnly` + `verbatimModuleSyntax`. |
| ESLint | **9.39.4** (`^9.39.4`) | Do NOT upgrade to v10. `eslint-plugin-react` and `eslint-plugin-import` have no v10 versions. |
| Next.js | 16.2.0 (`^16.2.0`) | App Router, Turbopack, React Compiler (`reactCompiler: true`) |
| React | 19.2.3 (`^19.2.3`) | CVE-2025-55182 floor — never downgrade below 19.2.3 |
| Tailwind CSS | 4.3.0 (`^4.3.0`) | CSS-first `@theme` in `globals.css`; no `tailwind.config.js` needed |
| tRPC | v11 (`^11.18.0`) | Server caller for RSC, React Query for client |
| Drizzle ORM | 0.45.0 (`^0.45.2`) | `neon-http` driver; `db.$count` requires ≥0.34 |
| PostgreSQL | 17 (Neon) | Two URLs: `DATABASE_URL` (pooled) + `DATABASE_URL_UNPOOLED` (migrations only) |
| Better Auth | 1.6.23 (`^1.6.23`) | Replaces Auth.js v5 (ADR-008). Drizzle adapter. |
| Trigger.dev | v4 platform, **v3 SDK API** | `import { defineConfig } from "@trigger.dev/sdk/v3"` — the `/v4` export DOES NOT EXIST. See Gotcha 1. |
| Stripe | 22.3.0 (`^22.3.0`) | "Dahlia" API (2026-06-24); snake_case; `current_period_end` at `items.data[0]` |
| React Email | 6.6.6 (`^6.6.6`) | v6 unified all imports to `react-email` root. `@react-email/render` is DEPRECATED. |
| Resend | 6.17.1 (`^6.17.1`) | |
| Zod | 4.4.3 (`^4.4.3`) | v4 breaking: `z.string().url()` accepts any scheme; `{ errorMap }` removed; `z.ZodIssueCode` deprecated |

---

## Commands (non-obvious)

```bash
# Install (uses @stillwater/source custom condition — resolves workspace packages to src/ not dist/)
pnpm install

# Dev (Next.js 16 + Turbopack)
pnpm dev --filter=web          # Just web
pnpm dev                       # All apps + workers
pnpm jobs:dev                  # Trigger.dev local worker only

# Quality gates (run all 3 before committing)
pnpm check-types               # tsc --noEmit across all packages
pnpm lint                      # ESLint v9 flat config
pnpm lint:fix                  # Auto-fix (import/order is auto-fixable)

# Database (uses DATABASE_URL_UNPOOLED — NOT DATABASE_URL)
pnpm db:generate               # Generate migration SQL from schema diff
pnpm db:migrate                # Apply migrations
pnpm db:seed                   # Load synthetic demo data (5 members, 3 instructors, 4 classes, 7 sessions)
pnpm db:studio                 # Drizzle Studio GUI
pnpm db:reset                  # Drop all + migrate + seed (LOCAL ONLY)

# Testing
pnpm test                      # Vitest (all packages)
pnpm test --filter=@stillwater/api  # Single package
pnpm test -- --grep "BOOK-006" # Filter by scenario name
pnpm test:e2e                  # Playwright (5 browser projects)

# Build
pnpm build                     # All packages
ANALYZE=true pnpm build --filter=web  # Bundle analyzer

# Infrastructure
docker compose up -d           # Postgres 17 + Redis 7 + Adminer
docker compose ps              # Verify healthy
```

---

## Architecture (what's not obvious from filenames)

### Monorepo layout

```
apps/web/          → Next.js 16 (marketing + studio + admin route groups)
apps/studio/       → Sanity Studio config (runtime hosted at stillwater.sanity.studio — Q4 decision)
packages/api/      → tRPC routers (10 routers, 4 procedure tiers)
packages/db/       → Drizzle schema (14 tables, 8 enums, 5 critical indexes)
packages/auth/     → Better Auth config
packages/email/    → React Email v6 templates (13 templates) + send.ts
packages/payments/ → Stripe client + idempotent webhooks
packages/ui/       → Design tokens (CSS) + fonts (self-hosted) + Radix components
packages/config/   → t3-env Zod-validated env schema (34 vars)
services/workers/  → Trigger.dev v4 tasks (11 jobs)
tooling/{eslint,typescript,tailwind}/  → Shared configs
infrastructure/postgres/init/  → Docker-entrypoint SQL (uuid-ossp + pgcrypto)
```

### `@stillwater/source` custom condition (D15)

Workspace packages resolve to `./src/index.ts` (source) instead of `./dist/index.js` (built). Declared in BOTH `.npmrc` (`custom-conditions=@stillwater/source`) AND `pnpm-workspace.yaml` (`customConditions: ['@stillwater/source']`). Without this, pnpm resolves `@stillwater/*` to non-existent `dist/` directories.

### 2-Layer Auth Pattern (ADR-009 — mandatory)

**NEVER call `auth.api.getSession()` inside `proxy.ts`.** It breaks Edge runtime.

- **Layer 1 — `apps/web/proxy.ts` (Edge runtime):** Cookie-existence-only check via `getSessionCookie(request)` from `better-auth/cookies`. NO DB. NO RBAC. Fast redirect for unauthenticated.
- **Layer 2 — Server Component layouts (Node.js):** Full validation via `requireAuth()` / `requireRole(...roles)` in `(studio)/layout.tsx`, `(admin)/layout.tsx`, nested revenue/settings layouts.

### Database: two URLs, transaction-scoped locks

- `DATABASE_URL` — pooled (Neon PgBouncer) — all app queries
- `DATABASE_URL_UNPOOLED` — direct connection — migrations + seeding ONLY (PgBouncer breaks prepared statements)
- **Always use `pg_advisory_xact_lock()` (transaction-scoped), NEVER `pg_advisory_lock()` (session-scoped)** — session-scoped locks leak under Neon PgBouncer transaction pooling. Applies to booking flow AND Stripe webhook idempotency.

---

## Critical gotchas (agent will get these wrong without help)

### 1. Trigger.dev SDK import path

```typescript
// ✅ CORRECT — v4 platform uses v3 SDK API
import { defineConfig } from "@trigger.dev/sdk/v3";

// ❌ WRONG — /v4 export does not exist in @trigger.dev/sdk@4.5.0
import { defineConfig } from "@trigger.dev/sdk/v4"; // Module not found
```

The "v4" in PAD §17.2 / ADR-007 = platform version. The "v3" in the import = SDK API version. `@trigger.dev/sdk@4.5.0` only exports `./v3`.

### 2. ESLint version — do NOT upgrade to v10

`eslint-plugin-react@7.37.5` (latest) supports `^9.7` only. `eslint-plugin-import@2.32.0` (latest) supports `^9` only. No v10-compatible versions exist. Stay on `eslint@^9.39.4` (`maintenance` dist-tag). See MEP D45.

### 3. React Email v6 — import from root

```typescript
// ✅ CORRECT — v6 unified
import { render, Html, Button, Tailwind } from 'react-email';

// ❌ WRONG — deprecated in v6.0.0 (April 16, 2026)
import { render } from '@react-email/render';
import { Html } from '@react-email/components';
```

v6 bundle is 1.8MB (514KB gzipped) — consider Resend Native Templates for Trigger.dev workers (pending ADR-010).

### 4. TypeScript — stay on 5.9.0

`pnpm install` will say "6.0.3 is available". **Ignore it.** PAD §5.1 mandates `^5.9.0` for `erasableSyntaxOnly` (forbids `enum`, `namespace`, parameter properties) + `verbatimModuleSyntax` (requires `import type`). All 9 sub-packages must pin `^5.9.0`, not `^6.0.3`.

### 5. `proxy.ts` is Edge by default

Next.js 16 `proxy.ts` runs on Edge runtime. The comment in the file previously said "Node.js runtime" — that was wrong. The cookie-only `getSessionCookie()` check is Edge-compatible. Do NOT add `auth.api.getSession()` or any DB call to `proxy.ts`.

### 6. `cacheComponents: true` not yet enabled

SKILL.md §2.1 recommends `cacheComponents: true` in `next.config.ts`, but it's NOT in the current Phase 0 config (deferred to pre-Phase 4). If you enable it, ALL async data fetching must be inside `<Suspense>` or `'use cache'`. Do NOT set `export const dynamic = 'force-dynamic'` on any route — it's incompatible and causes a build error.

### 7. Stripe API — snake_case + Dahlia

```typescript
const stripe = new Stripe(key, {
  apiVersion: '2026-06-24.dahlia',  // NOT '2024-12-18.acacia'
  typescript: true,
});

// Dahlia: current_period_end moved to items.data[0]
const periodEnd = subscription.items.data[0].current_period_end;
// SDK uses snake_case — NOT currentPeriodEnd
```

### 8. `proxy.ts` function is NOT async

The exported `proxy` function does not need `async` (no `await` — `getSessionCookie()` is synchronous). ESLint `@typescript-eslint/require-await` will flag it if you add `async` unnecessarily.

### 9. Design tokens — use `--space-N`, not `--sp-N`

The static mockup uses `--sp-1` through `--sp-11`. PAD uses `--space-1` through `--space-13` (plus `--space-px: 1px` and `--space-0-5: 2px`). From index 5 onward, they're off-by-one (mockup `--sp-5` = 24px = PAD `--space-6`). Always use PAD's `--space-N` naming.

### 10. `serverExternalPackages` is top-level (not experimental)

```typescript
// ✅ CORRECT — Next.js 16 top-level
const nextConfig = {
  serverExternalPackages: ['@neondatabase/serverless', 'drizzle-orm', 'better-auth'],
};

// ❌ WRONG — renamed in Next.js 16
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [...],  // Ignored!
  },
};
```

---

## Phase status (as of 2026-07-06)

| Phase | Status | Notes |
|---|---|---|
| 0 — Scaffold | ✅ Complete | All 10 D15–D24 patches applied. `pnpm install` / `check-types` / `lint` green. |
| 1 — DB Schema | ⬜ Pending | Next. F1-01…F1-21 (14 tables, 8 enums, 5 indexes, seed). |
| 2 — Auth | ⬜ Pending | F2-01…F2-19 (Better Auth + 2-layer proxy.ts). proxy.ts already has cookie-only pattern applied early. |
| 3–12 | ⬜ Pending | See `MASTER_EXECUTION_PLAN.md` §6. |

All 10 Open Questions in MEP §9 are ✅ RESOLVED. See `MASTER_EXECUTION_PLAN.md` §9 for decisions on Sanity hosting (Cloud), Stripe refunds (Dashboard for v1), mobile nav (Radix Dialog), test data (synthetic only), production cutover (feature-flag-gated).

---

## Discrepancy catalog (D1–D45)

45 discrepancies reconciled across source documents. Key ones for agents:

- **D15** — `@stillwater/source` custom condition (both `.npmrc` + `pnpm-workspace.yaml`)
- **D21** — `serverExternalPackages` moved to top-level
- **D23** — `next lint` deprecated → use `eslint .`
- **D36** — 2-layer auth pattern (cookie-only proxy.ts + Server Component layouts)
- **D43** — React Email v6 migration (import from `react-email` root)
- **D44** — TypeScript 6.0.3 → 5.9.0 in 9 sub-packages
- **D45** — ESLint v10 → v9 downgrade (plugin incompatibility)

Full catalog: `MASTER_EXECUTION_PLAN.md` §2.

---

## Pre-commit checklist

```bash
pnpm check-types       # Must be green (TS18003 "No inputs found" in empty src/ dirs is expected)
pnpm lint              # Must be green (2/2 tasks)
pnpm test              # Must be green (if tests exist for the phase)
```

Atomic commits: one TDD cycle (RED → GREEN → REFACTOR) = one commit. Conventional Commits format: `feat(bookings): add advisory lock for concurrent booking safety`.

---

## Canonical sources (read in this order)

1. `MASTER_EXECUTION_PLAN.md` — 13-phase plan + 45 discrepancies + 10 resolved questions
2. `PAD.md` — Project Architecture Document (31 sections, 9 ADRs)
3. `stillwater_SKILL.md` — distilled project skill (v1.3.0)
4. `CLAUDE.md` — full agent briefing (gotchas, troubleshooting, lessons learnt)
5. `scaffolding_files.md` — Phase 0 ready-to-paste configs
6. `react_email_suggestion.md` / `pnpm_install_fix.md` — ecosystem discovery docs

**The HTML mockup (`static_landing_page_mockup.html`) is for visual/aesthetic UI/UX guidance ONLY.** Do not copy its code directly — it has 7 accessibility bugs (D29–D35) and uses stale token names (`--sp-N`, `--dur-*`) that must be remapped to PAD tokens (`--space-N`, `--duration-*`) during the Phase 12 port.
