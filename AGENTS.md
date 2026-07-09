# AGENTS.md

> Compact instruction file for AI coding agents working in the Stillwater monorepo.
> Every line below is hard-earned context that an agent would likely get wrong without it.
> For the full project briefing, see [`CLAUDE.md`](./CLAUDE.md). For architecture, see [`PAD.md`](./PAD.md).
>
> **Updated:** 2026-07-09 (v2.2.0) — Phase 0–7 complete (499 tests). Phase 7 (Stripe) built: `@stillwater/payments` package (7 files, 43 tests), webhook route, all tRPC procedures unstubbed, ADR-010 accepted, 5 STRIPE tests passing. 5 new gotchas (58–62). Total: 62 gotchas.

---

## Stack (exact versions — do not drift)

| Layer | Version | Notes |
|---|---|---|
| Node.js | ≥ 22.0.0 | Required for native `fetch`, ESM stability |
| pnpm | **11.9.0** (`^11.0.0`) | pnpm 9.x is EOL. Root `package.json` `packageManager` field pins this. |
| TypeScript | **5.9.0** (`^5.9.0`) | Do NOT upgrade to 6.x. Required for `erasableSyntaxOnly` + `verbatimModuleSyntax`. |
| ESLint | **9.39.4** (`^9.39.4`) | Do NOT upgrade to v10. `eslint-plugin-react` and `eslint-plugin-import` have no v10 versions. |
| Next.js | 16.2.10 (`^16.2.10`) | App Router, Turbopack, React Compiler (`reactCompiler: true`) |
| React | 19.2.7 (`^19.2.7`) | CVE-2025-55182 floor — never downgrade below 19.2.3 |
| Tailwind CSS | 4.3.0 (`^4.3.0`) | CSS-first `@theme` in `globals.css`; no `tailwind.config.js` needed |
| tRPC | v11 (`^11.18.0`) | Server caller for RSC, React Query for client |
| Drizzle ORM | 0.45.0 (`^0.45.2`) | `neon-http` driver; `db.$count` requires ≥0.34 |
| PostgreSQL | 17 (Neon) | Two URLs: `DATABASE_URL` (pooled) + `DATABASE_URL_UNPOOLED` (migrations only) |
| Better Auth | 1.6.23 (`^1.6.23`) | Replaces Auth.js v5 (ADR-008). Drizzle adapter. |
| Trigger.dev | v4 platform, **root SDK import** | `import { defineConfig } from "@trigger.dev/sdk"` — NEVER use `/v3` (deprecated) or `/v4` (doesn't exist). See Gotcha 1. |
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
pnpm dev --filter=@stillwater/web          # Just web
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
ANALYZE=true pnpm build --filter=@stillwater/web  # Bundle analyzer

# Infrastructure
docker compose up -d           # Postgres 17 + Redis 7 + Adminer
docker compose ps              # Verify healthy
```

---

## Architecture (what's not obvious from filenames)

### Monorepo layout

```
apps/web/          → Next.js 16 (marketing + studio + admin route groups)
apps/studio/       → Sanity Studio config (✅ Phase 4 complete — 8 schemas + sanity.config.ts; runtime hosted at stillwater.sanity.studio per Q4 decision)
packages/api/      → tRPC routers (10 routers, 4 procedure tiers)
packages/db/       → Drizzle schema (17 tables: 14 domain + 3 Better Auth, 8 enums, 5 critical indexes)
packages/auth/     → Better Auth config (Google OAuth + Magic Link + customSession + 13×6 RBAC)
packages/email/    → React Email v6 + Resend (Phase 8 — currently placeholder; 13 templates + send.ts planned)
packages/payments/ → Stripe client + idempotent webhooks (✅ Phase 7 complete — 7 source files, 43 tests: client, types, subscriptions, webhooks, invoices, credit-packs, refunds)
packages/ui/       → Design tokens (CSS) + fonts (self-hosted Cormorant + DM Sans + JetBrains Mono) + Radix components
packages/config/   → t3-env Zod-validated env schema (34 vars)
services/workers/  → Trigger.dev v4 tasks (Phase 8 — currently placeholder; 11 jobs planned)
tooling/{eslint,typescript,tailwind}/  → Shared configs
infrastructure/postgres/init/  → Docker-entrypoint SQL (uuid-ossp + pgcrypto)
```

### `@stillwater/source` custom condition (D15)

Workspace packages resolve to `./src/index.ts` (source) instead of `./dist/index.js` (built). Declared in BOTH `.npmrc` (`custom-conditions=@stillwater/source`) AND `pnpm-workspace.yaml` (`customConditions: ['@stillwater/source']`). Without this, pnpm resolves `@stillwater/*` to non-existent `dist/` directories.

### 2-Layer Auth Pattern (ADR-009 — mandatory)

**NEVER call `auth.api.getSession()` inside `proxy.ts`.** It's too expensive for every request regardless of runtime (Edge or Node.js — Next.js 16 docs are inconsistent on the default). Use `getSessionCookie()` (cookie-only) instead.

- **Layer 1 — `apps/web/proxy.ts` (Edge or Node.js runtime):** Cookie-existence-only check via `getSessionCookie(request)` from `better-auth/cookies`. NO DB. NO RBAC. Fast redirect for unauthenticated.
- **Layer 2 — Server Component layouts (Node.js):** Full validation via `requireAuth()` / `requireRole(...roles)` in `(studio)/layout.tsx`, `(admin)/layout.tsx`, nested revenue/settings layouts.

### Database: two URLs, transaction-scoped locks

- `DATABASE_URL` — pooled (Neon PgBouncer) — all app queries
- `DATABASE_URL_UNPOOLED` — direct connection — migrations + seeding ONLY (PgBouncer breaks prepared statements)
- **Always use `pg_advisory_xact_lock()` (transaction-scoped), NEVER `pg_advisory_lock()` (session-scoped)** — session-scoped locks leak under Neon PgBouncer transaction pooling. Applies to booking flow AND Stripe webhook idempotency.

---

## Critical gotchas (agent will get these wrong without help)

### 1. Trigger.dev SDK import path

```typescript
// ✅ CORRECT — official Trigger.dev v4 import (root)
import { defineConfig } from "@trigger.dev/sdk";

// ❌ WRONG — /v3 is the deprecated v3-era pattern (still works but not recommended)
import { defineConfig } from "@trigger.dev/sdk/v3";

// ❌ WRONG — /v4 export does not exist
import { defineConfig } from "@trigger.dev/sdk/v4"; // Module not found
```

`@trigger.dev/sdk@4.5.0` exports both `.` (root) and `./v3` — both resolve to the same file. Official Trigger.dev v4 docs mandate: "ALWAYS import from `@trigger.dev/sdk`. NEVER import from `@trigger.dev/sdk/v3`." The root import is the v4 path.

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

v6 bundle is 1.8MB (514KB gzipped) — use Resend Native Templates for Trigger.dev workers (ADR-010 Accepted 2026-07-09).

### 4. TypeScript — stay on 5.9.0

`pnpm install` will say "6.0.3 is available". **Ignore it.** PAD §5.1 mandates `^5.9.0` for `erasableSyntaxOnly` (forbids `enum`, `namespace`, parameter properties) + `verbatimModuleSyntax` (requires `import type`). All 9 sub-packages must pin `^5.9.0`, not `^6.0.3`.

### 5. `proxy.ts` — don't call `auth.api.getSession()` regardless of runtime

Next.js 16 `proxy.ts` can run on Edge or Node.js runtime (official documentation is inconsistent on the default). Regardless of runtime, do NOT call `auth.api.getSession()` — it's too expensive for every request and breaks Next.js 16's caching model. Use `getSessionCookie()` (cookie-only) in proxy.ts; full validation in Server Component layouts via `requireAuth()` / `requireRole()` (ADR-009 2-layer auth pattern).

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

### 11. `reactCompiler: true` requires `babel-plugin-react-compiler`

`next.config.ts` has `reactCompiler: true`. This requires `babel-plugin-react-compiler` to be installed as a devDependency in `apps/web`. Without it, every page returns HTTP 500. Already installed as `^1.0.0` — do NOT remove it.

### 12. t3-env `createEnv()` — pass schema inline, not as variable

`t3-env` v0.13.11 requires `clientPrefix: 'NEXT_PUBLIC_'` and cannot infer generics from a separate variable. The schema must be passed inline to `createEnv()`. See `packages/config/src/env.ts` for the correct pattern.

### 13. Trigger.dev v4 — `machine` is string, `build.env` removed

```typescript
// ✅ CORRECT — v4
machine: "micro",
build: { external: ["@neondatabase/serverless"] },

// ❌ WRONG — v3 pattern (TS errors)
machine: { preset: "micro" },  // TS2322
build: { env: { ... } },       // TS2353 — build.env removed in v4
```

### 14. `--filter=@stillwater/web` (NOT `--filter=web`)

Turbo matches by package name. The package name is `@stillwater/web`, not `web`. All docs now use `--filter=@stillwater/web`.

### 15. Drizzle 0.45 column API — `.isUnique` not `.unique` (Phase 1)

Schema tests must assert `.isUnique` (boolean), not `.unique` (undefined). FK cascade behavior is verified via migration SQL, not column properties. See `CLAUDE.md` Gotcha 14.

### 16. Drizzle partial index `.where()` requires `sql` template (Phase 1)

```typescript
// ❌ WRONG — TS2353
index('idx').on(table.status).where({ status: 'scheduled' })
// ✅ CORRECT
import { sql } from 'drizzle-orm';
index('idx').on(table.status).where(sql`${table.status} = 'scheduled'`)
```

See `CLAUDE.md` Gotcha 15.

### 17. `packages/db` integration tests need Docker (Phase 1)

`pnpm test` runs 91 unit tests (no DB needed). Integration tests (`*.integration.test.ts`) are excluded by default — run via `pnpm test:integration` after `docker compose up -d`. See `CLAUDE.md` Gotcha 18.

### 18. Better Auth `magicLink` is a plugin — register on BOTH server + client (Phase 2)

Server: `import { magicLink } from 'better-auth/plugins/magic-link'`
Client: `import { magicLinkClient } from 'better-auth/client/plugins'` → `createAuthClient({ plugins: [magicLinkClient()] })`. Without the client plugin, `authClient.signIn.magicLink` is `undefined`. See `CLAUDE.md` Gotcha 19.

### 19. Better Auth `customSession` plugin — NOT `session.sessionData` (Phase 2)

MEP F2-01's `session.sessionData` API doesn't exist in v1.6.23. Use `customSession` from `better-auth/plugins/custom-session` to enrich session with `memberId` + `roles`. See `CLAUDE.md` Gotcha 20.

### 20. `import 'server-only'` throws in vitest — mock it (Phase 2)

Add `vi.mock('server-only', () => ({}))` at the top of any test file that imports a module with `import 'server-only'`. See `CLAUDE.md` Gotcha 24.

### 21. tRPC middleware must use `t.middleware()` factory (Phase 3)

Rate-limit middleware written as a raw function fails with "No result from middlewares". Use `middleware` from `trpc.ts` and call `next({ ctx })`. See `CLAUDE.md` Gotcha 25.

### 22. Zod v4 UUID validation is strict — use valid v4 format (Phase 3)

Test UUIDs must have version digit `4` and variant `8/9/a/b` in the 4th group. `11111111-1111-1111-1111-111111111111` is INVALID. Use `11111111-1111-4111-8111-111111111111`. See `CLAUDE.md` Gotcha 26.

### 23. `exactOptionalPropertyTypes` — spread-conditional for optional props (Phase 3)

Don't pass `undefined` to optional properties (e.g., tRPC `onError`). Use `...(cond ? { prop: fn } : {})` instead. See `CLAUDE.md` Gotcha 29.

### 24. Migration fails silently: `ALTER COLUMN ... SET DATA TYPE` without `USING`

**Symptom:** `pnpm db:migrate` exits with code 1 after "Using 'pg' driver for database querying" with no error message. drizzle-kit swallows the PostgreSQL error.

**Root cause:** Migration contains `ALTER TABLE "users" ALTER COLUMN "email_verified" SET DATA TYPE boolean;`. PostgreSQL cannot automatically cast `timestamp` → `boolean`. It requires a `USING` clause (e.g., `USING (email_verified IS NOT NULL)`). Without it, PG throws an error, but drizzle-kit 0.31.10 silently exits with code 1.

**Fix:** For fresh databases (no production data), delete old migrations and regenerate a single clean migration: `rm drizzle/migrations/*.sql`, then `pnpm db:generate`. The new migration will create the column with the correct type from scratch — no `ALTER COLUMN` needed. For databases with data, add a `USING` clause manually. See `suggested_fix.md` for full analysis.

### 25. Database driver: `pg` for local, `neon-http` for production

**Symptom:** `pnpm db:seed` fails with `NeonDbError: Error connecting to database: TypeError: fetch failed` — the `neon-http` driver cannot connect to local Docker Postgres.

**Root cause:** `packages/db/src/index.ts` unconditionally used `drizzle-orm/neon-http`, which makes HTTP requests to a Neon endpoint. Local Docker Postgres speaks TCP, not HTTP.

**Fix:** `packages/db/src/index.ts` now dynamically selects the driver: URLs containing `neon.tech` use `neon-http`; all others use `node-postgres` with `pg.Pool`. The `pg` package is in `dependencies` (not devDependencies) so it's available at runtime for local development. No consumer code changes needed — the `db` export is transparent.

### 26. Seed script must load `.env.local` before importing `db`

**Symptom:** Seed script fails with `SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string` — the `pg` Pool is initialized with a fallback connection string (no password) because `DATABASE_URL` wasn't set yet.

**Root cause:** The seed script imports `db` from `../index`, which reads `process.env['DATABASE_URL']` at import time. But `.env.local` isn't loaded until later.

**Fix:** `packages/db/src/seed/env.ts` loads `.env.local` via `dotenv` when `DATABASE_URL` is not set. Imported at the top of `seed/index.ts` before the `db` import. Works because ESM evaluates side-effect imports in order of appearance.

### 27. Turbopack ignores custom `exports` conditions — use `transpilePackages` (Critical — Phase 4)

`pnpm build` fails with `Can't resolve '@stillwater/auth'` even though `pnpm test` works. Turbopack's Rust resolver ignores `@stillwater/source` custom condition, falls through to `default: ./dist/index.js` (doesn't exist — `emitDeclarationOnly: true`). Fix: point `exports.default` to `./src/*.ts` in all 7 `packages/*/package.json` + add `transpilePackages` array to `next.config.ts`. See `CLAUDE.md` Gotcha 34.

### 28. shadcn v4 + `exactOptionalPropertyTypes` — `checked` prop (High — Phase 4)

`DropdownMenuCheckboxItem` fails typecheck: `CheckedState | undefined` not assignable to `CheckedState`. Fix: spread-conditional `{...(checked !== undefined ? { checked } : {})}`. See `CLAUDE.md` Gotcha 35.

### 29. `eslint-plugin-tailwindcss` v4.0.6 — `src/style.css` bug (Medium — Phase 4)

`pnpm lint` crashes: `ENOENT: no such file: 'src/style.css'`. Plugin ignores `cssFiles` setting. Fix: disable `tailwindcss/classnames-order` + `no-contradicting-classname` in `tooling/eslint/index.js`. See `CLAUDE.md` Gotcha 36.

### 30. `@vitest-environment jsdom` for React component tests (Medium — Phase 4)

`render()` from `@testing-library/react` fails: `ReferenceError: document is not defined`. Fix: add `// @vitest-environment jsdom` as FIRST line of `.tsx` test files. See `CLAUDE.md` Gotcha 37.

### 31. Drizzle 0.45 relational query types infer as `never` (Medium — Phase 4)

`db.query.X.findMany({ with: { ... } })` nested fields type as `never`. Fix: cast result `as unknown as ExpectedType[]`. Will be fixed in Drizzle 1.0+. See `CLAUDE.md` Gotcha 38.

### 32. Sanity slug is object with `.current` property (Low — Phase 4)

GROQ `slug == $slug` returns nothing. Sanity slug is `{ current: 'the-slug' }`, not a string. Fix: use `slug.current == $slug` in GROQ; `z.object({ current: z.string() })` in Zod. See `CLAUDE.md` Gotcha 39.

### 33. Zod v4 `z.string().email()` deprecated (Low — Phase 4)

ESLint: `email` is deprecated. Fix: use `z.email()` instead of `z.string().email()`. See `CLAUDE.md` Gotcha 40.

### 34. ESLint `import/order` — builtins before externals (Low — Phase 4)

`import { createHmac } from 'crypto'` must come before `import { describe } from 'vitest'`. Fix: reorder imports — builtins first, empty line between groups. See `CLAUDE.md` Gotcha 41.

### 35. SSE route must NOT set `force-dynamic` (Critical — Phase 5)

`pnpm build` fails on SSE route: `force-dynamic` conflicts with `cacheComponents`. SSE routes are dynamic by default — only set `maxDuration = 300`. See `CLAUDE.md` Gotcha 42.

### 36. `useSessionAvailability` hook cleanup is non-negotiable (High — Phase 5)

EventSource + reconnection timers MUST be cleaned up on unmount. Close EventSource, clear timers in `useEffect` return. Memory leaks if missing. See `CLAUDE.md` Gotcha 43.

### 37. `bookings.book` throws CONFLICT — UI catches and shows WaitlistButton (High — Phase 5)

`book` mutation does NOT auto-waitlist. UI catches CONFLICT error code, sets `isConflict` flag, shows `WaitlistButton`. `waitlist.join` called separately. See `CLAUDE.md` Gotcha 44.

### 38. `waitlist_entries` unique index on (sessionId, memberId) (High — Phase 5)

Without `idx_waitlist_session_member`, concurrent `waitlist.join` calls can both insert. Added unique index in migration `0002_lyrical_cargill.sql`. See `CLAUDE.md` Gotcha 45.

### 39. `@testing-library/react` cleanup between test files (Medium — Phase 5)

jsdom DOM leaks between test files in same vitest process. Add `afterEach(() => cleanup())` to every `.tsx` test file using `render()`. See `CLAUDE.md` Gotcha 46.

### 40. Radix Dialog `onOpenChange` void expression (Low — Phase 5)

`(isOpen) => !isOpen && onClose()` violates `no-confusing-void-expression`. Use block body: `(isOpen) => { if (!isOpen) onClose(); }`. See `CLAUDE.md` Gotcha 47.

### 41. `MessageEvent.data` is typed as `any` (Low — Phase 5)

`JSON.parse(event.data)` triggers `no-unsafe-argument`. Cast: `JSON.parse(String(event.data))`. See `CLAUDE.md` Gotcha 48.

### 42. Template literals with `number` type (Low — Phase 5)

`restrict-template-expressions` forbids `number` in template literals. Cast: `String(number)` — e.g. `` `${String(enrolled)} of ${String(capacity)}` ``. See `CLAUDE.md` Gotcha 49.

### 43. `/dashboard` redirect ghost — verify route exists before redirecting (Critical — Phase 6)

7 source files redirected to `/dashboard` but no route existed until Phase 6. Every authenticated user hit a 404. Always verify redirect targets exist. See `CLAUDE.md` Gotcha 50.

### 44. `react-hook-form` empty strings vs `undefined` in tRPC mutations (High — Phase 6)

`react-hook-form` returns `''` for empty inputs. `members.updateProfile` filters `undefined` but NOT empty strings. Strip `''` → `undefined` before passing to mutation. See `CLAUDE.md` Gotcha 51.

### 45. Disabled buttons with toast for Phase 7 stubs (Medium — Phase 6)

`memberships.pause/cancel/resume` throw `PRECONDITION_FAILED`. Use `disabled` buttons with `toast.info('Coming Phase 7')` — don't call the mutation. See `CLAUDE.md` Gotcha 52.

### 46. CSV `no-base-to-string` — `String(unknown)` triggers ESLint (Low — Phase 6)

`String(unknown)` triggers `@typescript-eslint/no-base-to-string`. Narrow with `typeof` checks before `String()`, else use `JSON.stringify()`. See `CLAUDE.md` Gotcha 53.

### 47. Dashboard components eslint override for Drizzle casts (Medium — Phase 6)

Drizzle relational query casts produce `unnecessary-condition` + `restrict-template-expressions` warnings. Add eslint override for `src/components/dashboard/**/*.tsx`. See `CLAUDE.md` Gotcha 54.

### 48. `memberships.getMySubscription` plan join — Drizzle `never` types (Medium — Phase 6)

`with: { plan: true }` returns nested types that infer as `never` (Drizzle 0.45 limitation). Cast to `SubscriptionWithPlan` type in dashboard page. See `CLAUDE.md` Gotcha 55.

### 49. Parallel data fetching with `Promise.all` — avoid waterfall (Medium — Phase 6)

Dashboard fetches profile + subscription + history. Use `Promise.all` for parallel fetching — total latency ≈ max(individual) instead of sum. See `CLAUDE.md` Gotcha 56.

### 50. `ProfileEditForm` with `react-hook-form` + `zodResolver` (Low — Phase 6)

Always pass `resolver: zodResolver(schema)` to `useForm` — without it, `handleSubmit` doesn't validate. See `CLAUDE.md` Gotcha 57.

### 51. Stripe `current_period_end` moved to `items.data[0]` (Critical — Phase 7)

Stripe Basil (2025-03-31) deprecated top-level `subscription.current_period_end`. In Dahlia (2026-06-24, SDK v22), access via `subscription.items.data[0].current_period_end`. See `CLAUDE.md` Gotcha 58.

### 52. `pg_advisory_xact_lock` key must be `BigInt()` not literal (Critical — Phase 7)

BigInt literals (`5381n`) require ES2020 target — web app tsconfig is below ES2020. Use `BigInt(5381)` constructor. Mask to 32 bits for single-argument variant. See `CLAUDE.md` Gotcha 59.

### 53. Stripe webhook body must be read as TEXT (Critical — Phase 7)

`stripe.webhooks.constructEvent()` computes HMAC over raw body. Using `await request.json()` re-serializes the body → signature mismatch. Use `await request.text()`. See `CLAUDE.md` Gotcha 60.

### 54. Drizzle `with: { plan: true }` infers as `never` in webhook handler (Medium — Phase 7)

Same as Gotcha 31/Lesson 46 — Drizzle 0.45 relational query types need `defineRelations()`. Cast query result to expected shape. See `CLAUDE.md` Gotcha 61.

### 55. `exactOptionalPropertyTypes` requires conditional spread (Medium — Phase 7)

`{ limit: input?.limit }` fails TS2379 when `limit` is `number | undefined`. Use `...(input?.limit !== undefined ? { limit: input.limit } : {})`. See `CLAUDE.md` Gotcha 62.

---

## Phase status (as of 2026-07-09)

| Phase | Status | Notes |
|---|---|---|
| 0 — Scaffold | ✅ Complete | All 10 D15–D24 patches applied. |
| 1 — DB Schema | ✅ Complete | 17 tables (14 domain + 3 Better Auth: session, account, verification), 8 enums, 5 critical indexes, migrations `0000_dear_dagger.sql` + `0001_equal_iron_lad.sql` + `0002_lyrical_cargill.sql` (waitlist unique). 109 db tests. |
| 2 — Auth | ✅ Complete | Better Auth + RBAC + 2-layer auth. 102 auth tests. |
| 3 — tRPC | ✅ Complete | 10 routers (~30 procedures), 4 access tiers, advisory lock booking, rate limiting, web integration. 113 api tests (was 107; +6 from Phase 7 unstubbing). |
| 4 — Marketing | ✅ Complete | Sanity CMS + 8 content types + Studio app, 8 ISR marketing pages, webhook→ISR with HMAC, Cloudflare Images signer, 11 shadcn components, `transpilePackages` build fix (ADR-011). |
| 5 — Booking | ✅ Complete | SSE endpoint (`/api/schedule/stream`, maxDuration=300, 10s polling), `useSessionAvailability` hook (3 reconnection attempts), 5 booking UI components (BookingButton, BookingConfirmation, BookingFlow, SeatAvailability, WaitlistButton), `(studio)/book/[sessionId]` page, `ScheduleGrid` with Book CTA, Toaster mounted, waitlist unique index. |
| 6 — Dashboard | ✅ Complete | Member dashboard (/dashboard, /profile, /membership, /history), 7 dashboard components, CSV export, memberships.resume stub (now unstubbed in Phase 7), plan join. |
| 7 — Stripe | ✅ Complete | `@stillwater/payments` package (7 files, 43 tests): client singleton (Dahlia API), 7-event types, 5 subscription helpers, idempotent webhook handler with `pg_advisory_xact_lock` (ADR-004), invoice pagination, credit-pack checkout, D12 refund wrapper. Stripe webhook route at `/api/webhooks/stripe` (body as TEXT, sig verify, 400/500/200). All tRPC procedures unstubbed: `memberships.subscribe/cancel/pause/resume` + `payments.getPortalUrl/getInvoices`. `payments.refund` retained as D12 stub. `CheckoutButton` component + `lib/stripe/utils.ts`. ADR-010 accepted. 5 STRIPE tests passing (STRIPE-001 through STRIPE-005). 43 payments tests + 14 new web tests (stripe utils + CheckoutButton). |

**Total: 499 tests** (109 db + 102 auth + 113 api + 43 payments + 132 web). `pnpm install` / `pnpm check-types` / `pnpm lint` / `pnpm test` / `pnpm build` all green.

| 8–12 | ⬜ Pending | See `MASTER_EXECUTION_PLAN.md` §6. |

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
pnpm check-types       # Must be green (9/9 tasks)
pnpm lint              # Must be green (2/2 tasks)
pnpm test              # Must be green (499 tests: 113 api + 102 auth + 109 db + 43 payments + 132 web).
pnpm build             # Must be green (13/13 static pages)
```

Integration tests (require Docker Postgres): `pnpm test:integration --filter=@stillwater/db`

Atomic commits: one TDD cycle (RED → GREEN → REFACTOR) = one commit. Conventional Commits format: `feat(bookings): add advisory lock for concurrent booking safety`.

---

## Canonical sources (read in this order)

1. `design.md` — requirement specifications + original architectural critique (some sections superseded by ADRs — warnings inline)
2. `static_landing_page_mockup.html` — visual + UI/UX aesthetics guidance ONLY (token VALUES come from SKILL §4.1 / PAD §11.4)
3. `stillwater_SKILL.md` — distilled project skill (v2.1.0; 21 source skills condensed; 65 lessons); authoritative tech-stack specifics
4. `PAD.md` — Project Architecture Document (31 sections, 11 ADRs; v1.10.0); culmination of the above into codebase architecture
5. `MASTER_EXECUTION_PLAN.md` — derived working copy for the coding agent (13-phase plan + 45 reconciled discrepancies D1–D45 + all 10 Open Questions resolved; v1.4.0)
6. `CLAUDE.md` — full agent briefing (gotchas, troubleshooting, lessons learnt — v2.1.0 with 57 gotchas)
7. `scaffolding_files.md` — Phase 0 ready-to-paste configs (**HISTORICAL**: Phase 0 complete; actual files on disk are canonical)
8. `react_email_suggestion.md` / `pnpm_install_fix.md` — ecosystem discovery docs

**The HTML mockup (`static_landing_page_mockup.html`) is for visual/aesthetic UI/UX guidance ONLY.** Do not copy its code directly — it has 7 accessibility bugs (D29–D35) and uses stale token names (`--sp-N`, `--dur-*`) that must be remapped to PAD tokens (`--space-N`, `--duration-*`) during the Phase 12 port.
