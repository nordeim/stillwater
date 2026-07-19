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
  reactCompiler: true,

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
  // v9 V9-2 fix: Content-Security-Policy IS set here as a static CSP.
  //
  // History:
  //   v7: Static CSP with 'unsafe-inline' was here as a "safety net".
  //   v8 (S1): Removed CSP from here expecting proxy.ts's per-request
  //       nonce-based CSP to override it. BUT live-site E2E revealed
  //       proxy.ts response headers DON'T reach production on Vercel +
  //       Next.js 16.2.10 (GitHub #85711, #86303). Result: live site
  //       had NO CSP at all — worse than v7.
  //   v9 (V9-2): Restored a working CSP here using 'self' 'unsafe-inline'
  //       'strict-dynamic' for script-src. This is weaker than the nonce-
  //       based target state but provides real XSS protection. The nonce-
  //       based CSP in proxy.ts is retained for the future when the
  //       Vercel/Next.js production proxy.ts header issue is resolved.
  //
  // 'unsafe-inline' is required because Next.js RSC streaming generates
  // inline scripts ($RS/$RC/$RV) that need to execute. 'strict-dynamic'
  // allows dynamically loaded chunks to run. When nonce-based CSP works
  // in production, 'unsafe-inline' will be replaced with 'nonce-${nonce}'.
  //
  // Source: Stillwater Audit Report v9 §V9-2;
  //         GitHub vercel/next.js#85711, vercel/next.js#86303;
  //         Next.js CSP guide https://nextjs.org/docs/app/guides/content-security-policy
  headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'strict-dynamic' https://js.stripe.com",
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
