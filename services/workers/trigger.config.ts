/**
 * Stillwater — Trigger.dev v4 Configuration
 *
 * All background jobs are registered here and deployed
 * to Trigger.dev Cloud independently of the Next.js app.
 *
 * Job catalog — see PAD § 17.1 for full documentation:
 *   - booking-confirmation     On booking mutation
 *   - class-reminder-24h       Scheduled 24h before session
 *   - class-reminder-1h        Scheduled 1h before session
 *   - class-cancellation-notify  On session cancellation by staff
 *   - waitlist-promotion       On enrollment cancellation
 *   - waitlist-expiry          Scheduled at offer expiry time
 *   - membership-credit-grant  On Stripe invoice.paid
 *   - membership-expiry-warn   Scheduled 3 days before renewal
 *   - payment-failed-notify    On Stripe invoice.payment_failed
 *   - weekly-digest            Cron: Sunday 09:00
 *   - attendance-summary       Cron: Daily 23:00
 */

// Note: The Trigger.dev v4 PLATFORM still uses the v3 SDK API import path.
// The "v3" in @trigger.dev/sdk/v3 refers to the SDK API version, NOT the
// platform version. As of @trigger.dev/sdk@4.5.0 (latest on npm, July 2026),
// no /v4 export exists. The v4 platform is accessed via the v3 SDK API.
// See: https://trigger.dev/docs (v4 migration guide)
import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  // ── Project identity ────────────────────────────────────────────
  // In development: reads from TRIGGER_SECRET_KEY in .env
  project:
    process.env.NODE_ENV === "production"
      ? "stillwater-prod"
      : "stillwater-dev",

  // ── Runtime ────────────────────────────────────────────────────
  runtime: "node",

  // ── Source directories to scan for tasks ────────────────────────
  dirs: ["./src"],

  // ── Logging ────────────────────────────────────────────────────
  logLevel: process.env.NODE_ENV === "production" ? "info" : "debug",

  // ── Max duration (CPU budget, NOT wall-clock) ───────────────────
  // Per PAD §17.2: 120s covers weekly-digest (longest job).
  // Time spent on triggerAndWait/wait.for is excluded from this budget.
  // Individual tasks can override with their own maxDuration.
  maxDuration: 120,

  // ── Default retry policy ────────────────────────────────────────
  // Individual tasks can override this
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1_000,
      maxTimeoutInMs: 10_000,
      factor: 2,
      randomize: true,
    },
  },

  // ── Machine configuration ───────────────────────────────────────
  // Shared default — tasks override for heavy operations
  machine: {
    preset: "micro", // 0.25 vCPU, 256MB RAM — sufficient for email + DB ops
  },

  // ── Build configuration ─────────────────────────────────────────
  build: {
    // External modules that should not be bundled
    // (they're available in the Node.js runtime)
    external: ["@neondatabase/serverless"],

    // Environment variables exposed to the build
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? "",
      DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED ?? "",
      RESEND_API_KEY: process.env.RESEND_API_KEY ?? "",
      EMAIL_FROM: process.env.EMAIL_FROM ?? "",
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "",
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "",
    },
  },
});
