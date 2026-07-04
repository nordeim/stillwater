# Stillwater

[![Node.js](https://img.shields.io/badge/node-%E2%89%A522.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.15.4-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.40-C5F74F?logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![tRPC](https://img.shields.io/badge/tRPC-v11-2596BE?logo=trpc&logoColor=white)](https://trpc.io/)
[![License](https://img.shields.io/badge/license-Proprietary-lightgrey)](#license)
[![Status](https://img.shields.io/badge/status-Phase%200%20scaffold%20ready-clay)](#project-status)

> **A sanctuary for mindful movement.** An enterprise-grade yoga studio management platform — public marketing surface, member booking application, RBAC-gated admin, real-time seat availability via SSE, Stripe subscription billing, and Trigger.dev background jobs. Built with the calm intentionality of Japanese editorial design.

---

## Overview

Stillwater is the operational backbone and digital face of a boutique yoga studio in Southeast Portland. It serves three populations from one Turborepo monorepo: a **public audience** (schedule, instructors, pricing, blog — ISR-cached, Sanity-backed), **members** (booking, dashboard, membership management — auth-gated, real-time), and **studio operations** (RBAC-gated admin for staff/manager/owner).

The platform replaces a class of brittle brochure-site-plus-Stripe-link yoga websites with a SaaS-grade product: PostgreSQL advisory locks for double-booking prevention, idempotent Stripe webhook processing, an 11-job Trigger.dev background worker for emails and waitlist promotion, and WCAG 2.2 Level AAA accessibility for the 35–65 demographic the studio serves.

The architecture is documented in three layered sources: [`PAD.md`](./PAD.md) is the canonical Project Architecture Document with 7 ADRs; [`MASTER_EXECUTION_PLAN.md`](./MASTER_EXECUTION_PLAN.md) is the 13-phase TDD execution plan that reconciles 35 discrepancies between source documents; [`scaffolding_files.md`](./scaffolding_files.md) contains the ready-to-paste Phase 0 monorepo configuration.

---

## Key Features

| # | Feature                              | Description                                                                                            |
|---|--------------------------------------|--------------------------------------------------------------------------------------------------------|
| 🧘 | **Live class schedule**              | 7-day tab grid with real-time seat counts via Server-Sent Events                                       |
| 📅 | **Transactional booking**            | Double-booking prevented by PostgreSQL advisory locks; auto-waitlist when full                          |
| ⏳ | **Waitlist promotion**               | 2-hour offer window with cascading promotion when expired                                              |
| 💳 | **Stripe subscriptions**             | Full lifecycle: trialing → active → past_due → paused → cancelled; idempotent webhook handler           |
| 📦 | **Class credit packs**               | One-off PaymentIntent purchases for non-subscription members                                           |
| 🔐 | **Better Auth + RBAC**               | Google OAuth + Magic Link; 6 roles × 13 permissions matrix enforced at edge via `proxy.ts`             |
| ✉️ | **11 background jobs**               | Trigger.dev v3 tasks for confirmations, reminders, waitlist, digest, attendance — all retried & durable |
| 📝 | **Sanity marketing CMS**             | Webhook-triggered ISR; editors publish without deploys                                                 |
| ♿ | **WCAG 2.2 Level AAA**               | 7:1 contrast, full keyboard nav, screen-reader semantics, reduced-motion respect                       |
| 🎨 | **"Editorial Calm" design system**   | Warm Mineral palette (stone/clay/water/sand), Cormorant Garamond + DM Sans + JetBrains Mono, sharp edges |
| 📊 | **Observability stack**              | Sentry errors, PostHog analytics (17 events), Axiom logs, Checkly synthetics                           |
| ⚡ | **Edge ISR + Turbopack**             | Marketing pages < 80kb gzipped; LCP < 1.5s; Lighthouse A11y = 100                                       |

---

## Architecture

### Tech Stack

| Layer            | Technology                  | Version     | Purpose                                                        |
|------------------|-----------------------------|-------------|----------------------------------------------------------------|
| Frontend         | Next.js                     | 16.x        | App Router, Turbopack, React Compiler, `proxy.ts`              |
| UI Library       | React                       | 19.x        | Server Components by default, Client Islands for interactivity |
| Styling          | Tailwind CSS                | v4.x        | CSS-first `@theme` directive, no `tailwind.config.js` required |
| Component Lib    | Radix UI + shadcn/ui        | latest      | Accessible primitives; never rebuild what Radix provides       |
| Language         | TypeScript                  | 5.7+        | Strict mode + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` |
| API Layer        | tRPC                        | v11         | End-to-end type safety; server caller for RSC, React Query for client |
| ORM              | Drizzle ORM                 | 0.40.1      | Schema in TypeScript, no codegen, advisory lock support        |
| Database         | PostgreSQL                  | 17          | 14 tables, 8 enums, 5 critical indexes (incl. partial + unique)|
| DB Host          | Neon                        | latest      | Serverless PG with branching for preview envs                  |
| Cache / Rate Limit | Upstash Redis             | latest      | Per-procedure rate limiting on auth + booking mutations        |
| Auth             | Better Auth                 | 1.2+        | Replaces Auth.js v5 (Sept 2025 maintenance handover)           |
| Background Jobs  | Trigger.dev                 | v3          | 11 durable tasks with retries + cron schedules                 |
| Monorepo         | Turborepo                   | 2.3+        | Task graph + remote caching                                     |
| Package Manager  | pnpm                        | 9.15.4      | Workspace protocol; `customConditions` for source linking      |
| CMS              | Sanity                      | v3          | Marketing content only; operational data stays in PostgreSQL   |
| Payments         | Stripe                      | 17.x        | Subscriptions + credit packs + customer portal + idempotent webhooks |
| Email Templates  | React Email                | latest      | 13 templates, single-column 600px, CAN-SPAM compliant          |
| Email Delivery   | Resend                      | 4.x         | 2,400 emails/day free tier                                     |
| Observability    | Sentry + PostHog + Axiom + Checkly | latest | Errors, product analytics, structured logs, uptime synthetics  |
| Deployment       | Vercel + Neon               | latest      | Preview deploys per PR; production on `main` merge             |
| Testing          | Vitest + Playwright         | latest      | TDD mandatory; 90% coverage on `packages/api/routers/*`        |

### Architectural Principles

1. **TypeScript strict, no `any`** — use `unknown` and narrow
2. **Library discipline** — if Radix/shadcn provides a primitive, use it; never rebuild
3. **Zod at every boundary** — tRPC inputs, env vars (t3-env), webhook payloads, forms
4. **Advisory locks for concurrency** — `pg_advisory_xact_lock()` for booking (ADR-004)
5. **Idempotent webhooks** — `payment_events.stripe_event_id` UNIQUE INDEX + advisory lock
6. **Side effects in background jobs** — emails/notifications never run synchronously in API routes
7. **Editorial Calm design** — anti-generic enforcement: no purple gradients, no Inter-only, no drop shadows
8. **WCAG 2.2 Level AAA** — 7:1 contrast, full keyboard nav, reduced-motion globally respected
9. **ISR for marketing, SSR for personalised, CSR for real-time** — per-route rendering strategy (see `PAD.md` §12)
10. **Self-hosted fonts** — zero FOUT, zero third-party font CDN in production

### High-Level Architecture

```mermaid
flowchart TB
    subgraph "Client"
        Browser[Browser / Mobile]
    end

    subgraph "Vercel Edge"
        Proxy[proxy.ts<br/>Auth + RBAC]
    end

    subgraph "Next.js 16 App apps/web"
        Marketing["(marketing)<br/>ISR pages"]
        Studio["(studio)<br/>SSR auth-gated"]
        Admin["(admin)<br/>SSR RBAC-gated"]
        TRPC["/api/trpc<br/>tRPC handler"]
        SSE["/api/schedule/stream<br/>SSE endpoint"]
        Webhooks["/api/webhooks/<br/>stripe + sanity"]
    end

    subgraph "Packages"
        API["@stillwater/api<br/>10 routers"]
        DB["@stillwater/db<br/>Drizzle + schema"]
        Auth["@stillwater/auth<br/>Better Auth"]
        UI["@stillwater/ui<br/>Radix + tokens"]
        Pay["@stillwater/payments<br/>Stripe"]
        Email["@stillwater/email<br/>React Email"]
        Config["@stillwater/config<br/>t3-env"]
    end

    subgraph "External Services"
        Neon[(Neon PostgreSQL 17)]
        Upstash[(Upstash Redis)]
        Sanity[Sanity CMS]
        Stripe[Stripe Billing]
        Resend[Resend Email]
        Trigger[Trigger.dev v3]
        Cloudflare[Cloudflare Images + R2]
    end

    subgraph "Trigger.dev Workers"
        Workers["services/workers<br/>11 background tasks"]
    end

    Browser --> Proxy
    Proxy --> Marketing & Studio & Admin
    Marketing --> TRPC
    Studio --> TRPC
    Admin --> TRPC
    Marketing -.SSE.-> SSE
    Studio -.SSE.-> SSE
    Webhooks --> Pay & Sanity
    API --> DB & Auth & Pay
    DB --> Neon
    API --> Upstash
    Workers --> DB & Email & Trigger
    Email --> Resend
    Marketing --> Sanity
    Pay --> Stripe
    Marketing --> Cloudflare
```

---

## File Hierarchy

```
stillwater/
├── 📂 apps/
│   ├── 📂 web/                          # Next.js 16 application
│   │   ├── 📂 src/app/
│   │   │   ├── 📂 (marketing)/          # Public routes — ISR
│   │   │   ├── 📂 (studio)/             # Member routes — SSR auth-gated
│   │   │   ├── 📂 (admin)/              # Staff/Manager/Owner routes — SSR RBAC
│   │   │   ├── 📂 api/                  # tRPC + webhooks + SSE
│   │   │   ├── 📄 layout.tsx            # Root layout: fonts, providers, analytics
│   │   │   └── 📄 globals.css           # Tailwind v4 @theme + token imports
│   │   ├── 📂 src/components/           # App-specific components
│   │   ├── 📂 src/lib/                  # trpc, auth, sanity, utils
│   │   ├── 📄 proxy.ts                  # Next.js 16 middleware (auth + RBAC + i18n)
│   │   ├── 📄 next.config.ts            # React Compiler + Turbopack + CSP headers
│   │   └── 📄 components.json           # shadcn/ui config
│   └── 📂 studio/                       # Sanity Studio (separate deploy)
│
├── 📂 packages/                         # Shared libraries
│   ├── 📂 ui/                           # Radix-based components + design tokens
│   ├── 📂 db/                           # Drizzle schema + migrations + seed
│   ├── 📂 api/                          # tRPC routers (10) + middleware
│   ├── 📂 auth/                         # Better Auth config + RBAC matrix
│   ├── 📂 email/                        # 13 React Email templates + Resend
│   ├── 📂 payments/                     # Stripe client + idempotent webhooks
│   └── 📂 config/                       # t3-env Zod-validated env schema
│
├── 📂 services/
│   └── 📂 workers/                      # Trigger.dev v3 background jobs (11 tasks)
│
├── 📂 tooling/                          # Shared configs
│   ├── 📂 eslint/                       # ESLint v9 flat config
│   ├── 📂 typescript/                   # base/nextjs/library presets
│   └── 📂 tailwind/                     # Tailwind v4 base tokens
│
├── 📂 infrastructure/postgres/init/     # Docker entrypoint SQL
├── 📂 .github/workflows/                # CI + deploy pipelines
├── 📄 docker-compose.yml                # Postgres 17 + Redis 7 + Adminer
├── 📄 turbo.json                        # Task graph + caching
├── 📄 pnpm-workspace.yaml               # Workspace + customConditions
├── 📄 .env.example                      # 25 env vars documented
├── 📄 PAD.md                            # Project Architecture Document (canonical)
├── 📄 MASTER_EXECUTION_PLAN.md          # 13-phase TDD execution plan
├── 📄 scaffolding_files.md              # Phase 0 ready-to-paste configs
├── 📄 design.md                         # Architecture critique + merge rationale
└── 📄 static_landing_page_html_mockup.md # Landing page spec + HTML mockup
```

---

## Quick Start

### Prerequisites

- **Node.js ≥ 22.0.0** (LTS recommended)
- **pnpm ≥ 9.0.0** (`npm install -g pnpm@9.15.4`)
- **Docker + Docker Compose** (for local Postgres + Redis)
- **Git**

### Steps

```bash
# 1. Clone
git clone https://github.com/nordeim/stillwater.git
cd stillwater

# 2. Install dependencies (uses workspace protocol + @stillwater/source custom condition)
pnpm install

# 3. Copy environment template and fill in values
cp .env.example .env.local
# Edit .env.local — at minimum:
#   - Generate BETTER_AUTH_SECRET: openssl rand -base64 32
#   - Set Google OAuth credentials (or skip if testing magic link only)
#   - Set DATABASE_URL password to match docker-compose (stillwater_local_dev)

# 4. Start local Postgres 17 + Redis 7 + Adminer
docker compose up -d

# 5. Run database migrations (uses DATABASE_URL_UNPOOLED)
pnpm db:migrate

# 6. Seed development data (5 demo members, 3 instructors, 4 classes, 7 sessions)
pnpm db:seed

# 7. Start all apps in dev mode (Next.js on :3000, Trigger.dev worker)
pnpm dev
```

### Verify Setup

```bash
# Web app responds
curl http://localhost:3000
# Expected: 200 OK with "Stillwater" in body

# Postgres is healthy
docker compose ps postgres
# Expected: "healthy" status

# Database has seed data
docker compose exec postgres psql -U stillwater -d stillwater_dev -c "SELECT count(*) FROM users;"
# Expected: 5

# Adminer GUI available
open http://localhost:8080
# Login: server=postgres, user=stillwater, db=stillwater_dev, pass=stillwater_local_dev

# Type checking passes
pnpm check-types
# Expected: green

# Lint passes
pnpm lint
# Expected: green
```

---

## Environment Variables

All 25 env vars are documented in [`.env.example`](./.env.example). Critical ones grouped by purpose:

### Application
| Variable                  | Purpose                                  | Example                          |
|---------------------------|------------------------------------------|----------------------------------|
| `NODE_ENV`                | Environment                              | `development`                    |
| `NEXT_PUBLIC_APP_URL`     | Public app URL (used for OAuth callbacks)| `http://localhost:3000`          |

### Database (Neon PostgreSQL)
| Variable                    | Purpose                                                  |
|-----------------------------|----------------------------------------------------------|
| `DATABASE_URL`              | Pooled connection (Neon PgBouncer) — all app queries     |
| `DATABASE_URL_UNPOOLED`     | Direct connection — migrations + seeding only            |

### Authentication (Better Auth)
| Variable                   | Purpose                                  |
|----------------------------|------------------------------------------|
| `BETTER_AUTH_SECRET`       | Session cookie signing (min 32 chars)    |
| `BETTER_AUTH_URL`          | Auth callback base URL                   |
| `GOOGLE_CLIENT_ID`         | Google OAuth client ID                   |
| `GOOGLE_CLIENT_SECRET`     | Google OAuth client secret               |

### Stripe
| Variable                              | Purpose                          |
|---------------------------------------|----------------------------------|
| `STRIPE_SECRET_KEY`                   | Server-side Stripe API key       |
| `STRIPE_WEBHOOK_SECRET`               | Webhook signature verification   |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`  | Client-side Stripe key           |

### Sanity CMS
| Variable                            | Purpose                                  |
|-------------------------------------|------------------------------------------|
| `NEXT_PUBLIC_SANITY_PROJECT_ID`     | Sanity project ID                        |
| `NEXT_PUBLIC_SANITY_DATASET`        | Dataset name (`production` / `development`) |
| `SANITY_API_TOKEN`                  | Server-side read token (never expose)    |
| `SANITY_WEBHOOK_SECRET`             | Webhook HMAC verification                |

### Email + Jobs + Cache
| Variable                     | Purpose                                  |
|------------------------------|------------------------------------------|
| `RESEND_API_KEY`             | Resend email delivery                    |
| `EMAIL_FROM`                 | From address (e.g. `hello@stillwater.studio`) |
| `TRIGGER_SECRET_KEY`         | Trigger.dev Cloud auth                   |
| `UPSTASH_REDIS_REST_URL`     | Redis for rate limiting + idempotency    |
| `UPSTASH_REDIS_REST_TOKEN`   | Redis auth token                         |

### Observability + Storage
| Variable                                | Purpose                          |
|-----------------------------------------|----------------------------------|
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Error tracking                   |
| `SENTRY_AUTH_TOKEN`                     | Source map uploads (CI only)     |
| `NEXT_PUBLIC_POSTHOG_KEY` / `_HOST`     | Product analytics                |
| `AXIOM_TOKEN` / `AXIOM_DATASET`         | Structured logs                  |
| `CLOUDFLARE_ACCOUNT_ID`                 | Images + R2 storage              |
| `CLOUDFLARE_R2_*`                       | R2 credentials + bucket          |
| `NEXT_PUBLIC_CLOUDFLARE_IMAGES_URL`     | Image CDN base URL               |

> **CI/CD only** (do not set locally): `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `NEON_API_KEY`, `NEON_PROJECT_ID`

---

## Testing

TDD is mandatory for all business logic (Red → Green → Refactor → Commit, one cycle per atomic commit). Pure CSS/layout changes are exempt.

### Commands

```bash
# Unit + integration tests (Vitest)
pnpm test                           # All packages
pnpm test --filter=@stillwater/api  # Single package
pnpm test:watch                     # Watch mode
pnpm test:coverage                  # With V8 coverage report

# E2E tests (Playwright)
pnpm test:e2e                       # All browsers (chromium, firefox, webkit)
pnpm test:e2e --ui                  # Interactive mode
pnpm test:e2e -- --grep "booking"   # Filter by name

# Type checking + linting
pnpm check-types                    # TypeScript across all packages
pnpm lint                           # ESLint across all packages
pnpm lint:fix                       # Auto-fix
pnpm format                         # Prettier write
pnpm format:check                   # Prettier verify
```

### Coverage Targets

| Package                          | Target | Priority Areas                                |
|----------------------------------|--------|-----------------------------------------------|
| `packages/api/routers/*`         | 90%    | Booking logic, waitlist, credit consumption   |
| `packages/payments/*`            | 95%    | Subscription state machine, webhook handlers  |
| `packages/db/schema/*`           | 80%    | Constraints, relationships                    |
| `apps/web/components/*`          | 70%    | Interaction behavior, state transitions       |
| `services/workers/*`             | 85%    | Job execution, error paths                    |

### Test Pyramid

- **~300 unit tests** — pure business logic, factory-pattern test data
- **~80 integration tests** — Vitest + Testcontainers Postgres for full transaction flows
- **~20 E2E tests** — Playwright covering critical user journeys (signup → book → waitlist → cancel)
- **Visual regression** — Playwright + Percy, weekly on UI package changes
- **A11y automated** — `@axe-core/playwright` + Lighthouse Accessibility (target: 100)

### CI Pipeline (8 gates, all must pass)

1. `pnpm turbo check-types`
2. `pnpm turbo lint`
3. `pnpm turbo test --coverage`
4. `pnpm turbo build`
5. `pnpm turbo test:e2e`
6. `pnpm lighthouse ci`
7. `pnpm bundle-size`
8. `pnpm audit --audit-level=high`

---

## API Reference

tRPC exposes 10 routers merged in `packages/api/src/root.ts`. The full type is inferred by the React client (no codegen).

| Router          | Procedures                                                                                   | Access     |
|-----------------|----------------------------------------------------------------------------------------------|------------|
| `schedule`      | `getWeek`, `getSession`                                                                      | public     |
| `classes`       | `list`, `getBySlug`, `create`, `update`, `delete`                                            | public + staff |
| `sessions`      | `listByDateRange`, `create`, `update`, `cancel`, `checkIn`                                   | public + staff |
| `bookings`      | `book` ⚠️, `cancel` ⚠️, `checkIn`                                                            | protected + staff |
| `waitlist`      | `join`, `leave`, `claimOffer`, `getMyPosition`                                               | protected  |
| `members`       | `getProfile`, `updateProfile`, `getHistory`, `list`                                          | protected + staff |
| `instructors`   | `list`, `getBySlug`, `create`, `update`                                                      | public + staff |
| `memberships`   | `getPlans`, `subscribe` ⚠️, `cancel`, `pause`, `resume`, `getMySubscription`                 | public + protected |
| `payments`      | `getPortalUrl`, `getInvoices`, `refund` ⚠️                                                   | protected + staff |
| `admin`         | `getDashboard`, `getRevenue`, `getClassRoster`, `getAttendanceStats`                         | staff + manager |

> ⚠️ = mutation with side effects (email, credit consumption, or external API call). All mutations are rate-limited via Upstash Redis.

### Other HTTP Endpoints

| Endpoint                            | Method | Purpose                                  |
|-------------------------------------|--------|------------------------------------------|
| `/api/auth/[...all]`                | GET/POST | Better Auth handler (sign-in, callback) |
| `/api/trpc/[trpc]`                  | GET/POST | tRPC HTTP batch endpoint                |
| `/api/schedule/stream?sessionId=`   | GET    | SSE for live seat availability           |
| `/api/webhooks/stripe`              | POST   | Stripe webhook (signature-verified)      |
| `/api/webhooks/sanity`              | POST   | Sanity publish → `revalidatePath`        |

---

## Design System

The "Stillwater" identity follows an **Editorial Calm** direction inspired by Kinfolk magazine and Japanese *ma* (negative space as active presence).

### Color Palette — "Warm Mineral"

| Token              | Hex       | Usage                                |
|--------------------|-----------|--------------------------------------|
| `--color-stone-950`| `#0F0D0B` | Deepest shadow                       |
| `--color-stone-900`| `#1C1915` | Primary text (near-black warm)       |
| `--color-stone-400`| `#8C7B6E` | Secondary text                       |
| `--color-stone-50` | `#F5F0E8` | Page background (warm white = `--color-sand`) |
| `--color-clay-400` | `#C4856A` | Primary CTA (terracotta)             |
| `--color-clay-500` | `#9E5E44` | Hover state                          |
| `--color-water-500`| `#7B9EA8` | Accent (muted teal)                  |
| `--color-sand-warm`| `#EDE5D8` | Card surface                         |
| `--color-success`  | `#4A7C59` | Muted forest green                   |
| `--color-error`    | `#B85450` | Muted red-clay                       |

> ❌ **Banned**: purple/sage wellness palette, drop shadows, generic teal CTAs. ✅ **Required**: rule lines + whitespace as depth signals, asymmetric editorial grid breaks.

### Typography (Self-Hosted)

| Font                | Usage            | Fallback                       |
|---------------------|------------------|--------------------------------|
| Cormorant Garamond  | Display / headings | Georgia, serif               |
| DM Sans             | Body             | system-ui, sans-serif          |
| JetBrains Mono       | Data / admin     | ui-monospace, SFMono-Regular   |

Type scale uses 9 fluid `clamp()` tokens (e.g., `--text-display-2xl: clamp(3.5rem, 8vw, 7rem)`).

### Motion

| Token                  | Value                              | Usage                |
|------------------------|------------------------------------|----------------------|
| `--ease-gentle`        | `cubic-bezier(0.16, 1, 0.3, 1)`    | Snappy settle (expo out) |
| `--ease-breathe`       | `cubic-bezier(0.45, 0, 0.55, 1)`   | Organic (sine in-out)   |
| `--duration-quick`     | `150ms`                            | Hover states         |
| `--duration-standard`  | `300ms`                            | Transitions          |
| `--duration-slow`      | `600ms`                            | Page reveals         |

`prefers-reduced-motion` zeroes all durations to 0.01ms globally.

---

## Deployment

### Production Architecture

```mermaid
flowchart LR
    User[User] --> Vercel[Vercel Edge Network]
    Vercel --> NextJS[Next.js 16 Serverless]
    NextJS --> Neon[(Neon PG 17\nPooled)]
    NextJS --> Upstash[(Upstash Redis)]
    NextJS --> Sanity[Sanity Cloud]
    NextJS --> Stripe[Stripe API]
    Trigger[Trigger.dev Cloud] --> Neon
    Trigger --> Resend[Resend Email]
    Stripe -.webhooks.-> NextJS
    Sanity -.webhooks.-> NextJS
    NextJS --> Cloudflare[Cloudflare Images/R2]
    Sentry[Sentry] & PostHog[PostHog] & Axiom[Axiom] & Checkly[Checkly] -.telemetry.-> NextJS
```

### Environments

| Environment | Branch     | Database           | URL                              |
|-------------|------------|--------------------|----------------------------------|
| development | any        | docker-compose PG  | `http://localhost:3000`          |
| preview     | PR branch  | Neon PR branch     | `https://stillwater-pr-<n>.vercel.app` |
| staging     | `develop`  | Neon staging       | `https://staging.stillwater.studio` |
| production  | `main`     | Neon production    | `https://stillwater.studio`      |

### Deploy Commands

```bash
# Preview deploy (automatic on PR open)
# — Vercel GitHub integration handles this

# Production deploy (automatic on `main` merge)
# — .github/workflows/deploy-production.yml runs:
#    1. pnpm db:migrate (against production Neon)
#    2. vercel deploy --prod
#    3. pnpm playwright test --project=smoke
#    4. Slack notification

# Manual Trigger.dev jobs deploy
pnpm jobs:deploy

# Database migration (local pre-prod check)
pnpm db:generate   # Generate SQL from schema diff
pnpm db:migrate    # Apply to current DATABASE_URL_UNPOOLED
```

### Scaling Considerations

- **Database**: Neon read replica for admin revenue reports (PAD §22.4); PgBouncer connection pooling (max 10 per serverless instance)
- **Real-time**: SSE scales on Vercel Serverless via HTTP/2 multiplexing (ADR-006); 10s polling interval keeps function warm
- **Background jobs**: Trigger.dev `micro` machine preset (0.25 vCPU, 256MB) sufficient for email + DB ops; upgrade per-task for heavy work
- **Images**: Cloudflare Images handles AVIF/WebP conversion + responsive srcset; R2 for original storage (zero egress cost)
- **Cache**: Marketing pages ISR 1 hour; schedule ISR 5 min; blog SSG + on-demand revalidation via Sanity webhook

---

## Security & Compliance

| Layer              | Control                                                       |
|--------------------|---------------------------------------------------------------|
| Auth               | Better Auth encrypted session cookie; Google + Magic Link     |
| RBAC               | 6 roles × 13 permissions; enforced at edge (`proxy.ts`) + per-procedure |
| API                | Zod input validation on every tRPC procedure; rate limiting on auth + booking |
| Webhooks           | Stripe signature verification; HMAC for Sanity; idempotent via UNIQUE INDEX + advisory lock |
| Headers            | Strict CSP, HSTS preload, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` |
| Secrets            | t3-env Zod-validated; server vs client prefix enforced        |
| PII                | Sentry session replay masks booking endpoints; no PII in logs |
| Accessibility      | WCAG 2.2 Level AAA target (7:1 contrast, full keyboard nav)   |
| Audit              | All admin mutations logged to `audit_log` table               |
| Secrets rotation   | Stripe keys annually; auth secret on infra change; Sanity + Resend annually |

---

## Project Status

| Phase | Focus                                              | Status      | Est. Days |
|-------|----------------------------------------------------|-------------|-----------|
| 0     | Monorepo scaffold + tooling + Docker + fixes       | 🟡 Plan ready | 2       |
| 1     | DB schema, Drizzle migrations, seed data           | ⬜ Pending  | 3         |
| 2     | Better Auth + RBAC + `proxy.ts`                    | ⬜ Pending  | 3         |
| 3     | tRPC v11 routers (10 routers, ~30 procedures)      | ⬜ Pending  | 5         |
| 4     | Marketing surface with Sanity CMS                  | ⬜ Pending  | 4         |
| 5     | Booking flow + SSE real-time seats                 | ⬜ Pending  | 5         |
| 6     | Member dashboard + membership management           | ⬜ Pending  | 4         |
| 7     | Stripe integration (subscriptions + credit packs)  | ⬜ Pending  | 4         |
| 8     | Background jobs (11 Trigger.dev tasks)             | ⬜ Pending  | 3         |
| 9     | Admin surface (RBAC-gated)                         | ⬜ Pending  | 5         |
| 10    | Observability + performance hardening              | ⬜ Pending  | 3         |
| 11    | WCAG AAA audit + SEO + OG images                   | ⬜ Pending  | 3         |
| 12    | Landing page port (mockup → production Next.js)    | ⬜ Pending  | 4         |
| **Total** |                                                | **0% complete** | **~48 days** |

> See [`MASTER_EXECUTION_PLAN.md`](./MASTER_EXECUTION_PLAN.md) for the full 256-file inventory, per-file TDD checklists, and 35 reconciled discrepancies between source documents.

---

## Troubleshooting

| Issue                                                        | Solution                                                                                          |
|--------------------------------------------------------------|---------------------------------------------------------------------------------------------------|
| `pnpm install` warns about `@stillwater/source` condition    | Ensure `.npmrc` contains `custom-conditions=@stillwater/source` (Phase 0 patch D15)              |
| `docker compose up` fails on `./infrastructure/postgres/init`| Create the directory + `00-create-extensions.sql` per Phase 0 file F0-05                          |
| `pnpm db:migrate` errors with "DATABASE_URL_UNPOOLED missing"| `.env.local` must define `DATABASE_URL_UNPOOLED` (not just `DATABASE_URL`) — migrations use direct connection |
| `next lint` deprecated warning in Next.js 16                 | Use `eslint .` instead — `apps/web/package.json` `lint` script updated in Phase 0 patch D23      |
| `experimental.serverComponentsExternalPackages` ignored       | Moved to top-level `serverExternalPackages` in Next.js 16 (Phase 0 patch D21)                    |
| Stripe webhook returns 400 "Invalid signature"               | Verify `STRIPE_WEBHOOK_SECRET` matches `whsec_...` from Stripe Dashboard; use `stripe listen --forward-to localhost:3000/api/webhooks/stripe` for local testing |
| Better Auth Google OAuth redirect_uri mismatch               | Add `https://stillwater-pr-<n>.vercel.app/api/auth/callback/google` to Google Console authorized redirect URIs for preview envs |
| SSE endpoint returns 504 on Vercel                            | SSE is `runtime = 'nodejs'` + `dynamic = 'force-dynamic'`; verify Vercel function timeout ≥ 25s   |
| `proxy.ts` not running                                        | Verify `config.matcher` excludes `_next/static`, `_next/image`, and asset extensions — see `apps/web/proxy.ts` |
| Tailwind v4 classes not applying                              | Verify `globals.css` imports `@stillwater/ui/globals` BEFORE `tailwindcss`; `@theme` block maps every token |

---

## Contributing

### TDD Flow (mandatory for all business logic)

```
RED       → Write a failing test that describes the intended behaviour
GREEN     → Write the minimum code required to make the test pass
REFACTOR  → Clean up without changing behaviour
COMMIT    → Atomic commit: "<type>(<scope>): <subject>"
```

### Framework-Specific Conventions

| Framework        | Convention                                                                                  |
|------------------|---------------------------------------------------------------------------------------------|
| Next.js 16       | `proxy.ts` replaces `middleware.ts` (exported function must be named `proxy`)               |
| React 19         | No `forwardRef` (use `ref` prop directly); React Compiler enabled (`reactCompiler: true`)   |
| Tailwind v4      | CSS-first config via `@theme` directive; `tailwind.config.ts` only for content paths + plugins |
| TypeScript       | `strict: true` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`; no `any` (use `unknown`) |
| Drizzle ORM      | Schema in TypeScript (no `.prisma` file); `drizzle-kit generate` then `migrate`             |
| tRPC v11         | Server Components use server caller (zero HTTP); Client Components use React Query adapter  |
| Better Auth      | Session enriched with `memberId` + `roles` via `session.sessionData` callback               |

### Branching Strategy

```
main         ← Production. Protected. Requires PR + all CI gates + 1 reviewer.
develop      ← Staging. Integration branch.
feature/*    ← Feature branches. Branch from develop. PR → develop.
fix/*        ← Bug fixes.
hotfix/*     ← Emergency fixes. Branch from main. PR → main + backport.
```

### Conventional Commits

```
feat(bookings): add advisory lock for concurrent booking safety
fix(stripe): handle duplicate webhook events idempotently
docs(pad): add ADR-008 Better Auth migration
chore(deps): bump next to 16.0.1
test(api): add BOOK-006 concurrent booking regression
```

### Pull Request Checklist

Every PR must complete the [Architecture Validation Checklist](./.github/PULL_REQUEST_TEMPLATE.md):
- **Security**: Correct procedure access level, Zod validation, no client-side secrets
- **Data**: NOT NULL constraints, indexes added, reversible migration
- **Performance**: No N+1 queries, follows rendering strategy, image dimensions explicit
- **Reliability**: Side effects in background jobs, webhooks idempotent
- **Accessibility**: Component a11y tests, 7:1 contrast, keyboard nav tested
- **Documentation**: PAD updated, ADR added if significant, `.env.example` updated

---

## What's New

### v1.0.0 (2026-07-04) — Initial Plan Release

| Change                                          | Source Document              |
|-------------------------------------------------|------------------------------|
| Phase 0 monorepo scaffold (39 files)            | `scaffolding_files.md`       |
| 13-phase TDD execution plan (256 files)         | `MASTER_EXECUTION_PLAN.md`   |
| 35 source discrepancies reconciled              | `MASTER_EXECUTION_PLAN.md` §2|
| ADR-008: Better Auth supersedes Auth.js v5      | `MASTER_EXECUTION_PLAN.md`   |
| ADR-009: `proxy.ts` replaces `middleware.ts`    | `MASTER_EXECUTION_PLAN.md`   |
| 7 existing ADRs preserved from PAD              | `PAD.md` §23                 |

---

## License

Proprietary. © 2025 Stillwater Yoga Studio LLC — Portland, Oregon. All rights reserved.

---

## Additional Documentation

| Document                                  | Purpose                                                              |
|-------------------------------------------|----------------------------------------------------------------------|
| [`PAD.md`](./PAD.md)                      | Canonical Project Architecture Document (31 sections, 7 ADRs)        |
| [`MASTER_EXECUTION_PLAN.md`](./MASTER_EXECUTION_PLAN.md) | 13-phase TDD execution plan (256 files, per-file checklists) |
| [`scaffolding_files.md`](./scaffolding_files.md) | Phase 0 ready-to-paste config files (39 files)               |
| [`design.md`](./design.md)                | Three-path architecture critique + merged optimal architecture      |
| [`static_landing_page_html_mockup.md`](./static_landing_page_html_mockup.md) | Landing page spec + complete HTML mockup |
| [`docs/prompts.md`](./docs/prompts.md)    | Historical prompt log                                                |
