import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ── Turbopack (stable in Next.js 16) ───────────────────────────
  // Enable via --turbopack flag in dev, automatic for prod builds

  // ── React Compiler (stable in Next.js 16) ──────────────────────
  reactCompiler: true,

  // ── Top-level config (Next.js 16 moved these from experimental) ──
  // D21: serverExternalPackages moved to top-level (was experimental.serverComponentsExternalPackages)
  serverExternalPackages: [
    "@neondatabase/serverless",
    "drizzle-orm",
    "better-auth",
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
  headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Strict CSP — see PAD § 20.5
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' https://js.stripe.com",
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
  ...(process.env.ANALYZE === "true"
    ? {
        // Dynamically imported to avoid adding to prod bundle
      }
    : {}),
};

export default nextConfig;
