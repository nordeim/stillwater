# Stillwater — Pre-Live Preparation Guide

> **Purpose:** Step-by-step checklist for configuring all external services, environment variables, and deployment settings before launching the Stillwater Yoga Studio platform to production.
>
> **Audience:** Studio owner / developer performing the initial production deployment.
>
> **Prerequisites:** Vercel account, Neon PostgreSQL database, domain name (`stillwater.jesspete.shop` or similar), local clone of the `nordeim/stillwater` repo with `pnpm install` completed.

---

## Table of Contents

1. [Sanity CMS Configuration](#1-sanity-cms-configuration)
2. [Neon PostgreSQL Database](#2-neon-postgresql-database)
3. [Better Auth + Google OAuth](#3-better-auth--google-oauth)
4. [Stripe Payments](#4-stripe-payments)
5. [Resend Email](#5-resend-email)
6. [Trigger.dev Background Jobs](#6-triggerdev-background-jobs)
7. [Upstash Redis (Rate Limiting)](#7-upstash-redis-rate-limiting)
8. [Cloudflare Images + R2](#8-cloudflare-images--r2)
9. [Observability (Sentry + PostHog + Axiom + Checkly)](#9-observability-sentry--posthog--axiom--checkly)
10. [Vercel Deployment](#10-vercel-deployment)
11. [DNS + Domain Configuration](#11-dns--domain-configuration)
12. [Post-Deploy Smoke Test](#12-post-deploy-smoke-test)
13. [Ongoing Maintenance](#13-ongoing-maintenance)

---

## 1. Sanity CMS Configuration

Sanity is the headless CMS for all marketing content (blog posts, instructor bios, about page, FAQs, testimonials, announcements, site settings). Operational data (members, bookings, payments) lives in PostgreSQL — Sanity is **marketing content only** (ADR-005).

### 1.1 Create a Sanity Project

1. Go to [sanity.io/manage](https://www.sanity.io/manage) and sign in (Google or GitHub)
2. Click **Create new project**
3. Name it `stillwater` (or `stillwater-yoga`)
4. Select the **Free** plan (sufficient for a single studio)
5. Choose dataset name: `production` (default)
6. Note the **Project ID** (e.g., `v2gzd4bc` — this is already in `.env.example`)

### 1.2 Configure CORS Origins

The Next.js web app needs CORS access to fetch Sanity content client-side (if using Sanity Live Preview or client-side queries).

1. In Sanity Manage → your project → **API** → **CORS Origins**
2. Add the following origins:

| Origin | Environment | Purpose |
|---|---|---|
| `http://localhost:3000` | Development | Local dev server |
| `https://stillwater.jesspete.shop` | Production | Live site |
| `https://*.vercel.app` | Preview | Vercel preview deployments |

3. For each origin: check **Allow credentials** = Yes (if using Live Preview), set **Allowed HTTP methods** = GET + POST

### 1.3 Create an API Read Token

The server-side Sanity client uses a read token to fetch content during SSR/ISR.

1. In Sanity Manage → your project → **API** → **Tokens**
2. Click **Add API token**
3. Name: `stillwater-web-read`
4. Permissions: **Viewer** (read-only)
5. Copy the token (starts with `sk` — e.g., `skSlrWJK1...`)
6. Store it as `SANITY_API_TOKEN` in your `.env.local` and Vercel env vars
7. **Security:** if a `SANITY_API_TOKEN` already exists in a *tracked* `apps/web/.env.local`, treat it as compromised (it was committed to git) — revoke the old token in Sanity Cloud → API → Tokens and use only the freshly minted value.

### 1.4 Deploy Sanity Studio

Sanity Studio is the content editing interface. It runs as a standalone app at `stillwater.sanity.studio`.

> **Prerequisites**
> - Authenticate the CLI once: `cd apps/studio && ./node_modules/.bin/sanity login` (opens a browser; creates a `~/.sanity/` session). There is no `sanity whoami` — check `~/.sanity/` to confirm a session.
> - Studio reads `SANITY_STUDIO_PROJECT_ID` / `SANITY_STUDIO_DATASET` (from `sanity.cli.ts` + `sanity.config.ts`). Export them before the commands below.
> - Use the **local binary** (`./node_modules/.bin/sanity`), not `pnpm exec sanity` — the latter triggers an esbuild install-guard (Gotcha G4).

**Step 1 — Deploy the schema first (Content Lake).** This is required *before* the Studio UI and validates every reference target. The `featuredClasses` / `classesTeaching` fields that referenced a non-existent `class` type have been removed (classes live in PostgreSQL per ADR-005).

```bash
cd apps/studio
export SANITY_STUDIO_PROJECT_ID=v2gzd4bc
export SANITY_STUDIO_DATASET=production
./node_modules/.bin/sanity schema deploy      # → deploys the 8 types; must report 0 errors
./node_modules/.bin/sanity schema list        # → confirm 8 deployed types
```

**Step 2 — Deploy the Studio UI.**

```bash
./node_modules/.bin/sanity deploy --url=stillwater --title "Stillwater" --yes
```

On success, Sanity prints an `appId`. **Pin it** in `apps/studio/sanity.cli.ts` under `deployment: { autoUpdates: true, appId: '...' }` so future deploys don't re-prompt. If `stillwater` is taken, use `stillwater-studio` and update the URLs cited in §1.8.

This deploys Studio to `https://stillwater.sanity.studio` (or your chosen hostname). Content editors access this URL to manage all marketing content.

**Alternative — run Studio locally:**
```bash
pnpm --filter @stillwater/studio dev
# Studio available at http://localhost:3333
```

### 1.5 Create Initial Content

After deploying Studio, create at least these documents so the marketing pages aren't empty:

> ⚠️ The Home Page no longer has a **Featured Classes** field and Instructor Bios no longer have **Classes Teaching** — those referenced a `class` type that does not exist in Sanity (classes are PostgreSQL data, ADR-005). Do not expect those fields; the home page's featured-classes section (if needed) must be sourced from the API, not Sanity.

1. **Site Settings** (singleton) — studio name, tagline, contact email/phone, address, social links, nav items
2. **Home Page** (singleton) — hero headline, hero subheadline, philosophy text, CTA text/href, featured classes. Set `published = true`.
3. **About Page** (singleton) — title, body, studio image, values, team. Set `published = true`.
4. **At least 1 Blog Post** — title, slug, excerpt, body, publishedAt, author. Set `published = true`.
5. **Instructor Bios** (3) — one per instructor (Mei Tanaka, James Harlow, Aiko Mori). Each has: name, slug, bio, photo, specialties. Set `published = true`.
6. **FAQs** (optional) — question, answer, category, sort order
7. **Testimonials** (optional) — quote, author, role, photo
8. **Announcements** (optional) — title, body, startDate, endDate

### 1.6 Configure the ISR Revalidation Webhook

When content is published/updated in Sanity, a webhook fires to the Next.js app to trigger on-demand ISR revalidation (so changes appear immediately without waiting for the revalidate timer).

1. In Sanity Manage → your project → **API** → **Webhooks**
2. Click **Create webhook**
3. Configure:

| Field | Value |
|---|---|
| **Name** | `stillwater-isr-revalidation` |
| **URL** | `https://stillwater.jesspete.shop/api/sanity/webhook` |
| **Project** | (your project ID) |
| **Dataset** | `production` |
| **HTTP method** | `POST` |
| **HTTP Headers** | `{ "Content-Type": "application/json" }` |
| **Secret** | (generate a random 32-char hex string: `openssl rand -hex 32`) |
| **Trigger on** | Create, Update, Delete |

4. Store the **Secret** value as `SANITY_WEBHOOK_SECRET` in your `.env.local` and Vercel env vars
5. The webhook route at `/api/sanity/webhook` verifies the HMAC-SHA256 signature and calls `revalidatePath()` for affected routes

### 1.7 Environment Variables Summary

Add these to **`apps/web/.env.local`** for local dev (the Next.js app reads `.env.local` from its own directory, *not* the repo root) and to Vercel → Settings → Environment Variables (production). Mirror to the repo root `.env.local` for safety. (`SANITY_STUDIO_PROJECT_ID` / `SANITY_STUDIO_DATASET` are deploy-time only and are *not* needed in the web app env.)

| Variable | Value | Scope | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | `v2gzd4bc` | Client + Server | Public — visible in browser |
| `NEXT_PUBLIC_SANITY_DATASET` | `production` | Client + Server | Public |
| `SANITY_API_TOKEN` | `skSlrWJK1...` | Server only | Read-only token from §1.3 |
| `SANITY_WEBHOOK_SECRET` | (32-char hex) | Server only | Webhook signature verification |

### 1.8 Verify

After configuration:
- Visit `https://stillwater.sanity.studio` → should show the Stillwater Studio with 8 content types
- Visit `https://stillwater.jesspete.shop/blog` → should show blog posts (if any are published)
- Publish a blog post in Studio → the live `/blog` page should update within seconds (webhook → ISR)

---

## 2. Neon PostgreSQL Database

### 2.1 Create a Neon Project

1. Go to [neon.tech](https://neon.tech) and sign in
2. Click **New Project** → name it `stillwater`
3. Select region closest to your Vercel deployment region (e.g., `AWS US East` if Vercel is `iad1`)
4. Select PostgreSQL 17
5. Note the **Connection string** (pooled) and **Direct connection** (unpooled)

### 2.2 Environment Variables

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@ep-pooler.region.aws.neon.tech/stillwater?sslmode=require` | Pooled (PgBouncer) — for app queries |
| `DATABASE_URL_UNPOOLED` | `postgresql://user:pass@ep-direct.region.aws.neon.tech/stillwater?sslmode=require` | Direct — for migrations only |

**Critical:** The pooled URL has `-pooler` in the hostname; the unpooled URL has `-direct` (or no suffix). Migrations MUST use the unpooled URL because PgBouncer breaks prepared statements.

### 2.3 Run Migrations + Seed

```bash
# Set env vars (or use .env.local)
export DATABASE_URL_UNPOOLED="postgresql://..."

# Apply migrations
pnpm db:migrate

# Seed base demo data
pnpm db:seed

# Seed E2E test data (optional — for testing)
pnpm db:seed:e2e
```

### 2.4 Verify

- Connect to the database via `psql` or Neon's SQL Editor
- `\dt` should list 18 tables (15 domain + 3 Better Auth)
- `SELECT count(*) FROM membership_plans;` should return 3

---

## 3. Better Auth + Google OAuth

### 3.1 Generate BETTER_AUTH_SECRET

```bash
openssl rand -base64 32
```

Store this as `BETTER_AUTH_SECRET` — it signs session cookies. **Never commit it.**

### 3.2 Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a project (or use existing) → **APIs & Services** → **Credentials**
3. Click **Create Credentials** → **OAuth client ID**
4. Application type: **Web application**
5. Authorized JavaScript origins:

| Origin | Environment |
|---|---|
| `http://localhost:3000` | Development |
| `https://stillwater.jesspete.shop` | Production |
| `https://*.vercel.app` | Preview (optional) |

6. Authorized redirect URIs:

| URI | Environment |
|---|---|
| `http://localhost:3000/api/auth/callback/google` | Development |
| `https://stillwater.jesspete.shop/api/auth/callback/google` | Production |

7. Copy the **Client ID** and **Client Secret**

### 3.3 Environment Variables

| Variable | Value | Notes |
|---|---|---|
| `BETTER_AUTH_SECRET` | (base64 string from §3.1) | Session signing key |
| `BETTER_AUTH_URL` | `https://stillwater.jesspete.shop` | Base URL for auth callbacks |
| `GOOGLE_CLIENT_ID` | `xxxxx.apps.googleusercontent.com` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxxxx` | From Google Cloud Console |

---

## 4. Stripe Payments

### 4.1 Create Stripe Products + Prices

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Products**
2. Create 3 products matching the membership plans:

| Product Name | Price | Interval | Description |
|---|---|---|---|
| Pay As You Go | $28.00 | One-time | 1 class credit |
| Unlimited | $149.00 | Monthly | Unlimited classes + 2 guest passes |
| 10 Classes | $220.00 | Monthly | 10 class credits + 1 guest pass |

3. For each product, note the **Price ID** (starts with `price_`)
4. Update the database seed to use the real Price IDs (replace `price_placeholder_*` in `packages/db/src/seed/fixtures/membership-plans.ts`)

### 4.2 Configure Webhook

1. In Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**
2. Endpoint URL: `https://stillwater.jesspete.shop/api/webhooks/stripe`
3. Events to send:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `invoice.payment_action_required`
4. Copy the **Signing secret** (starts with `whsec_`)

### 4.3 Environment Variables

| Variable | Value | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` or `sk_test_...` | Server-side API key |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Webhook signature verification |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` or `pk_test_...` | Client-side (Stripe.js) |

### 4.4 Verify

- Use Stripe CLI to forward webhooks locally: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- Trigger a test event: `stripe trigger invoice.paid`
- Check the database: `SELECT * FROM payment_events ORDER BY created_at DESC LIMIT 5;`

---

## 5. Resend Email

### 5.1 Create Resend Account

1. Go to [resend.com](https://resend.com) and sign in
2. Verify your domain (`stillwater.jesspete.shop`) — add the DNS records Resend provides
3. Go to **API Keys** → **Create API Key**
4. Name: `stillwater-production`
5. Permission: **Sending access**
6. Copy the API key (starts with `re_`)

### 5.2 Environment Variables

| Variable | Value | Notes |
|---|---|---|
| `RESEND_API_KEY` | `re_...` | API key from Resend |
| `EMAIL_FROM` | `hello@stillwater.jesspete.shop` | Sender address (must match verified domain) |

### 5.3 Verify

- Sign in with magic link → should receive email within 30 seconds
- Check Resend dashboard → **Logs** → should show the sent email

---

## 6. Trigger.dev Background Jobs

### 6.1 Create Trigger.dev Project

1. Go to [trigger.dev](https://trigger.dev) and sign in
2. Create a project named `stillwater`
3. Copy the **Secret Key** (starts with `tr_`)

### 6.2 Deploy Workers

```bash
# From repo root:
pnpm jobs:deploy
```

This deploys all 11 background job tasks to Trigger.dev Cloud.

### 6.3 Environment Variables

| Variable | Value | Notes |
|---|---|---|
| `TRIGGER_SECRET_KEY` | `tr_...` | Trigger.dev project secret |

### 6.4 Configure Cron Jobs

In Trigger.dev dashboard, verify these cron schedules are registered:

| Task ID | Schedule | Description |
|---|---|---|
| `class-reminder-24h` | Every 15 min | Send 24h class reminders |
| `class-reminder-1h` | Every 5 min | Send 1h class reminders |
| `weekly-digest` | Sunday 09:00 PT | Weekly member digest |
| `attendance-summary` | Daily 23:00 PT | Daily attendance report |

### 6.5 Verify

- Trigger.dev dashboard → **Runs** → should show successful runs
- Book a class → check that `booking-confirmation` task fires

---

## 7. Upstash Redis (Rate Limiting)

### 7.1 Create Upstash Database

1. Go to [upstash.com](https://upstash.com) and sign in
2. Create a Redis database named `stillwater`
3. Select region matching your Vercel deployment
4. Copy the **REST URL** and **REST Token**

### 7.2 Environment Variables

| Variable | Value | Notes |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` | `https://xxxxx.upstash.io` | Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | `AYxxxxx` | REST API token |

### 7.3 Verify

- Attempt 11 rapid bookings → 11th should return 429 (rate limited)
- Check Upstash console → should see rate-limit keys

---

## 8. Cloudflare Images + R2

### 8.1 Create Cloudflare Account

1. Go to [cloudflare.com](https://dash.cloudflare.com) and sign in
2. Enable **Images** (for instructor/class photos)
3. Create an **R2 bucket** named `stillwater-images`

### 8.2 Create API Tokens

1. Go to **My Profile** → **API Tokens** → **Create Token**
2. Create 2 tokens:
   - **Images API Token**: permissions for Images → Edit
   - **R2 API Token**: permissions for R2 → Object Read & Write

### 8.3 Environment Variables

| Variable | Value | Notes |
|---|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | (account ID) | Cloudflare dashboard |
| `CLOUDFLARE_IMAGES_TOKEN` | (token) | Images API token |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | (access key) | R2 token access key |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | (secret key) | R2 token secret |
| `CLOUDFLARE_R2_BUCKET` | `stillwater-images` | R2 bucket name |
| `CLOUDFLARE_R2_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` | R2 S3 endpoint |
| `NEXT_PUBLIC_CLOUDFLARE_IMAGES_URL` | `https://imagedelivery.net` | Cloudflare Images CDN URL |

---

## 9. Observability (Sentry + PostHog + Axiom + Checkly)

### 9.1 Sentry (Error Tracking)

1. Go to [sentry.io](https://sentry.io) → Create project → **Next.js**
2. Copy the **DSN**
3. For source map uploads: create an **Auth Token** at sentry.io → Settings → Auth Tokens

| Variable | Value | Notes |
|---|---|---|
| `SENTRY_DSN` | `https://xxxxx@oNNNNN.ingest.sentry.io/MMMMM` | Server-side DSN |
| `NEXT_PUBLIC_SENTRY_DSN` | (same as above) | Client-side DSN |
| `SENTRY_AUTH_TOKEN` | `sntrys_...` | For source map uploads (CI only) |

### 9.2 PostHog (Product Analytics)

1. Go to [posthog.com](https://posthog.com) → Create project
2. Copy the **Project API Key** and **Host**

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | `phc_xxxxx` | Project API key |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://app.posthog.com` | PostHog host URL |

### 9.3 Axiom (Structured Logs)

1. Go to [axiom.co](https://axiom.co) → Create dataset `stillwater`
2. Create an **API token** with ingest permissions

| Variable | Value | Notes |
|---|---|---|
| `AXIOM_TOKEN` | `xait-xxxxx` | API token |
| `AXIOM_DATASET` | `stillwater` | Dataset name |

### 9.4 Checkly (Uptime Monitoring)

1. Go to [checklyhq.com](https://www.checklyhq.com) → Create account
2. Connect your GitHub repo (Checkly reads `checkly/` directory)
3. Configure alert channels (Slack, email, PagerDuty)

The 3 Checkly checks in `checkly/checks/` will auto-deploy:
- `api-health.check.ts` — hits `/api/trpc/schedule.getWeek` every 60s
- `booking-flow.check.ts` — navigates `/schedule`, clicks first class, verifies booking button
- `sse-endpoint.check.ts` — hits `/api/schedule/stream`, verifies SSE event within 5s

---

## 10. Vercel Deployment

### 10.1 Import the Repository

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**
2. Import `nordeim/stillwater` from GitHub
3. Framework preset: **Next.js** (auto-detected)
4. Root directory: `apps/web`
5. Build command: `cd ../.. && pnpm build` (turbo handles the monorepo)
6. Install command: `pnpm install`
7. Click **Deploy**

### 10.2 Configure Environment Variables

In Vercel → your project → **Settings** → **Environment Variables**, add ALL variables from `.env.example`. Use the **Production** scope for production secrets, and **Preview** scope for test keys.

**Critical variables (production will fail without these):**
- `DATABASE_URL` + `DATABASE_URL_UNPOOLED` (Neon)
- `BETTER_AUTH_SECRET` + `BETTER_AUTH_URL` + `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`
- `NEXT_PUBLIC_APP_URL` = `https://stillwater.jesspete.shop`
- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### 10.3 Enable Fluid Compute

For the SSE endpoint (`/api/schedule/stream`) to work with 300-second timeout:

1. Vercel → Settings → **Functions** → **Fluid Compute** → **Enable**
2. This allows serverless functions to stream for up to 30 minutes (Pro/Enterprise)

### 10.4 Configure Custom Domain

1. Vercel → Settings → **Domains**
2. Add `stillwater.jesspete.shop`
3. Add the CNAME record to your DNS provider: `stillwater → cname.vercel-dns.com`
4. Wait for DNS propagation (5-30 minutes)
5. Vercel will issue an SSL certificate automatically

---

## 11. DNS + Domain Configuration

### 11.1 DNS Records

Add these records at your DNS provider (Cloudflare, Namecheap, GoDaddy, etc.):

| Type | Name | Value | Notes |
|---|---|---|---|
| CNAME | `stillwater` | `cname.vercel-dns.com` | Vercel hosting |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:hello@stillwater.jesspete.shop` | Email auth |
| TXT | `@` | (Resend verification) | Email sending |
| MX | `@` | (Resend or Google Workspace MX) | Email receiving |

### 11.2 Verify

- `dig stillwater.jesspete.shop` → should resolve to Vercel IP
- `curl -I https://stillwater.jesspete.shop` → should return 200 with `server: Vercel`

---

## 12. Post-Deploy Smoke Test

Run this checklist after deploying to verify everything works:

### 12.1 Marketing Routes

```bash
# All should return 200
curl -sI https://stillwater.jesspete.shop/ | head -1
curl -sI https://stillwater.jesspete.shop/schedule | head -1
curl -sI https://stillwater.jesspete.shop/instructors | head -1
curl -sI https://stillwater.jesspete.shop/pricing | head -1
curl -sI https://stillwater.jesspete.shop/blog | head -1
curl -sI https://stillwater.jesspete.shop/about | head -1
```

### 12.2 Auth Redirects

```bash
# All should redirect to /auth/sign-in
curl -sI https://stillwater.jesspete.shop/admin | grep -i location
curl -sI https://stillwater.jesspete.shop/dashboard | grep -i location
curl -sI https://stillwater.jesspete.shop/profile | grep -i location
```

### 12.3 tRPC API

```bash
# Should return 3 instructors
curl -s "https://stillwater.jesspete.shop/api/trpc/instructors.list?input=%7B%22json%22%3A%7B%7D%7D" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('result',{}).get('data',[])), 'instructors')"

# Should return 3 membership plans
curl -s "https://stillwater.jesspete.shop/api/trpc/memberships.getPlans?input=%7B%22json%22%3A%7B%7D%7D" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('result',{}).get('data',[])), 'plans')"
```

### 12.4 SEO Endpoints

```bash
# Sitemap should use production URL (not localhost)
curl -s https://stillwater.jesspete.shop/sitemap.xml | head -8

# Robots.txt should reference sitemap
curl -s https://stillwater.jesspete.shop/robots.txt

# Manifest should be valid JSON
curl -s https://stillwater.jesspete.shop/manifest.webmanifest | python3 -m json.tool
```

### 12.5 SSE Endpoint

```bash
# Should return {"error":"Session not found"} for invalid session
curl -sN "https://stillwater.jesspete.shop/api/schedule/stream?sessionId=00000000-0000-4000-f000-000000000001" | head -1
```

### 12.6 Stripe Webhook

```bash
# Use Stripe CLI to test webhook delivery
stripe listen --forward-to https://stillwater.jesspete.shop/api/webhooks/stripe
stripe trigger invoice.paid
# Should see 200 response in the stripe listen output
```

### 12.7 Sanity Webhook

1. Edit a blog post in Sanity Studio
2. Click **Publish**
3. Within 5 seconds, the live `/blog` page should update (ISR revalidation)

---

## 13. Ongoing Maintenance

### 13.1 Secret Rotation Schedule

| Secret | Rotation Cadence | Notes |
|---|---|---|
| `BETTER_AUTH_SECRET` | Every 6 months | Rotating invalidates all sessions (users must re-sign-in) |
| `STRIPE_SECRET_KEY` | Annually or on compromise | Roll in Stripe Dashboard → update env vars |
| `STRIPE_WEBHOOK_SECRET` | Annually | Update in Stripe + Vercel env vars |
| `SANITY_API_TOKEN` | Annually | Create new token in Sanity Manage |
| `SANITY_WEBHOOK_SECRET` | Annually | Update in Sanity webhook + Vercel env vars |
| `RESEND_API_KEY` | Annually | Create new key in Resend |
| `TRIGGER_SECRET_KEY` | Annually | Regenerate in Trigger.dev dashboard |
| `UPSTASH_REDIS_REST_TOKEN` | Annually | Reset in Upstash console |
| `CLOUDFLARE_IMAGES_TOKEN` | Annually | Rotate in Cloudflare API tokens |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | Annually | Rotate in Cloudflare R2 |

### 13.2 Dependency Updates

- **Dependabot** is configured (`.github/dependabot.yml`) — review weekly PRs
- **`pnpm audit`** runs in CI — address high/critical vulnerabilities immediately
- **Node.js** — stay on the current LTS (22.x as of 2026)
- **pnpm** — stay on 11.x+

### 13.3 Database Migrations

- Always test migrations locally first: `pnpm db:migrate`
- Use `DATABASE_URL_UNPOOLED` for migrations (not pooled)
- Drizzle migrations are forward-only — always write a down-migration as a PR comment
- For production rollbacks: use Vercel instant rollback (code) + manual SQL (data)

### 13.4 Backup Strategy

- **Neon**: automatic daily backups + point-in-time recovery (free tier: 7-day retention)
- **Sanity**: content is versioned — revert from Studio history
- **Stripe**: data is in Stripe Dashboard (exportable)
- **Code**: GitHub repo (all changes via PRs)

### 13.5 Monitoring Checklist

| Cadence | Check | Tool |
|---|---|---|
| Every 60s | Uptime (3 checks) | Checkly |
| Every deploy | Smoke test (home, schedule, API) | Vercel |
| Daily | Error rate review | Sentry |
| Weekly | Product analytics funnel | PostHog |
| Monthly | Lighthouse audit (all routes) | Lighthouse CI |
| Quarterly | WCAG 2.2 AAA manual audit | VoiceOver + NVDA + keyboard |

---

## Appendix: Complete Environment Variable Checklist

Use this checklist to track configuration progress:

### Application
- [ ] `NODE_ENV=production` (set automatically by Vercel)
- [ ] `NEXT_PUBLIC_APP_URL=https://stillwater.jesspete.shop`

### Database (Neon)
- [ ] `DATABASE_URL=postgresql://...pooler...`
- [ ] `DATABASE_URL_UNPOOLED=postgresql://...direct...`

### Auth (Better Auth + Google)
- [ ] `BETTER_AUTH_SECRET=(openssl rand -base64 32)`
- [ ] `BETTER_AUTH_URL=https://stillwater.jesspete.shop`
- [ ] `GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com`
- [ ] `GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx`

### CMS (Sanity)
- [ ] `NEXT_PUBLIC_SANITY_PROJECT_ID=v2gzd4bc`
- [ ] `NEXT_PUBLIC_SANITY_DATASET=production`
- [ ] `SANITY_API_TOKEN=sk...`
- [ ] `SANITY_WEBHOOK_SECRET=(openssl rand -hex 32)`

### Payments (Stripe)
- [ ] `STRIPE_SECRET_KEY=sk_live_...`
- [ ] `STRIPE_WEBHOOK_SECRET=whsec_...`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...`

### Email (Resend)
- [ ] `RESEND_API_KEY=re_...`
- [ ] `EMAIL_FROM=hello@stillwater.jesspete.shop`

### Background Jobs (Trigger.dev)
- [ ] `TRIGGER_SECRET_KEY=tr_...`

### Rate Limiting (Upstash Redis)
- [ ] `UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io`
- [ ] `UPSTASH_REDIS_REST_TOKEN=AYxxxxx`

### Images (Cloudflare)
- [ ] `CLOUDFLARE_ACCOUNT_ID=...`
- [ ] `CLOUDFLARE_IMAGES_TOKEN=...`
- [ ] `CLOUDFLARE_R2_ACCESS_KEY_ID=...`
- [ ] `CLOUDFLARE_R2_SECRET_ACCESS_KEY=...`
- [ ] `CLOUDFLARE_R2_BUCKET=stillwater-images`
- [ ] `CLOUDFLARE_R2_ENDPOINT=https://...r2.cloudflarestorage.com`
- [ ] `NEXT_PUBLIC_CLOUDFLARE_IMAGES_URL=https://imagedelivery.net`

### Observability
- [ ] `SENTRY_DSN=https://...`
- [ ] `NEXT_PUBLIC_SENTRY_DSN=https://...`
- [ ] `SENTRY_AUTH_TOKEN=sntrys_...` (CI only)
- [ ] `NEXT_PUBLIC_POSTHOG_KEY=phc_...`
- [ ] `NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com`
- [ ] `AXIOM_TOKEN=xait-...` (optional)
- [ ] `AXIOM_DATASET=stillwater` (optional)

**Total: 34 environment variables** (26 server-side + 8 client-side `NEXT_PUBLIC_*`)

---

*End of Pre-Live Preparation Guide*
