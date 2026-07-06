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

// Trigger.dev v4 — import from root @trigger.dev/sdk (NOT /v3 which is deprecated).
// Per official Trigger.dev v4 docs: "ALWAYS import from @trigger.dev/sdk.
// NEVER import from @trigger.dev/sdk/v3." The /v3 subpath is the deprecated
// v3-era pattern. Both resolve to the same file today, but root import is
// the official v4 path and future-proofs against /v3 removal.
// See: https://trigger.dev/docs/v4/migration-guide
import { defineConfig } from "@trigger.dev/sdk";

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
  // v4: machine is a string literal (not an object with preset)
  machine: "micro", // 0.25 vCPU, 256MB RAM — sufficient for email + DB ops

  // ── Build configuration ─────────────────────────────────────────
  build: {
    // External modules that should not be bundled
    // (they're available in the Node.js runtime)
    external: ["@neondatabase/serverless"],
    // Note: Environment variables (DATABASE_URL, RESEND_API_KEY, etc.)
    // are injected at runtime by Trigger.dev Cloud — no need to declare
    // them in build.env (that property was removed in SDK v4).
    // Configure env vars in the Trigger.dev dashboard or via `trigger.dev`
    // CLI: `trigger.dev env set DATABASE_URL=...`
  },
});
