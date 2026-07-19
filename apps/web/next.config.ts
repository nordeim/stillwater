import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

import type { NextConfig } from "next";

// ── Bundle analyzer (enabled via ANALYZE=true) ────────────────────
// F10-09: Wraps nextConfig when ANALYZE=true to visualize bundle composition
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // ── Turbopack (stable in Next.js 16) ───────────────────────────
  // Enable via --turbopack flag in dev, automatic for prod builds

  // ── React Compiler (stable in Next.js 16) ──────────────────────
  // V16-2 fix (2026-07-19): Disabled React Compiler — it creates excessive
  // nested Suspense boundaries for async DB queries in Server Components,
  // preventing the content from resolving during streaming. The page would
  // show "Loading…" permanently because 54 nested Suspense templates (P:1
  // through P:35) were never resolved via $RC calls.
  // Disabling React Compiler eliminates the nested Suspense boundaries.
  // The page's own await Promise.all([...]) resolves all queries before
  // rendering, so no Suspense is needed.
  reactCompiler: false,

  // ── Hide X-Powered-By header (security: don't leak framework) ──
  // Audit 2026-07-19: previously leaked "X-Powered-By: Next.js" in
  // production responses. Disabled per OWASP information-hiding guidance.
  poweredByHeader: false,

  // ── Allowed Dev Origins ───────────────────────────────────────
  // Permits these origins to use the dev server (HMR, error overlay)
  // when accessed via a non-default host.
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    'stillwater.jesspete.shop',
    '192.168.2.132',
  ],

  // ── Transpile workspace packages (source resolution) ───────────
  // Turbopack doesn't respect custom `exports` conditions like
  // `@stillwater/source`. By pointing `exports.default` to `./src/*.ts`
  // in each workspace package.json AND listing them here, Turbopack
  // resolves to source and transpiles it inline. This eliminates the
  // need for a separate `tsc --build` step before `next build`.
  transpilePackages: [
    '@stillwater/auth',
    '@stillwater/api',
    '@stillwater/db',
    '@stillwater/config',
    '@stillwater/ui',
    '@stillwater/email',
    '@stillwater/payments',
  ],

  // ── Top-level config (Next.js 16 moved these from experimental) ──
  // D21: serverExternalPackages moved to top-level (was experimental.serverComponentsExternalPackages)
  serverExternalPackages: [
    "@neondatabase/serverless",
    "drizzle-orm",
    "better-auth",
    "@sanity/client",
  ],

  // ── Experimental features ──────────────────────────────────────
  experimental: {
    // Turbopack file-system caching (beta)
    turbopackFileSystemCacheForDev: true,
  },

  // ── Logging ────────────────────────────────────────────────────
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === "development",
    },
  },

  // ── Images ─────────────────────────────────────────────────────
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Cloudflare Images CDN
      {
        protocol: "https",
        hostname: "imagedelivery.net",
        pathname: "/**",
      },
      // Cloudflare R2 (direct storage access)
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
        pathname: "/**",
      },
      // Sanity CDN (instructor portraits, blog images)
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        pathname: "/images/**",
      },
    ],
    // Enforce explicit size to prevent CLS (WCAG compliance)
    dangerouslyAllowSVG: false,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // ── Security Headers ───────────────────────────────────────────
  // V16-3 fix (2026-07-19): Removed 'strict-dynamic' from script-src.
  //
  // Root cause: When 'strict-dynamic' is present in script-src, browsers
  // IGNORE 'unsafe-inline' per the CSP spec. This means Next.js's inline
  // RSC streaming scripts ($RC, $RS, $RV) — which have NO nonce — are
  // blocked by the browser. The page renders server-side but never hydrates:
  //   - $RC function is undefined in the browser
  //   - 55 Suspense templates stay empty (never swapped)
  //   - <main> shows "Loading…" permanently
  //   - __NEXT_DATA__ is undefined (React never initializes)
  //
  // Fix: Remove 'strict-dynamic' so 'unsafe-inline' is respected.
  // This allows the inline scripts to execute. The external script chunks
  // (from 'self') still load normally.
  //
  // History:
  //   v7: Static CSP with 'unsafe-inline' was here as a "safety net".
  //   v8 (S1): Removed CSP expecting proxy.ts nonce-based CSP to override.
  //       But proxy.ts headers don't reach production on Vercel + Next.js 16.2.
  //   v9 (V9-2): Restored CSP with 'unsafe-inline' 'strict-dynamic'.
  //       This was WRONG — 'strict-dynamic' causes 'unsafe-inline' to be ignored.
  //   v16-3 (this fix): Removed 'strict-dynamic'. 'unsafe-inline' now works.
  //
  // Source: CSP spec — "If 'strict-dynamic' is present, 'unsafe-inline' is ignored"
  //         https://www.w3.org/TR/CSP3/#strict-dynamic-usage
  //         Stillwater live-site E2E (2026-07-19): $RC undefined, no React hydration
  headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // V16-3: Removed 'strict-dynamic' — it causes 'unsafe-inline' to be ignored
              "script-src 'self' 'unsafe-inline' https://js.stripe.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://imagedelivery.net https://cdn.sanity.io",
              "font-src 'self'",
              "connect-src 'self' https://api.stripe.com wss: https://*.sentry.io https://*.posthog.com",
              "frame-src https://js.stripe.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
    ];
  },

  // ── Rewrites ───────────────────────────────────────────────────
  rewrites() {
    return [
      // PostHog reverse proxy (privacy-friendly analytics)
      {
        source: "/_analytics/static/:path*",
        destination: "https://app.posthog.com/static/:path*",
      },
      {
        source: "/_analytics/:path*",
        destination: "https://app.posthog.com/:path*",
      },
    ];
  },

  // ── Redirects ──────────────────────────────────────────────────
  redirects() {
    return [
      // Legacy URL support
      {
        source: "/book",
        destination: "/schedule",
        permanent: true,
      },
      {
        source: "/classes",
        destination: "/schedule",
        permanent: false,
      },
    ];
  },

  // ── Bundle Analyser (run with ANALYZE=true pnpm build) ─────────
  // F10-09: Handled by withBundleAnalyzer wrapper above
};

// ── Sentry (source map upload in CI) ───────────────────────────
// F10-09: withSentryConfig wraps nextConfig for source map upload.
// authToken is only set in CI (SENTRY_AUTH_TOKEN env var); in local
// dev the wrapper is a no-op (authToken undefined → skip upload).
// Note: conditional spread for authToken because exactOptionalPropertyTypes
// forbids passing `undefined` to an optional `string` property.
const sentryConfig = {
  // Suppress noisy build logs
  silent: true,
  // Auth token for source map upload (CI only)
  ...(process.env.SENTRY_AUTH_TOKEN
    ? { authToken: process.env.SENTRY_AUTH_TOKEN }
    : {}),
  // Disable Sentry webpack in development (faster builds)
  disableServerWebpackPlugin: process.env.NODE_ENV === "development",
  disableClientWebpackPlugin: process.env.NODE_ENV === "development",
  // Tree-shake Sentry logger in production
  widenClientFileUpload: true,
};

export default withBundleAnalyzer(withSentryConfig(nextConfig, sentryConfig));
