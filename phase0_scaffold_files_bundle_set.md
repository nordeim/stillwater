> ⚠️ **HISTORICAL DOCUMENT — SUPERSEDED**
>
> This report reflects the state of PAD.md / SKILL.md / MEP.md as of its writing date.
> The project has since advanced to **PAD v1.4.0 / SKILL v1.4.1 / MEP v1.3.0**.
>
> Several technical claims herein have been corrected in the current documents,
> including but not limited to:
> - **Trigger.dev SDK import path**: reports may claim `/v4` (doesn't exist) or
>   `/v3` (deprecated). The canonical import is the **root** `@trigger.dev/sdk`
>   per official Trigger.dev v4 docs (see SKILL §9.9 Gotcha 1 + §12 Lesson 16).
> - **pnpm version**: reports may cite 9.15.4; actual is 11.9.0.
> - **Tailwind version**: reports may cite ^4.1.0; actual is ^4.3.0.
> - **React version**: reports may cite ^19.2.3; actual repo pin is ^19.2.7.
> - **ADR count**: reports may cite 9 ADRs; current is 10 (ADR-010 proposed).
>
> **Do not rely on this report for current technical guidance.** Consult the
> canonical documents listed in `CLAUDE.md` "Canonical Sources" section.

# apps/web/proxy.ts
```ts
/**
 * Stillwater — proxy.ts (Next.js 16)
 *
 * IMPORTANT: In Next.js 16, middleware.ts was renamed to proxy.ts
 * and the exported function must be named `proxy` (not `middleware`).
 * See: https://nextjs.org/blog/next-16#proxy
 *
 * Responsibilities:
 *  1. Auth session verification (Better Auth)
 *  2. RBAC route protection (role-based access)
 *  3. i18n locale routing (v2 — placeholder)
 *  4. Security header enforcement
 *
 * Runs on: Node.js runtime (proxy.ts runs on Node, not Edge)
 * See PAD § 9.4 for route protection logic.
 */

import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

// ── 2-Layer Auth Pattern (D36, ADR-009, guide G2) ──────────────────
// Layer 1 (THIS FILE): Cookie-existence-only optimistic check.
//   - Uses getSessionCookie() from better-auth/cookies
//   - NO DB access, NO auth.api.getSession(), NO RBAC role checks
//   - Edge-compatible (can run on Edge runtime)
//   - Purpose: fast redirect for unauthenticated users
// Layer 2 (Server Component layouts): Full session validation + RBAC.
//   - (studio)/layout.tsx calls requireAuth()
//   - (admin)/layout.tsx calls requireRole('staff', 'manager', 'owner')
//   - (admin)/admin/revenue/layout.tsx calls requireRole('manager', 'owner')
//   - (admin)/admin/settings/layout.tsx calls requireRole('owner')
//   - Purpose: actual security boundary
//
// Reference: Auth0 Next.js 16 guidance — "proxy.ts is not intended for
// full session management or complex authorization. Keep it light."

// Routes that require ANY authenticated session (cookie existence check only).
// RBAC role checks happen in layout.tsx via requireRole(), NOT here.
const AUTH_REQUIRED_ROUTES = [
  "/dashboard",
  "/book",
  "/my-classes",
  "/membership",
  "/profile",
  "/waitlist",
  "/admin",
];

// ── Proxy function (replaces middleware in Next.js 16) ───────────────
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route requires authentication (prefix match)
  const requiresAuth = AUTH_REQUIRED_ROUTES.some((route) => pathname.startsWith(route));
  if (!requiresAuth) {
    return NextResponse.next();
  }

  // Cookie-existence-only optimistic check (Edge-compatible, no DB access)
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const signInUrl = new URL("/auth/sign-in", request.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // NOTE: Do NOT do RBAC role checks here. Those happen in layout.tsx.
  // The cookie existence is enough for the optimistic redirect;
  // if the session is invalid/expired, layout.tsx will catch it.
  return NextResponse.next();
}

// ── Matcher configuration ────────────────────────────────────────────
export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - _next/static  (static files)
     * - _next/image   (image optimization)
     * - favicon.ico
     * - Public assets (images, fonts, etc.)
     * - API routes handled by their own auth
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf)).*)",
  ],
};

```

# apps/web/next.config.ts
```ts
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
    turbopackFileSystemCaching: true,
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
  async headers() {
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
  async rewrites() {
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
  async redirects() {
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

```

# apps/web/components.json
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "stone",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}

```

# apps/web/tsconfig.json
```json
{
  "extends": "@stillwater/typescript-config/nextjs",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "tsBuildInfoFile": ".turbo/tsconfig.tsbuildinfo"
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.d.ts",
    "src/**/*.ts",
    "src/**/*.tsx"
  ],
  "exclude": [
    "node_modules",
    ".next",
    "out",
    "dist",
    ".turbo"
  ]
}

```

# apps/web/postcss.config.mjs
```mjs
/**
 * PostCSS configuration for Tailwind CSS v4
 *
 * In Tailwind v4, the postcss-import and autoprefixer plugins are
 * handled internally by @tailwindcss/postcss. No separate
 * postcss-import is needed.
 */

/** @type {import('postcss').ProcessOptions} */
const config = {
  plugins: {
    // Tailwind CSS v4 PostCSS plugin — handles everything:
    // @import resolution, autoprefixer, CSS nesting, etc.
    "@tailwindcss/postcss": {},
  },
};

export default config;

```

# apps/web/package.json
```json
{
  "name": "@stillwater/web",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "check-types": "tsc --noEmit",
    "clean": "rm -rf .next .turbo",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@neondatabase/serverless": "^1.0.0",
    "@radix-ui/react-avatar": "^1.1.3",
    "@radix-ui/react-checkbox": "^1.1.4",
    "@radix-ui/react-dialog": "^1.1.6",
    "@radix-ui/react-dropdown-menu": "^2.1.6",
    "@radix-ui/react-label": "^2.1.2",
    "@radix-ui/react-popover": "^1.1.6",
    "@radix-ui/react-select": "^2.1.6",
    "@radix-ui/react-separator": "^1.1.2",
    "@radix-ui/react-slot": "^1.1.2",
    "@radix-ui/react-tabs": "^1.1.3",
    "@radix-ui/react-toast": "^1.2.6",
    "@radix-ui/react-tooltip": "^1.1.8",
    "@sentry/nextjs": "^9.4.0",
    "@stillwater/api": "workspace:*",
    "@stillwater/auth": "workspace:*",
    "@stillwater/config": "workspace:*",
    "@stillwater/db": "workspace:*",
    "@stillwater/ui": "workspace:*",
    "@t3-oss/env-nextjs": "^0.12.0",
    "@tanstack/react-query": "^5.64.2",
    "@tanstack/react-table": "^8.21.2",
    "@trpc/client": "^11.0.0",
    "@trpc/next": "^11.0.0",
    "@trpc/react-query": "^11.0.0",
    "@trpc/server": "^11.0.0",
    "better-auth": "^1.6.23",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "framer-motion": "^12.4.7",
    "lucide-react": "^0.475.0",
    "next": "^16.0.0",
    "next-themes": "^0.4.4",
    "nuqs": "^2.4.1",
    "posthog-js": "^1.232.0",
    "react": "^19.0.0",
    "react-day-picker": "^9.4.4",
    "react-dom": "^19.0.0",
    "react-hook-form": "^7.54.2",
    "server-only": "^0.0.1",
    "sonner": "^2.0.1",
    "stripe": "^17.6.0",
    "tailwind-merge": "^2.6.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@playwright/test": "^1.50.1",
    "@stillwater/eslint-config": "workspace:*",
    "@stillwater/tailwind-config": "workspace:*",
    "@stillwater/typescript-config": "workspace:*",
    "@testing-library/react": "^16.2.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/node": "^22.13.4",
    "@types/react": "^19.0.8",
    "@types/react-dom": "^19.0.3",
    "@vitejs/plugin-react": "^4.3.4",
    "@vitest/coverage-v8": "^3.0.5",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.20.1",
    "jsdom": "^26.0.0",
    "postcss": "^8.5.2",
    "tailwindcss": "^4.0.6",
    "vitest": "^3.0.5",
    "@tailwindcss/postcss": "^4.0.6",
    "@tailwindcss/typography": "^0.5.15",
    "@tailwindcss/container-queries": "^0.1.1"
  }
}

```

# apps/web/tailwind.config.ts
```ts
/**
 * Stillwater — Tailwind CSS v4 Configuration (apps/web)
 *
 * In Tailwind v4, the primary design tokens live in the global CSS file
 * via the @theme directive. This config file handles:
 * - Content scanning paths
 * - Plugin registration
 * - App-specific extensions over the shared base
 *
 * See: apps/web/src/app/globals.css for @theme token declarations
 */

import type { Config } from "tailwindcss";
import { stillwaterBase } from "@stillwater/tailwind-config";

const config: Config = {
  // Content paths — Tailwind v4 scans these for class usage
  content: [
    "./src/**/*.{ts,tsx,mdx}",
    // Include shared UI package components
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],

  // Extend the shared base config
  ...stillwaterBase,

  theme: {
    ...stillwaterBase.theme,
    extend: {
      ...stillwaterBase.theme?.extend,

      // App-specific overrides (none needed for v1)
    },
  },

  plugins: [
    // Typography plugin for blog/long-form content
    require("@tailwindcss/typography"),
    // Container queries for component-level responsive design
    require("@tailwindcss/container-queries"),
  ],
};

export default config;

```

# apps/web/src/app/layout.tsx
```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Stillwater Yoga Studio',
    template: '%s — Stillwater Yoga',
  },
  description: 'A sanctuary for mindful movement in Southeast Portland. Book classes online.',
  metadataBase: new URL(process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Stillwater Yoga Studio',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

```

# apps/web/src/app/page.tsx
```tsx
/**
 * Stillwater — Phase 0 Placeholder Home Page
 *
 * This page will be replaced in Phase 4 (Marketing surface with Sanity CMS)
 * and Phase 12 (Landing page port from static mockup to production Next.js).
 */

export default function HomePage() {
  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      fontFamily: 'var(--font-body, system-ui, sans-serif)',
      color: 'var(--color-text-primary, #1C1915)',
      background: 'var(--color-background, #F5F0E8)',
    }}>
      <h1 style={{
        fontFamily: 'var(--font-display, Georgia, serif)',
        fontSize: 'clamp(3rem, 8vw, 5rem)',
        fontWeight: 300,
        lineHeight: 1.05,
        marginBottom: '1rem',
      }}>
        Stillwater
      </h1>
      <p style={{
        fontSize: '1.125rem',
        lineHeight: 1.65,
        color: 'var(--color-text-secondary, #8C7B6E)',
        maxWidth: '32rem',
        textAlign: 'center',
      }}>
        Phase 0 scaffold complete. The production landing page will appear here
        after Phase 4 (Sanity CMS integration) and Phase 12 (mockup port).
      </p>
      <div style={{
        marginTop: '3rem',
        padding: '1rem 2rem',
        border: '1px solid var(--color-border, #D4CFC9)',
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'var(--color-text-secondary, #8C7B6E)',
      }}>
        Next.js 16 · React 19 · Tailwind v4 · tRPC v11 · Drizzle · Better Auth
      </div>
    </main>
  );
}

```

# apps/web/src/app/globals.css
```css
/**
 * Stillwater — App Global CSS (Tailwind v4 CSS-first)
 *
 * Import order matters:
 *   1. @stillwater/ui/globals — design tokens + fonts + reset
 *   2. tailwindcss — Tailwind v4 utilities (scans content paths)
 *   3. @theme — maps tokens to Tailwind theme variables
 */

@import '@stillwater/ui/globals';
@import 'tailwindcss';

/* ── Tailwind v4 Theme Mapping ─────────────────────────────── */
/* Maps Stillwater design tokens to Tailwind's theme namespace
   so utilities like bg-stone-50, font-display, duration-quick
   generate correctly. */

@theme {
  /* Colors — Stone */
  --color-stone-950: var(--color-stone-950);
  --color-stone-900: var(--color-stone-900);
  --color-stone-800: var(--color-stone-800);
  --color-stone-700: var(--color-stone-700);
  --color-stone-600: var(--color-stone-600);
  --color-stone-500: var(--color-stone-500);
  --color-stone-400: var(--color-stone-400);
  --color-stone-300: var(--color-stone-300);
  --color-stone-200: var(--color-stone-200);
  --color-stone-100: var(--color-stone-100);
  --color-stone-50: var(--color-stone-50);

  /* Colors — Clay */
  --color-clay-600: var(--color-clay-600);
  --color-clay-500: var(--color-clay-500);
  --color-clay-400: var(--color-clay-400);
  --color-clay-300: var(--color-clay-300);
  --color-clay-200: var(--color-clay-200);
  --color-clay-100: var(--color-clay-100);

  /* Colors — Water */
  --color-water-700: var(--color-water-700);
  --color-water-600: var(--color-water-600);
  --color-water-500: var(--color-water-500);
  --color-water-400: var(--color-water-400);
  --color-water-300: var(--color-water-300);
  --color-water-100: var(--color-water-100);

  /* Colors — Sand */
  --color-sand: var(--color-sand);
  --color-sand-warm: var(--color-sand-warm);
  --color-sand-deep: var(--color-sand-deep);

  /* Status colors */
  --color-success: var(--color-success);
  --color-warning: var(--color-warning);
  --color-error: var(--color-error);
  --color-info: var(--color-info);

  /* Fonts */
  --font-display: var(--font-display);
  --font-body: var(--font-body);
  --font-mono: var(--font-mono);

  /* Spacing (4px base) */
  --spacing-1: var(--space-1);
  --spacing-2: var(--space-2);
  --spacing-3: var(--space-3);
  --spacing-4: var(--space-4);
  --spacing-5: var(--space-5);
  --spacing-6: var(--space-6);
  --spacing-7: var(--space-7);
  --spacing-8: var(--space-8);
  --spacing-9: var(--space-9);
  --spacing-10: var(--space-10);
  --spacing-11: var(--space-11);
  --spacing-12: var(--space-12);
  --spacing-13: var(--space-13);

  /* Border radius — sharp edges by design (PAD §11.1) */
  --radius: 0;
  --radius-sm: 0;
  --radius-md: 0;
  --radius-lg: 0;
  --radius-xl: 0;
  --radius-2xl: 0;
  --radius-full: 9999px; /* ONLY for avatars and status dots */

  /* Motion easings */
  --ease-gentle: var(--ease-gentle);
  --ease-breathe: var(--ease-breathe);
  --ease-sharp: var(--ease-sharp);

  /* Motion durations */
  --duration-instant: var(--duration-instant);
  --duration-quick: var(--duration-quick);
  --duration-standard: var(--duration-standard);
  --duration-slow: var(--duration-slow);
  --duration-crawl: var(--duration-crawl);
}

```

# docker-compose.yml
```yml
# ══════════════════════════════════════════════════════════════════
# Stillwater — Local Development Services
# ══════════════════════════════════════════════════════════════════
# Usage:
#   Start:   docker compose up -d
#   Stop:    docker compose down
#   Reset:   docker compose down -v  (WARNING: deletes all data)
#   Logs:    docker compose logs -f postgres
# ══════════════════════════════════════════════════════════════════

version: "3.9"

services:

  # ─── PostgreSQL 17 ───────────────────────────────────────────────
  postgres:
    image: postgres:17-alpine
    container_name: stillwater_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: stillwater_dev
      POSTGRES_USER: stillwater
      POSTGRES_PASSWORD: stillwater_local_dev
      PGDATA: /var/lib/postgresql/data/pgdata
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      # Init scripts: run once on first container creation
      - ./infrastructure/postgres/init:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U stillwater -d stillwater_dev"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s
    networks:
      - stillwater_net

  # ─── Redis 7 (rate limiting, idempotency keys) ───────────────────
  redis:
    image: redis:7-alpine
    container_name: stillwater_redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass stillwater_redis_dev
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "stillwater_redis_dev", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    networks:
      - stillwater_net

  # ─── Adminer (lightweight DB GUI — dev only) ─────────────────────
  adminer:
    image: adminer:latest
    container_name: stillwater_adminer
    restart: unless-stopped
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - stillwater_net
    profiles:
      # Only starts with: docker compose --profile tools up -d
      - tools

# ─── Named Volumes ─────────────────────────────────────────────────
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

# ─── Networks ──────────────────────────────────────────────────────
networks:
  stillwater_net:
    driver: bridge

```

# infrastructure/postgres/init/00-create-extensions.sql
```sql
-- Stillwater — PostgreSQL init script
-- D18: Required extensions for Drizzle ORM schema
-- This script runs once on first container creation (docker-entrypoint-initdb.d)

-- uuid-ossp: provides uuid_generate_v4() for Drizzle's .defaultRandom()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pgcrypto: provides gen_random_uuid() (alternative UUID generator)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Verify extensions installed
\echo 'Extensions created: uuid-ossp, pgcrypto'

```

# package.json
```json
{
  "name": "stillwater",
  "version": "0.0.0",
  "private": true,
  "description": "Stillwater Yoga Studio — Enterprise-grade platform",
  "engines": {
    "node": ">=22.0.0",
    "pnpm": ">=9.0.0"
  },
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "lint:fix": "turbo lint:fix",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\" --ignore-path .gitignore",
    "format:check": "prettier --check \"**/*.{ts,tsx,md,json}\" --ignore-path .gitignore",
    "check-types": "turbo check-types",
    "test": "turbo test",
    "test:e2e": "turbo test:e2e",
    "test:coverage": "turbo test --coverage",
    "clean": "turbo clean && rm -rf node_modules",
    "db:generate": "turbo db:generate --filter=@stillwater/db",
    "db:migrate": "turbo db:migrate --filter=@stillwater/db",
    "db:push": "turbo db:push --filter=@stillwater/db",
    "db:seed": "turbo db:seed --filter=@stillwater/db",
    "db:studio": "turbo db:studio --filter=@stillwater/db",
    "db:reset": "turbo db:reset --filter=@stillwater/db",
    "jobs:dev": "turbo dev --filter=@stillwater/workers",
    "jobs:deploy": "turbo deploy --filter=@stillwater/workers"
  },
  "devDependencies": {
    "@stillwater/eslint-config": "workspace:*",
    "@stillwater/typescript-config": "workspace:*",
    "prettier": "^3.4.2",
    "prettier-plugin-tailwindcss": "^0.6.10",
    "turbo": "^2.3.3",
    "typescript": "^5.7.3"
  },
  "packageManager": "pnpm@9.15.4"
}

```

# packages/db/drizzle.config.ts
```ts
/**
 * Stillwater — Drizzle Kit Configuration
 *
 * Used by:
 *  - drizzle-kit generate  → create migration SQL from schema changes
 *  - drizzle-kit migrate   → apply pending migrations
 *  - drizzle-kit studio    → open Drizzle Studio GUI
 *  - drizzle-kit push      → push schema directly (dev only)
 *
 * IMPORTANT: Always use DATABASE_URL_UNPOOLED for migrations.
 * The pooled URL (PgBouncer) breaks prepared statements in migration scripts.
 * See PAD § 7.4 for migration strategy.
 */

import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Load from .env.local (monorepo root) or .env
config({ path: "../../.env.local" });
config({ path: "../../.env" });

const connectionString = process.env["DATABASE_URL_UNPOOLED"];

if (!connectionString) {
  throw new Error(
    "DATABASE_URL_UNPOOLED is not defined.\n" +
    "For migrations, use the direct (non-pooled) connection string.\n" +
    "See .env.example for reference.",
  );
}

export default defineConfig({
  // ── Schema location ────────────────────────────────────────────
  schema: "./src/schema/index.ts",

  // ── Migration output directory ─────────────────────────────────
  out: "./drizzle/migrations",

  // ── Dialect ───────────────────────────────────────────────────
  dialect: "postgresql",

  // ── Database connection ────────────────────────────────────────
  // Direct connection required — NOT pooled (PgBouncer not compatible)
  dbCredentials: {
    url: connectionString,
  },

  // ── Verbose output ─────────────────────────────────────────────
  verbose: true,

  // ── Strict mode — prevents destructive operations silently ─────
  strict: true,

  // ── Table/schema filter ────────────────────────────────────────
  // Only manage the 'public' schema; don't touch auth/internal schemas
  schemaFilter: ["public"],
});

```

# packages/db/tsconfig.json
```json
{
  "extends": "@stillwater/typescript-config/library",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "tsBuildInfoFile": ".turbo/tsconfig.tsbuildinfo"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", ".turbo"]
}

```

# packages/db/package.json
```json
{
  "name": "@stillwater/db",
  "version": "0.0.0",
  "private": true,
  "exports": {
    ".": {
      "@stillwater/source": "./src/index.ts",
      "default": "./dist/index.js"
    },
    "./schema": {
      "@stillwater/source": "./src/schema/index.ts",
      "default": "./dist/schema/index.js"
    }
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc --build",
    "dev": "tsc --build --watch",
    "clean": "rm -rf dist .turbo",
    "check-types": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:seed": "tsx src/seed/index.ts",
    "db:studio": "drizzle-kit studio",
    "db:reset": "tsx src/scripts/reset.ts"
  },
  "dependencies": {
    "@neondatabase/serverless": "^1.0.0",
    "drizzle-orm": "^0.40.1",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@stillwater/typescript-config": "workspace:*",
    "@types/node": "^22.13.4",
    "drizzle-kit": "^0.30.1",
    "dotenv": "^16.4.7",
    "tsx": "^4.19.2",
    "typescript": "^5.7.3"
  }
}

```

# packages/ui/tsconfig.json
```json
{
  "extends": "@stillwater/typescript-config/library",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "tsBuildInfoFile": ".turbo/tsconfig.tsbuildinfo",
    "jsx": "react-jsx"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist", ".turbo"]
}

```

# packages/ui/package.json
```json
{
  "name": "@stillwater/ui",
  "version": "0.0.0",
  "private": true,
  "exports": {
    ".": {
      "@stillwater/source": "./src/index.ts",
      "default": "./dist/index.js"
    },
    "./tokens": "./src/tokens/index.css",
    "./globals": "./src/globals.css"
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "sideEffects": [
    "**/*.css"
  ],
  "scripts": {
    "build": "tsc --build",
    "dev": "tsc --build --watch",
    "clean": "rm -rf dist .turbo",
    "check-types": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@radix-ui/react-avatar": "^1.1.3",
    "@radix-ui/react-checkbox": "^1.1.4",
    "@radix-ui/react-dialog": "^1.1.6",
    "@radix-ui/react-dropdown-menu": "^2.1.6",
    "@radix-ui/react-label": "^2.1.2",
    "@radix-ui/react-popover": "^1.1.6",
    "@radix-ui/react-select": "^2.1.6",
    "@radix-ui/react-separator": "^1.1.2",
    "@radix-ui/react-slot": "^1.1.2",
    "@radix-ui/react-tabs": "^1.1.3",
    "@radix-ui/react-toast": "^1.2.6",
    "@radix-ui/react-tooltip": "^1.1.8",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.475.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "sonner": "^2.0.1",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@stillwater/eslint-config": "workspace:*",
    "@stillwater/tailwind-config": "workspace:*",
    "@stillwater/typescript-config": "workspace:*",
    "@testing-library/react": "^16.2.0",
    "@types/react": "^19.0.8",
    "@types/react-dom": "^19.0.3",
    "@vitejs/plugin-react": "^4.3.4",
    "@vitest/coverage-v8": "^3.0.5",
    "jsdom": "^26.0.0",
    "tailwindcss": "^4.0.6",
    "typescript": "^5.7.3",
    "vitest": "^3.0.5"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}

```

# packages/ui/src/fonts/dm-sans/dm-sans.css
```css
/* Stillwater — DM Sans (self-hosted via Google Fonts downloader) */
/* Downloaded from Google Fonts API — free to self-host under SIL Open Font License */

@font-face {
  font-family: 'DM Sans';
  font-style: italic;
  font-weight: 400;
  font-display: swap;
  src: url('./dm-sans-regular-italic-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}

@font-face {
  font-family: 'DM Sans';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('./dm-sans-regular-normal-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}

@font-face {
  font-family: 'DM Sans';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('./dm-sans-medium-normal-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}

@font-face {
  font-family: 'DM Sans';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('./dm-sans-bold-normal-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}

@font-face {
  font-family: 'DM Sans';
  font-style: italic;
  font-weight: 400;
  font-display: swap;
  src: url('./dm-sans-regular-italic-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'DM Sans';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('./dm-sans-regular-normal-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'DM Sans';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('./dm-sans-medium-normal-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'DM Sans';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('./dm-sans-bold-normal-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}


```

# packages/ui/src/fonts/index.css
```css
/* Stillwater — Font barrel import */
/* Import this file to load all @font-face declarations */

@import './cormorant/cormorant.css';
@import './dm-sans/dm-sans.css';
@import './jetbrains-mono/jetbrains-mono.css';

```

# packages/ui/src/fonts/cormorant/cormorant.css
```css
/* Stillwater — Cormorant Garamond (self-hosted via Google Fonts downloader) */
/* Downloaded from Google Fonts API — free to self-host under SIL Open Font License */

@font-face {
  font-family: 'Cormorant Garamond';
  font-style: italic;
  font-weight: 400;
  font-display: swap;
  src: url('./cormorant-garamond-regular-italic-cyrillic-ext.woff2') format('woff2');
  unicode-range: U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F;
}

@font-face {
  font-family: 'Cormorant Garamond';
  font-style: normal;
  font-weight: 300;
  font-display: swap;
  src: url('./cormorant-garamond-light-normal-cyrillic-ext.woff2') format('woff2');
  unicode-range: U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F;
}

@font-face {
  font-family: 'Cormorant Garamond';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('./cormorant-garamond-regular-normal-cyrillic-ext.woff2') format('woff2');
  unicode-range: U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F;
}

@font-face {
  font-family: 'Cormorant Garamond';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('./cormorant-garamond-medium-normal-cyrillic-ext.woff2') format('woff2');
  unicode-range: U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F;
}

@font-face {
  font-family: 'Cormorant Garamond';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('./cormorant-garamond-semi-bold-normal-cyrillic-ext.woff2') format('woff2');
  unicode-range: U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F;
}

@font-face {
  font-family: 'Cormorant Garamond';
  font-style: italic;
  font-weight: 400;
  font-display: swap;
  src: url('./cormorant-garamond-regular-italic-cyrillic.woff2') format('woff2');
  unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
}

@font-face {
  font-family: 'Cormorant Garamond';
  font-style: normal;
  font-weight: 300;
  font-display: swap;
  src: url('./cormorant-garamond-light-normal-cyrillic.woff2') format('woff2');
  unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
}

@font-face {
  font-family: 'Cormorant Garamond';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('./cormorant-garamond-regular-normal-cyrillic.woff2') format('woff2');
  unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
}

@font-face {
  font-family: 'Cormorant Garamond';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('./cormorant-garamond-medium-normal-cyrillic.woff2') format('woff2');
  unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
}

@font-face {
  font-family: 'Cormorant Garamond';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('./cormorant-garamond-semi-bold-normal-cyrillic.woff2') format('woff2');
  unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
}

@font-face {
  font-family: 'Cormorant Garamond';
  font-style: italic;
  font-weight: 400;
  font-display: swap;
  src: url('./cormorant-garamond-regular-italic-vietnamese.woff2') format('woff2');
  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB;
}

@font-face {
  font-family: 'Cormorant Garamond';
  font-style: normal;
  font-weight: 300;
  font-display: swap;
  src: url('./cormorant-garamond-light-normal-vietnamese.woff2') format('woff2');
  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB;
}

@font-face {
  font-family: 'Cormorant Garamond';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('./cormorant-garamond-regular-normal-vietnamese.woff2') format('woff2');
  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB;
}

@font-face {
  font-family: 'Cormorant Garamond';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('./cormorant-garamond-medium-normal-vietnamese.woff2') format('woff2');
  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB;
}

@font-face {
  font-family: 'Cormorant Garamond';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('./cormorant-garamond-semi-bold-normal-vietnamese.woff2') format('woff2');
  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB;
}

@font-face {
  font-family: 'Cormorant Garamond';
  font-style: italic;
  font-weight: 400;
  font-display: swap;
  src: url('./cormorant-garamond-regular-italic-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}

@font-face {
  font-family: 'Cormorant Garamond';
  font-style: normal;
  font-weight: 300;
  font-display: swap;
  src: url('./cormorant-garamond-light-normal-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}

@font-face {
  font-family: 'Cormorant Garamond';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('./cormorant-garamond-regular-normal-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}

@font-face {
  font-family: 'Cormorant Garamond';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('./cormorant-garamond-medium-normal-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}

@font-face {
  font-family: 'Cormorant Garamond';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('./cormorant-garamond-semi-bold-normal-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}

@font-face {
  font-family: 'Cormorant Garamond';
  font-style: italic;
  font-weight: 400;
  font-display: swap;
  src: url('./cormorant-garamond-regular-italic-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'Cormorant Garamond';
  font-style: normal;
  font-weight: 300;
  font-display: swap;
  src: url('./cormorant-garamond-light-normal-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'Cormorant Garamond';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('./cormorant-garamond-regular-normal-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'Cormorant Garamond';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('./cormorant-garamond-medium-normal-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'Cormorant Garamond';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('./cormorant-garamond-semi-bold-normal-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}


```

# packages/ui/src/fonts/jetbrains-mono/jetbrains-mono.css
```css
/* Stillwater — JetBrains Mono (Berkeley Mono fallback) */
/* Free open-source font under Apache License 2.0 */
/* Used as fallback for Berkeley Mono (paid) per PAD §11.3 */

@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('./jetbrains-mono-regular-normal-cyrillic-ext.woff2') format('woff2');
  unicode-range: U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F;
}

@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('./jetbrains-mono-medium-normal-cyrillic-ext.woff2') format('woff2');
  unicode-range: U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F;
}

@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('./jetbrains-mono-bold-normal-cyrillic-ext.woff2') format('woff2');
  unicode-range: U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F;
}

@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('./jetbrains-mono-regular-normal-cyrillic.woff2') format('woff2');
  unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
}

@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('./jetbrains-mono-medium-normal-cyrillic.woff2') format('woff2');
  unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
}

@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('./jetbrains-mono-bold-normal-cyrillic.woff2') format('woff2');
  unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
}

@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('./jetbrains-mono-regular-normal-greek.woff2') format('woff2');
  unicode-range: U+0370-0377, U+037A-037F, U+0384-038A, U+038C, U+038E-03A1, U+03A3-03FF;
}

@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('./jetbrains-mono-medium-normal-greek.woff2') format('woff2');
  unicode-range: U+0370-0377, U+037A-037F, U+0384-038A, U+038C, U+038E-03A1, U+03A3-03FF;
}

@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('./jetbrains-mono-bold-normal-greek.woff2') format('woff2');
  unicode-range: U+0370-0377, U+037A-037F, U+0384-038A, U+038C, U+038E-03A1, U+03A3-03FF;
}

@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('./jetbrains-mono-regular-normal-vietnamese.woff2') format('woff2');
  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB;
}

@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('./jetbrains-mono-medium-normal-vietnamese.woff2') format('woff2');
  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB;
}

@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('./jetbrains-mono-bold-normal-vietnamese.woff2') format('woff2');
  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB;
}

@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('./jetbrains-mono-regular-normal-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}

@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('./jetbrains-mono-medium-normal-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}

@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('./jetbrains-mono-bold-normal-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}

@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('./jetbrains-mono-regular-normal-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('./jetbrains-mono-medium-normal-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('./jetbrains-mono-bold-normal-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}


```

# packages/ui/src/tokens/colors.css
```css
/* Stillwater — Warm Mineral Color Palette (PAD §11.4) */
/* DO NOT use raw hex values in components — always use these tokens */

:root {
  /* Stone — foundation */
  --color-stone-950: #0F0D0B;
  --color-stone-900: #1C1915;
  --color-stone-800: #2E2B26;
  --color-stone-700: #3D3832;
  --color-stone-600: #544F48;
  --color-stone-500: #6E6760;
  --color-stone-400: #8C7B6E;
  --color-stone-300: #B0A49A;
  --color-stone-200: #D4CFC9;
  --color-stone-100: #E8E3DC;
  --color-stone-50: #F5F0E8;

  /* Clay — primary action (terracotta) */
  --color-clay-600: #8A4030;
  --color-clay-500: #9E5E44;
  --color-clay-400: #C4856A;
  --color-clay-300: #D9A48F;
  --color-clay-200: #EDD4C8;
  --color-clay-100: #F7EDE8;

  /* Water — accent (muted teal) */
  --color-water-700: #4A7280;
  --color-water-600: #5D8A99;
  --color-water-500: #7B9EA8;
  --color-water-400: #9BBAC5;
  --color-water-300: #B8CDD4;
  --color-water-100: #E8F0F3;

  /* Sand — surfaces */
  --color-sand: #F5F0E8;
  --color-sand-warm: #EDE5D8;
  --color-sand-deep: #E2D8CB;

  /* Status colors */
  --color-success: #4A7C59;
  --color-warning: #C4913A;
  --color-error: #B85450;
  --color-info: var(--color-water-500);

  /* Semantic aliases */
  --color-background: var(--color-sand);
  --color-surface: var(--color-sand-warm);
  --color-border: var(--color-stone-200);
  --color-text-primary: var(--color-stone-900);
  --color-text-secondary: var(--color-stone-400);
  --color-text-tertiary: var(--color-stone-300);
  --color-action: var(--color-clay-400);
  --color-action-hover: var(--color-clay-500);
  --color-accent: var(--color-water-500);

  /* Fog — alias for stone-200 (fixes D9 malformed token in PAD) */
  --color-fog: #D4CFC9;
}

```

# packages/ui/src/tokens/motion.css
```css
/* Stillwater — Motion System (PAD §11.6) */

:root {
  /* Easing curves */
  --ease-gentle: cubic-bezier(0.16, 1, 0.3, 1);     /* Expo out — snappy settle */
  --ease-breathe: cubic-bezier(0.45, 0, 0.55, 1);   /* Sine in-out — organic */
  --ease-sharp: cubic-bezier(0.4, 0, 0.2, 1);        /* Material standard */

  /* Durations */
  --duration-instant: 100ms;
  --duration-quick: 150ms;    /* Hover states */
  --duration-standard: 300ms; /* Transitions */
  --duration-slow: 600ms;     /* Page reveals */
  --duration-crawl: 900ms;    /* Decorative/ambient */
}

/* Reduced motion — global override (WCAG 2.2 AAA) */
/* Use 0.01ms, NOT 0ms — some browsers treat 0ms as "use default" */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

```

# packages/ui/src/tokens/spacing.css
```css
/* Stillwater — Spacing Scale (PAD §11.5) */
/* 4px base, Fibonacci-influenced progression */

:root {
  --space-px: 1px;
  --space-0-5: 2px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-7: 32px;   /* primary component gap */
  --space-8: 48px;
  --space-9: 64px;   /* section padding */
  --space-10: 96px;
  --space-11: 128px;
  --space-12: 192px; /* large section breaks */
  --space-13: 256px;

  /* Max widths */
  --max-width-content: 1280px;
  --max-width-narrow: 720px;
  --max-width-wide: 1440px;
}

```

# packages/ui/src/tokens/index.css
```css
/* Stillwater — Token barrel import */
/* Import this file to load all design tokens */

@import './colors.css';
@import './typography.css';
@import './spacing.css';
@import './motion.css';

```

# packages/ui/src/tokens/typography.css
```css
/* Stillwater — Typography System (PAD §11.3) */

:root {
  /* Font families */
  --font-display: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
  --font-body: 'DM Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', 'Cascadia Code', 'Courier New', monospace;

  /* Type scale (9 fluid tokens — clamp-based) */
  --text-display-2xl: clamp(3.5rem, 8vw, 7rem);
  --text-display-xl: clamp(2.5rem, 5vw, 4.5rem);
  --text-display-lg: clamp(2rem, 4vw, 3.25rem);
  --text-heading-lg: clamp(1.5rem, 3vw, 2rem);
  --text-heading-md: 1.25rem;
  --text-body-lg: 1.125rem;
  --text-body-md: 1rem;
  --text-body-sm: 0.875rem;
  --text-caption: 0.75rem;

  /* Line heights */
  --leading-display: 1.05;
  --leading-heading: 1.2;
  --leading-body: 1.65;
  --leading-caption: 1.4;
}

```

# packages/ui/src/index.ts
```ts
/**
 * Stillwater UI — Barrel Export
 *
 * Currently empty — components will be added in later phases
 * (Radix-based Button, Input, Dialog, etc. per PAD §11.6).
 *
 * Token CSS is imported separately via:
 *   @import '@stillwater/ui/globals';
 */

// Component exports will be added here as components are built.
// export * from './components/Button';
// export * from './components/Input';
// export * from './components/Dialog';
// etc.

```

# packages/ui/src/globals.css
```css
/* Stillwater — Global Stylesheet */
/* Imported by apps/web/src/app/globals.css via: @import '@stillwater/ui/globals'; */

/* Load all design tokens */
@import './tokens/index.css';

/* Load all font face declarations */
@import './fonts/index.css';

/* ── Reset ──────────────────────────────────────────────────── */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  -webkit-text-size-adjust: 100%;
  -moz-text-size-adjust: 100%;
  text-size-adjust: 100%;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font-body);
  font-size: var(--text-body-md);
  line-height: var(--leading-body);
  color: var(--color-text-primary);
  background-color: var(--color-background);
  min-height: 100vh;
}

/* ── Focus visible (WCAG 2.2 AAA) ──────────────────────────── */
/* With --radius: 0 (sharp edges), focus rings are the ONLY
   interactive affordance — they must be prominent (3px). */
:focus-visible {
  outline: 3px solid var(--color-water-500);
  outline-offset: 2px;
  border-radius: 0;
}

/* ── Headings ──────────────────────────────────────────────── */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display);
  font-weight: 300;
  line-height: var(--leading-display);
  text-wrap: balance;
}

/* ── Links ─────────────────────────────────────────────────── */
a {
  color: var(--color-action);
  text-decoration: none;
  transition: color var(--duration-quick) var(--ease-gentle);
}

a:hover {
  color: var(--color-action-hover);
}

/* ── Images ────────────────────────────────────────────────── */
img, picture, video, canvas, svg {
  display: block;
  max-width: 100%;
}

/* ── Inputs ────────────────────────────────────────────────── */
input, button, textarea, select {
  font: inherit;
  color: inherit;
}

button {
  cursor: pointer;
  background: none;
  border: none;
}

/* ── Accessibility utilities ───────────────────────────────── */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

```

# packages/auth/tsconfig.json
```json
{
  "extends": "@stillwater/typescript-config/library",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "tsBuildInfoFile": ".turbo/tsconfig.tsbuildinfo"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", ".turbo"]
}

```

# packages/auth/package.json
```json
{
  "name": "@stillwater/auth",
  "version": "0.0.0",
  "private": true,
  "exports": {
    ".": {
      "@stillwater/source": "./src/index.ts",
      "default": "./dist/index.js"
    },
    "./client": {
      "@stillwater/source": "./src/client.ts",
      "default": "./dist/client.js"
    }
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc --build",
    "dev": "tsc --build --watch",
    "clean": "rm -rf dist .turbo",
    "check-types": "tsc --noEmit"
  },
  "dependencies": {
    "@stillwater/config": "workspace:*",
    "@stillwater/db": "workspace:*",
    "better-auth": "^1.6.23",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@stillwater/typescript-config": "workspace:*",
    "@types/node": "^22.13.4",
    "typescript": "^5.7.3"
  }
}

```

# packages/api/tsconfig.json
```json
{
  "extends": "@stillwater/typescript-config/library",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "tsBuildInfoFile": ".turbo/tsconfig.tsbuildinfo"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", ".turbo"]
}

```

# packages/api/package.json
```json
{
  "name": "@stillwater/api",
  "version": "0.0.0",
  "private": true,
  "exports": {
    ".": {
      "@stillwater/source": "./src/index.ts",
      "default": "./dist/index.js"
    },
    "./trpc": {
      "@stillwater/source": "./src/trpc.ts",
      "default": "./dist/trpc.js"
    },
    "./root": {
      "@stillwater/source": "./src/root.ts",
      "default": "./dist/root.js"
    }
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc --build",
    "dev": "tsc --build --watch",
    "clean": "rm -rf dist .turbo",
    "check-types": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@stillwater/config": "workspace:*",
    "@stillwater/db": "workspace:*",
    "@stillwater/payments": "workspace:*",
    "@trpc/server": "^11.0.0",
    "@upstash/ratelimit": "^2.0.5",
    "@upstash/redis": "^1.34.3",
    "better-auth": "^1.6.23",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@stillwater/typescript-config": "workspace:*",
    "@types/node": "^22.13.4",
    "@vitest/coverage-v8": "^3.0.5",
    "typescript": "^5.7.3",
    "vitest": "^3.0.5"
  }
}

```

# packages/payments/tsconfig.json
```json
{
  "extends": "@stillwater/typescript-config/library",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "tsBuildInfoFile": ".turbo/tsconfig.tsbuildinfo"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", ".turbo"]
}

```

# packages/payments/package.json
```json
{
  "name": "@stillwater/payments",
  "version": "0.0.0",
  "private": true,
  "exports": {
    ".": {
      "@stillwater/source": "./src/index.ts",
      "default": "./dist/index.js"
    },
    "./webhooks": {
      "@stillwater/source": "./src/webhooks.ts",
      "default": "./dist/webhooks.js"
    }
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc --build",
    "dev": "tsc --build --watch",
    "clean": "rm -rf dist .turbo",
    "check-types": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@stillwater/config": "workspace:*",
    "@stillwater/db": "workspace:*",
    "stripe": "^17.6.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@stillwater/typescript-config": "workspace:*",
    "@types/node": "^22.13.4",
    "@vitest/coverage-v8": "^3.0.5",
    "typescript": "^5.7.3",
    "vitest": "^3.0.5"
  }
}

```

# packages/email/tsconfig.json
```json
{
  "extends": "@stillwater/typescript-config/library",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "tsBuildInfoFile": ".turbo/tsconfig.tsbuildinfo",
    "jsx": "react-jsx"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist", ".turbo"]
}

```

# packages/email/package.json
```json
{
  "name": "@stillwater/email",
  "version": "0.0.0",
  "private": true,
  "exports": {
    ".": {
      "@stillwater/source": "./src/index.ts",
      "default": "./dist/index.js"
    },
    "./templates/*": {
      "@stillwater/source": "./src/templates/*.tsx",
      "default": "./dist/templates/*.js"
    }
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc --build",
    "dev": "email dev --dir src/templates --port 3333",
    "clean": "rm -rf dist .turbo",
    "check-types": "tsc --noEmit",
    "preview": "email preview"
  },
  "dependencies": {
    "@react-email/components": "^0.0.36",
    "@react-email/render": "^1.0.5",
    "@stillwater/config": "workspace:*",
    "react": "^19.0.0",
    "resend": "^4.1.2"
  },
  "devDependencies": {
    "@react-email/cli": "^0.0.33",
    "@stillwater/typescript-config": "workspace:*",
    "@types/node": "^22.13.4",
    "@types/react": "^19.0.8",
    "typescript": "^5.7.3"
  },
  "peerDependencies": {
    "react": "^19.0.0"
  }
}

```

# packages/config/tsconfig.json
```json
{
  "extends": "@stillwater/typescript-config/library",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "tsBuildInfoFile": ".turbo/tsconfig.tsbuildinfo"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", ".turbo"]
}

```

# packages/config/package.json
```json
{
  "name": "@stillwater/config",
  "version": "0.0.0",
  "private": true,
  "exports": {
    ".": {
      "@stillwater/source": "./src/index.ts",
      "default": "./dist/index.js"
    },
    "./env": {
      "@stillwater/source": "./src/env.ts",
      "default": "./dist/env.js"
    }
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc --build",
    "dev": "tsc --build --watch",
    "clean": "rm -rf dist .turbo",
    "check-types": "tsc --noEmit"
  },
  "dependencies": {
    "@t3-oss/env-core": "^0.12.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@stillwater/typescript-config": "workspace:*",
    "@types/node": "^22.13.4",
    "typescript": "^5.7.3"
  }
}

```

# packages/config/src/env.ts
```ts
/**
 * Stillwater — Environment Variable Schema (t3-env + Zod)
 *
 * Single source of truth for all environment variables. Every package
 * that needs env access imports from @stillwater/config/env.
 *
 * Direct process.env.* reads bypass validation — typos like
 * GOOGLE_CLIENTID (missing underscore) silently return undefined.
 * Always import env from this module.
 *
 * F0-06: Phase 0 critical file. Every package depends on this.
 */

import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

/**
 * Build-context fallback: next build and vitest don't have real env vars.
 * Return placeholders instead of throwing.
 */
function isBuildContext(): boolean {
  return (
    process.env['NEXT_PHASE'] === 'phase-production-build' ||
    process.env['NODE_ENV'] === 'test'
  );
}

const PLACEHOLDERS = {
  DATABASE_URL: 'postgresql://placeholder@localhost:5432/placeholder',
  DATABASE_URL_UNPOOLED: 'postgresql://placeholder@localhost:5432/placeholder',
  BETTER_AUTH_SECRET: 'placeholder-secret-at-least-32-characters-long',
  BETTER_AUTH_URL: 'http://localhost:3000',
  GOOGLE_CLIENT_ID: 'placeholder.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'placeholder',
  STRIPE_SECRET_KEY: 'sk_test_placeholder',
  STRIPE_WEBHOOK_SECRET: 'whsec_placeholder',
  RESEND_API_KEY: 're_placeholder',
  EMAIL_FROM: 'hello@stillwater.studio',
  TRIGGER_SECRET_KEY: 'tr_dev_placeholder',
  UPSTASH_REDIS_REST_URL: 'https://placeholder.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'placeholder',
  SANITY_API_TOKEN: 'placeholder',
  SANITY_WEBHOOK_SECRET: 'placeholder',
  CLOUDFLARE_ACCOUNT_ID: 'placeholder',
  CLOUDFLARE_IMAGES_TOKEN: 'placeholder',
  CLOUDFLARE_R2_ACCESS_KEY_ID: 'placeholder',
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: 'placeholder',
  CLOUDFLARE_R2_BUCKET: 'stillwater-media',
  CLOUDFLARE_R2_ENDPOINT: 'https://placeholder.r2.cloudflarestorage.com',
} as const;

const envSchema = {
  server: {
    // Database
    DATABASE_URL: z
      .string()
      .refine((s) => s.startsWith('postgres'), 'Must be a postgresql:// URL'),
    DATABASE_URL_UNPOOLED: z
      .string()
      .refine((s) => s.startsWith('postgres'), 'Must be a postgresql:// URL'),

    // Auth (Better Auth)
    BETTER_AUTH_SECRET: z
      .string()
      .min(32, 'BETTER_AUTH_SECRET must be at least 32 characters')
      .superRefine((val, ctx) => {
        const weak = ['dev-secret', 'test-secret', 'ci-dummy', 'change-me', 'placeholder-secret'];
        if (weak.some((w) => val.toLowerCase().includes(w))) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Weak secret rejected — use: openssl rand -base64 32',
          });
        }
      }),
    BETTER_AUTH_URL: z.string().url(),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),

    // Stripe
    STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),

    // Sanity
    SANITY_API_TOKEN: z.string(),
    SANITY_WEBHOOK_SECRET: z.string(),

    // Email
    RESEND_API_KEY: z.string().startsWith('re_'),
    EMAIL_FROM: z.string().email(),

    // Background jobs
    TRIGGER_SECRET_KEY: z.string().startsWith('tr_'),

    // Redis
    UPSTASH_REDIS_REST_URL: z.string().url(),
    UPSTASH_REDIS_REST_TOKEN: z.string(),

    // Observability (optional — not needed in dev)
    SENTRY_DSN: z.string().url().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),
    AXIOM_TOKEN: z.string().optional(),
    AXIOM_DATASET: z.string().optional(),

    // Cloudflare
    CLOUDFLARE_ACCOUNT_ID: z.string(),
    CLOUDFLARE_IMAGES_TOKEN: z.string(),
    CLOUDFLARE_R2_ACCESS_KEY_ID: z.string(),
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string(),
    CLOUDFLARE_R2_BUCKET: z.string(),
    CLOUDFLARE_R2_ENDPOINT: z.string().url(),

    // App
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
  },

  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
    NEXT_PUBLIC_SANITY_PROJECT_ID: z.string(),
    NEXT_PUBLIC_SANITY_DATASET: z.string(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().url(),
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
    NEXT_PUBLIC_CLOUDFLARE_IMAGES_URL: z.string().url(),
  },

  runtimeEnv: {
    DATABASE_URL: process.env['DATABASE_URL'],
    DATABASE_URL_UNPOOLED: process.env['DATABASE_URL_UNPOOLED'],
    BETTER_AUTH_SECRET: process.env['BETTER_AUTH_SECRET'],
    BETTER_AUTH_URL: process.env['BETTER_AUTH_URL'],
    GOOGLE_CLIENT_ID: process.env['GOOGLE_CLIENT_ID'],
    GOOGLE_CLIENT_SECRET: process.env['GOOGLE_CLIENT_SECRET'],
    STRIPE_SECRET_KEY: process.env['STRIPE_SECRET_KEY'],
    STRIPE_WEBHOOK_SECRET: process.env['STRIPE_WEBHOOK_SECRET'],
    SANITY_API_TOKEN: process.env['SANITY_API_TOKEN'],
    SANITY_WEBHOOK_SECRET: process.env['SANITY_WEBHOOK_SECRET'],
    RESEND_API_KEY: process.env['RESEND_API_KEY'],
    EMAIL_FROM: process.env['EMAIL_FROM'],
    TRIGGER_SECRET_KEY: process.env['TRIGGER_SECRET_KEY'],
    UPSTASH_REDIS_REST_URL: process.env['UPSTASH_REDIS_REST_URL'],
    UPSTASH_REDIS_REST_TOKEN: process.env['UPSTASH_REDIS_REST_TOKEN'],
    SENTRY_DSN: process.env['SENTRY_DSN'],
    SENTRY_AUTH_TOKEN: process.env['SENTRY_AUTH_TOKEN'],
    AXIOM_TOKEN: process.env['AXIOM_TOKEN'],
    AXIOM_DATASET: process.env['AXIOM_DATASET'],
    CLOUDFLARE_ACCOUNT_ID: process.env['CLOUDFLARE_ACCOUNT_ID'],
    CLOUDFLARE_IMAGES_TOKEN: process.env['CLOUDFLARE_IMAGES_TOKEN'],
    CLOUDFLARE_R2_ACCESS_KEY_ID: process.env['CLOUDFLARE_R2_ACCESS_KEY_ID'],
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: process.env['CLOUDFLARE_R2_SECRET_ACCESS_KEY'],
    CLOUDFLARE_R2_BUCKET: process.env['CLOUDFLARE_R2_BUCKET'],
    CLOUDFLARE_R2_ENDPOINT: process.env['CLOUDFLARE_R2_ENDPOINT'],
    NODE_ENV: process.env['NODE_ENV'],
    NEXT_PUBLIC_APP_URL: process.env['NEXT_PUBLIC_APP_URL'],
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'],
    NEXT_PUBLIC_SANITY_PROJECT_ID: process.env['NEXT_PUBLIC_SANITY_PROJECT_ID'],
    NEXT_PUBLIC_SANITY_DATASET: process.env['NEXT_PUBLIC_SANITY_DATASET'],
    NEXT_PUBLIC_POSTHOG_KEY: process.env['NEXT_PUBLIC_POSTHOG_KEY'],
    NEXT_PUBLIC_POSTHOG_HOST: process.env['NEXT_PUBLIC_POSTHOG_HOST'],
    NEXT_PUBLIC_SENTRY_DSN: process.env['NEXT_PUBLIC_SENTRY_DSN'],
    NEXT_PUBLIC_CLOUDFLARE_IMAGES_URL: process.env['NEXT_PUBLIC_CLOUDFLARE_IMAGES_URL'],
  },
};

/**
 * Load env with build-context fallback.
 * During `next build` or `vitest`, return placeholders instead of throwing.
 */
function loadEnv() {
  if (isBuildContext()) {
    // Return placeholders merged with any real env vars that ARE set
    const serverEntries = Object.entries(envSchema.server).map(([key, _]) => [
      key,
      process.env[key] ?? PLACEHOLDERS[key as keyof typeof PLACEHOLDERS] ?? 'placeholder',
    ]);
    const clientEntries = Object.entries(envSchema.client).map(([key, _]) => [
      key,
      process.env[key] ?? 'placeholder',
    ]);
    return Object.fromEntries([...serverEntries, ...clientEntries]) as Record<string, string>;
  }

  return createEnv(envSchema);
}

export const env = loadEnv();

```

# packages/config/src/index.ts
```ts
export * from './env';

```

# playwright.config.ts
```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: [
    ['html'],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
    },
  ],
  webServer: {
    command: 'pnpm dev --filter=web',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
  },
});

```

# pnpm-workspace.yaml
```yaml
# Stillwater Monorepo — pnpm workspace configuration
# All packages and apps declared here are linked locally via workspace: protocol

packages:
  # Primary applications
  - "apps/*"

  # Shared packages (libraries consumed by apps and services)
  - "packages/*"

  # Background job workers (Trigger.dev)
  - "services/*"

  # Shared tooling configurations (ESLint, TypeScript, Tailwind)
  - "tooling/*"

# Custom condition for monorepo source-resolution (D15)
# Without this, pnpm resolves @stillwater/* packages to non-existent dist/
customConditions:
  - "@stillwater/source"

```

# services/workers/tsconfig.json
```json
{
  "extends": "@stillwater/typescript-config/base",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    "rootDir": "src",
    "outDir": "dist",
    "noEmit": true,
    "tsBuildInfoFile": ".turbo/tsconfig.tsbuildinfo"
  },
  "include": ["src/**/*.ts", "trigger.config.ts"],
  "exclude": ["node_modules", "dist", ".turbo"]
}

```

# services/workers/package.json
```json
{
  "name": "@stillwater/workers",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "trigger dev",
    "deploy": "trigger deploy",
    "clean": "rm -rf .turbo",
    "check-types": "tsc --noEmit",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "@stillwater/config": "workspace:*",
    "@stillwater/db": "workspace:*",
    "@stillwater/email": "workspace:*",
    "@trigger.dev/sdk": "^3.3.17",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@stillwater/eslint-config": "workspace:*",
    "@stillwater/typescript-config": "workspace:*",
    "@types/node": "^22.13.4",
    "typescript": "^5.7.3"
  }
}

```

# services/workers/trigger.config.ts
```ts
/**
 * Stillwater — Trigger.dev v3 Configuration
 *
 * All background jobs are registered here and deployed
 * to Trigger.dev Cloud independently of the Next.js app.
 *
 * Job catalog — see PAD § 17.1 for full documentation:
 *   - booking-confirmation     On booking mutation
 *   - class-reminder-24h       Scheduled 24h before session
 *   - class-reminder-1h        Scheduled 1h before session
 *   - waitlist-promotion       On enrollment cancellation
 *   - waitlist-expiry          Scheduled at offer expiry time
 *   - membership-credit-grant  On Stripe invoice.paid
 *   - membership-expiry-warn   Scheduled 3 days before renewal
 *   - payment-failed-notify    On Stripe invoice.payment_failed
 *   - weekly-digest            Cron: Sunday 09:00
 *   - attendance-summary       Cron: Daily 23:00
 */

import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  // ── Project identity ────────────────────────────────────────────
  // In development: reads from TRIGGER_SECRET_KEY in .env
  project:
    process.env["NODE_ENV"] === "production"
      ? "stillwater-prod"
      : "stillwater-dev",

  // ── Runtime ────────────────────────────────────────────────────
  runtime: "node",

  // ── Source directories to scan for tasks ────────────────────────
  dirs: ["./src"],

  // ── Logging ────────────────────────────────────────────────────
  logLevel: process.env["NODE_ENV"] === "production" ? "info" : "debug",

  // ── Default retry policy ────────────────────────────────────────
  // Individual tasks can override this
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1_000,
      maxTimeoutInMs: 30_000,
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
      DATABASE_URL: process.env["DATABASE_URL"] ?? "",
      DATABASE_URL_UNPOOLED: process.env["DATABASE_URL_UNPOOLED"] ?? "",
      RESEND_API_KEY: process.env["RESEND_API_KEY"] ?? "",
      EMAIL_FROM: process.env["EMAIL_FROM"] ?? "",
      NEXT_PUBLIC_APP_URL: process.env["NEXT_PUBLIC_APP_URL"] ?? "",
      STRIPE_SECRET_KEY: process.env["STRIPE_SECRET_KEY"] ?? "",
    },
  },
});

```

# static_landing_page_mockup.html
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Stillwater — A Yoga Studio</title>
  <meta name="description" content="A sanctuary for mindful movement in the heart of Portland. Book classes, manage your membership, and return to yourself." />

  <!-- Fonts: Cormorant Garamond (display) + DM Sans (body) — self-hosted in prod -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap" rel="stylesheet" />

  <style>
    /* ═══════════════════════════════════════════════════
       STILLWATER — DESIGN SYSTEM TOKENS
       "Editorial Calm" — Warm Mineral Palette
    ═══════════════════════════════════════════════════ */

    :root {
      /* Typography */
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-body: 'DM Sans', system-ui, sans-serif;

      /* Stone — foundation */
      --stone-950: #0F0D0B;
      --stone-900: #1C1915;
      --stone-700: #3D3832;
      --stone-500: #6E6760;
      --stone-400: #8C7B6E;
      --stone-300: #B0A49A;
      --stone-200: #D4CFC9;
      --stone-100: #E8E3DC;
      --stone-50:  #F5F0E8;

      /* Clay — primary action (terracotta) */
      --clay-600: #8A4030;
      --clay-500: #9E5E44;
      --clay-400: #C4856A;
      --clay-300: #D9A48F;
      --clay-200: #EDD4C8;
      --clay-100: #F7EDE8;

      /* Water — accent (muted teal) */
      --water-600: #4A7280;
      --water-500: #7B9EA8;
      --water-300: #B8CDD4;
      --water-100: #E8F0F3;

      /* Sand — surfaces */
      --sand:      #F5F0E8;
      --sand-warm: #EDE5D8;
      --sand-deep: #E2D8CB;

      /* Semantic */
      --bg:             var(--sand);
      --surface:        var(--sand-warm);
      --border:         var(--stone-200);
      --text-primary:   var(--stone-900);
      --text-secondary: var(--stone-400);
      --text-tertiary:  var(--stone-300);
      --action:         var(--clay-400);
      --action-hover:   var(--clay-500);
      --accent:         var(--water-500);

      /* Spacing */
      --sp-1: 4px;   --sp-2: 8px;   --sp-3: 12px;
      --sp-4: 16px;  --sp-5: 24px;  --sp-6: 32px;
      --sp-7: 48px;  --sp-8: 64px;  --sp-9: 96px;
      --sp-10: 128px; --sp-11: 192px;

      /* Motion */
      --ease-gentle: cubic-bezier(0.16, 1, 0.3, 1);
      --ease-breathe: cubic-bezier(0.45, 0, 0.55, 1);
      --dur-quick: 150ms;
      --dur-std: 300ms;
      --dur-slow: 600ms;

      /* Layout */
      --max-w: 1360px;
      --nav-h: 64px;
    }

    /* ─── Reset ─── */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html {
      font-size: 16px;
      scroll-behavior: smooth;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    body {
      background-color: var(--bg);
      color: var(--text-primary);
      font-family: var(--font-body);
      font-size: 1rem;
      line-height: 1.65;
      overflow-x: hidden;
    }

    img { display: block; max-width: 100%; }
    button { cursor: pointer; border: none; background: none; font-family: inherit; }
    a { color: inherit; text-decoration: none; }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
      }
    }

    /* ─── Utilities ─── */
    .visually-hidden {
      position: absolute; width: 1px; height: 1px;
      padding: 0; margin: -1px; overflow: hidden;
      clip: rect(0,0,0,0); border: 0;
    }

    .rule { border: none; border-top: 1px solid var(--border); }
    .rule--clay { border-top-color: var(--clay-400); }
    .rule--strong { border-top-color: var(--stone-700); }

    /* ═══════════════════════════════════════════════════
       NAVIGATION
    ═══════════════════════════════════════════════════ */

    .nav {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 100;
      height: var(--nav-h);
      background: var(--bg);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      padding: 0 var(--sp-6);
      transition: transform var(--dur-std) var(--ease-gentle),
                  background var(--dur-std) ease;
    }

    .nav--hidden {
      transform: translateY(-100%);
    }

    .nav--scrolled {
      background: rgba(245, 240, 232, 0.95);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }

    .nav__inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      max-width: var(--max-w);
      margin: 0 auto;
    }

    .nav__wordmark {
      font-family: var(--font-display);
      font-weight: 300;
      font-size: 1.375rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--text-primary);
      transition: opacity var(--dur-quick) ease;
    }

    .nav__wordmark:hover { opacity: 0.65; }

    .nav__links {
      display: flex;
      align-items: center;
      gap: var(--sp-7);
      list-style: none;
    }

    .nav__link {
      font-size: 0.8125rem;
      font-weight: 400;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-secondary);
      transition: color var(--dur-quick) ease;
      position: relative;
    }

    .nav__link::after {
      content: '';
      position: absolute;
      bottom: -2px; left: 0;
      width: 0; height: 1px;
      background: var(--action);
      transition: width var(--dur-std) var(--ease-gentle);
    }

    .nav__link:hover { color: var(--text-primary); }
    .nav__link:hover::after { width: 100%; }

    .nav__cta {
      font-size: 0.8125rem;
      font-weight: 500;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--bg);
      background: var(--clay-400);
      padding: var(--sp-2) var(--sp-5);
      transition: background var(--dur-quick) ease,
                  transform var(--dur-quick) ease;
    }

    .nav__cta:hover {
      background: var(--clay-500);
      transform: translateY(-1px);
    }

    .nav__cta:active { transform: translateY(0); }

    /* ═══════════════════════════════════════════════════
       HERO — Editorial Asymmetric Split
    ═══════════════════════════════════════════════════ */

    .hero {
      min-height: 100svh;
      padding-top: var(--nav-h);
      display: grid;
      grid-template-columns: 1fr 1px minmax(280px, 38%);
      max-width: var(--max-w);
      margin: 0 auto;
      padding-left: var(--sp-6);
      padding-right: var(--sp-6);
    }

    .hero__left {
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: var(--sp-9) var(--sp-8) var(--sp-9) 0;
    }

    .hero__eyebrow {
      display: flex;
      align-items: center;
      gap: var(--sp-4);
      margin-bottom: var(--sp-6);
    }

    .hero__eyebrow-line {
      width: 40px;
      height: 1px;
      background: var(--clay-400);
    }

    .hero__eyebrow-text {
      font-size: 0.75rem;
      font-weight: 400;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--clay-400);
    }

    .hero__headline {
      font-family: var(--font-display);
      font-weight: 300;
      font-size: clamp(3.5rem, 6.5vw, 7.5rem);
      line-height: 1.0;
      letter-spacing: -0.01em;
      color: var(--text-primary);
      margin-bottom: var(--sp-8);
    }

    .hero__headline em {
      font-style: italic;
      color: var(--clay-400);
    }

    .hero__meta {
      display: flex;
      align-items: center;
      gap: var(--sp-6);
    }

    .hero__meta-item {
      display: flex;
      flex-direction: column;
      gap: var(--sp-1);
    }

    .hero__meta-label {
      font-size: 0.6875rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--text-tertiary);
    }

    .hero__meta-value {
      font-family: var(--font-display);
      font-size: 1.125rem;
      font-weight: 400;
      color: var(--text-secondary);
    }

    .hero__divider {
      width: 1px;
      background: var(--border);
      margin: var(--sp-9) 0;
    }

    .hero__right {
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: var(--sp-9) 0 var(--sp-9) var(--sp-8);
      gap: var(--sp-8);
    }

    .hero__intro {
      font-size: 1.0625rem;
      line-height: 1.75;
      color: var(--text-secondary);
      font-weight: 300;
      max-width: 340px;
    }

    .hero__intro strong {
      font-weight: 500;
      color: var(--text-primary);
    }

    /* Next class card */
    .next-class {
      border: 1px solid var(--border);
      padding: var(--sp-5);
      background: var(--surface);
      position: relative;
      overflow: hidden;
    }

    .next-class::before {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 3px;
      background: var(--clay-400);
    }

    .next-class__label {
      font-size: 0.6875rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--clay-400);
      margin-bottom: var(--sp-3);
    }

    .next-class__name {
      font-family: var(--font-display);
      font-size: 1.5rem;
      font-weight: 400;
      color: var(--text-primary);
      margin-bottom: var(--sp-2);
    }

    .next-class__details {
      display: flex;
      gap: var(--sp-5);
      flex-wrap: wrap;
    }

    .next-class__detail {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: var(--sp-2);
    }

    .next-class__detail::before {
      content: '';
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--stone-300);
      flex-shrink: 0;
    }

    .next-class__spots {
      margin-top: var(--sp-4);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .spots-bar {
      display: flex;
      gap: 3px;
    }

    .spot {
      width: 18px;
      height: 3px;
      background: var(--stone-200);
      transition: background var(--dur-quick) ease;
    }

    .spot--taken { background: var(--clay-400); }

    .spots-label {
      font-size: 0.75rem;
      color: var(--text-tertiary);
      letter-spacing: 0.06em;
    }

    .hero__actions {
      display: flex;
      flex-direction: column;
      gap: var(--sp-3);
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--sp-3);
      padding: var(--sp-4) var(--sp-6);
      background: var(--text-primary);
      color: var(--bg);
      font-size: 0.8125rem;
      font-weight: 500;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-family: var(--font-body);
      transition: background var(--dur-quick) ease,
                  transform var(--dur-quick) ease;
    }

    .btn-primary:hover {
      background: var(--clay-400);
      transform: translateY(-1px);
    }

    .btn-primary:active { transform: translateY(0); }

    .btn-primary .arrow {
      transition: transform var(--dur-std) var(--ease-gentle);
    }

    .btn-primary:hover .arrow { transform: translateX(4px); }

    .btn-ghost {
      display: inline-flex;
      align-items: center;
      gap: var(--sp-3);
      padding: var(--sp-4) var(--sp-6);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      font-size: 0.8125rem;
      font-weight: 400;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-family: var(--font-body);
      transition: border-color var(--dur-quick) ease,
                  color var(--dur-quick) ease;
    }

    .btn-ghost:hover {
      border-color: var(--text-primary);
      color: var(--text-primary);
    }

    /* ═══════════════════════════════════════════════════
       MARQUEE — Kinetic Typography Strip
    ═══════════════════════════════════════════════════ */

    .marquee-strip {
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      overflow: hidden;
      padding: var(--sp-3) 0;
      background: var(--surface);
    }

    .marquee-track {
      display: flex;
      gap: 0;
      animation: marquee 32s linear infinite;
      width: max-content;
    }

    .marquee-track:hover { animation-play-state: paused; }

    @keyframes marquee {
      from { transform: translateX(0); }
      to   { transform: translateX(-50%); }
    }

    .marquee-item {
      display: flex;
      align-items: center;
      gap: var(--sp-5);
      padding: 0 var(--sp-7);
      flex-shrink: 0;
      white-space: nowrap;
    }

    .marquee-item__name {
      font-family: var(--font-display);
      font-size: 1.0625rem;
      font-weight: 300;
      font-style: italic;
      color: var(--text-secondary);
      letter-spacing: 0.02em;
    }

    .marquee-item__time {
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--text-tertiary);
    }

    .marquee-dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--clay-400);
      flex-shrink: 0;
    }

    /* ═══════════════════════════════════════════════════
       SECTION SHELL — Shared layout
    ═══════════════════════════════════════════════════ */

    .section {
      max-width: var(--max-w);
      margin: 0 auto;
      padding: var(--sp-11) var(--sp-6);
    }

    .section-full {
      padding: var(--sp-11) 0;
    }

    .section-full > * {
      max-width: var(--max-w);
      margin: 0 auto;
      padding-left: var(--sp-6);
      padding-right: var(--sp-6);
    }

    .section-header {
      display: flex;
      align-items: flex-start;
      gap: var(--sp-7);
      margin-bottom: var(--sp-9);
    }

    .section-number {
      font-family: var(--font-display);
      font-size: clamp(5rem, 10vw, 9rem);
      font-weight: 300;
      line-height: 0.85;
      color: var(--stone-100);
      flex-shrink: 0;
      user-select: none;
      margin-top: -0.1em;
    }

    .section-title-group {
      padding-top: var(--sp-4);
      border-top: 1px solid var(--border);
      flex: 1;
    }

    .section-label {
      font-size: 0.6875rem;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--clay-400);
      margin-bottom: var(--sp-3);
    }

    .section-title {
      font-family: var(--font-display);
      font-size: clamp(2rem, 4vw, 3.25rem);
      font-weight: 300;
      line-height: 1.15;
      color: var(--text-primary);
    }

    .section-desc {
      margin-top: var(--sp-4);
      font-size: 1rem;
      color: var(--text-secondary);
      line-height: 1.75;
      max-width: 540px;
    }

    /* ═══════════════════════════════════════════════════
       § 01 — PHILOSOPHY
    ═══════════════════════════════════════════════════ */

    .philosophy {
      background: var(--sand-deep);
    }

    .philosophy-inner {
      max-width: var(--max-w);
      margin: 0 auto;
      padding: var(--sp-11) var(--sp-6);
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: var(--sp-8);
      align-items: center;
    }

    .philosophy__vertical-text {
      font-size: 0.6875rem;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      color: var(--text-tertiary);
      writing-mode: vertical-rl;
      text-orientation: mixed;
      transform: rotate(180deg);
    }

    .philosophy__content {
      text-align: center;
      padding: var(--sp-8) var(--sp-6);
    }

    .philosophy__quote {
      font-family: var(--font-display);
      font-size: clamp(2rem, 4.5vw, 4rem);
      font-weight: 300;
      font-style: italic;
      line-height: 1.25;
      color: var(--text-primary);
      margin-bottom: var(--sp-7);
    }

    .philosophy__quote span {
      color: var(--clay-400);
      font-style: normal;
    }

    .philosophy__body {
      font-size: 1rem;
      line-height: 1.8;
      color: var(--text-secondary);
      max-width: 540px;
      margin: 0 auto;
      font-weight: 300;
    }

    .philosophy__ornament {
      font-family: var(--font-display);
      font-size: 5rem;
      line-height: 1;
      color: var(--stone-200);
      font-weight: 300;
      user-select: none;
    }

    /* ═══════════════════════════════════════════════════
       § 02 — SCHEDULE
    ═══════════════════════════════════════════════════ */

    .schedule-tabs {
      display: flex;
      gap: 0;
      border-bottom: 1px solid var(--border);
      margin-bottom: var(--sp-7);
    }

    .schedule-tab {
      padding: var(--sp-3) var(--sp-5);
      font-size: 0.8125rem;
      font-weight: 400;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-tertiary);
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: color var(--dur-quick) ease,
                  border-color var(--dur-quick) ease;
      font-family: var(--font-body);
    }

    .schedule-tab:hover { color: var(--text-primary); }

    .schedule-tab--active {
      color: var(--text-primary);
      border-bottom-color: var(--clay-400);
    }

    .schedule-day { display: none; }
    .schedule-day--active { display: block; }

    .class-item {
      display: grid;
      grid-template-columns: 100px 1fr auto auto;
      align-items: center;
      gap: var(--sp-5);
      padding: var(--sp-5) var(--sp-4);
      border-bottom: 1px solid var(--border);
      transition: background var(--dur-quick) ease;
      cursor: pointer;
      position: relative;
    }

    .class-item:first-child { border-top: 1px solid var(--border); }

    .class-item:hover {
      background: var(--clay-100);
    }

    .class-item::before {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 0;
      background: var(--clay-400);
      transition: width var(--dur-std) var(--ease-gentle);
    }

    .class-item:hover::before,
    .class-item--expanded::before { width: 3px; }

    .class-item--expanded { background: var(--clay-100); }

    .class-time {
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 400;
      color: var(--text-primary);
      line-height: 1.1;
    }

    .class-time-ampm {
      font-size: 0.75rem;
      font-weight: 400;
      color: var(--text-tertiary);
      letter-spacing: 0.06em;
      font-family: var(--font-body);
    }

    .class-info { min-width: 0; }

    .class-name {
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 400;
      color: var(--text-primary);
      margin-bottom: var(--sp-1);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .class-meta {
      display: flex;
      gap: var(--sp-4);
      flex-wrap: wrap;
    }

    .class-meta-item {
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    .class-level {
      display: inline-flex;
      align-items: center;
      padding: 2px var(--sp-3);
      font-size: 0.6875rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-weight: 500;
    }

    .level--all        { background: var(--water-100); color: var(--water-600); }
    .level--beginner   { background: #E8F5EE; color: #3A7D50; }
    .level--intermediate { background: var(--clay-100); color: var(--clay-500); }
    .level--advanced   { background: var(--stone-100); color: var(--stone-700); }

    .class-spots {
      text-align: right;
    }

    .class-spots-count {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-primary);
    }

    .class-spots-label {
      font-size: 0.6875rem;
      color: var(--text-tertiary);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .class-spots--few .class-spots-count { color: var(--clay-500); }
    .class-spots--full .class-spots-count { color: var(--stone-400); }

    /* Expanded detail panel */
    .class-detail {
      overflow: hidden;
      max-height: 0;
      transition: max-height var(--dur-std) var(--ease-gentle),
                  padding var(--dur-std) var(--ease-gentle);
      background: var(--clay-100);
      border-bottom: 1px solid var(--border);
    }

    .class-detail--open {
      max-height: 200px;
    }

    .class-detail-inner {
      display: grid;
      grid-template-columns: 100px 1fr auto;
      gap: var(--sp-5);
      padding: var(--sp-4) var(--sp-4) var(--sp-5);
      align-items: start;
    }

    .class-detail-desc {
      font-size: 0.9375rem;
      color: var(--text-secondary);
      line-height: 1.65;
      padding-top: var(--sp-1);
    }

    .btn-book-class {
      display: inline-flex;
      align-items: center;
      gap: var(--sp-2);
      padding: var(--sp-3) var(--sp-5);
      background: var(--text-primary);
      color: var(--bg);
      font-size: 0.75rem;
      font-weight: 500;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-family: var(--font-body);
      align-self: flex-start;
      transition: background var(--dur-quick) ease;
      white-space: nowrap;
    }

    .btn-book-class:hover { background: var(--clay-400); }

    /* ═══════════════════════════════════════════════════
       § 03 — INSTRUCTORS
    ═══════════════════════════════════════════════════ */

    .instructors-grid {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .instructor-row {
      display: grid;
      gap: 0;
      border-bottom: 1px solid var(--border);
    }

    .instructor-row:first-child { border-top: 1px solid var(--border); }

    .instructor-row--left {
      grid-template-columns: 1fr 1fr;
    }

    .instructor-row--right {
      grid-template-columns: 1fr 1fr;
    }

    .instructor-portrait {
      aspect-ratio: 3/4;
      background: var(--sand-deep);
      overflow: hidden;
      position: relative;
    }

    .instructor-row--right .instructor-portrait {
      order: 2;
    }

    .instructor-portrait-bg {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }

    /* Elegant SVG portrait placeholders */
    .portrait-placeholder {
      width: 100%;
      height: 100%;
    }

    .instructor-content {
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: var(--sp-9) var(--sp-8);
    }

    .instructor-row--right .instructor-content {
      order: 1;
    }

    .instructor-number {
      font-family: var(--font-display);
      font-size: 5rem;
      font-weight: 300;
      color: var(--stone-100);
      line-height: 1;
      margin-bottom: var(--sp-5);
    }

    .instructor-name {
      font-family: var(--font-display);
      font-size: clamp(2rem, 3.5vw, 3rem);
      font-weight: 300;
      color: var(--text-primary);
      margin-bottom: var(--sp-2);
      line-height: 1.1;
    }

    .instructor-specialty {
      font-size: 0.8125rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--clay-400);
      margin-bottom: var(--sp-6);
    }

    .instructor-bio {
      font-size: 1rem;
      color: var(--text-secondary);
      line-height: 1.75;
      font-weight: 300;
      max-width: 380px;
      margin-bottom: var(--sp-6);
    }

    .instructor-tags {
      display: flex;
      flex-wrap: wrap;
      gap: var(--sp-2);
    }

    .instructor-tag {
      font-size: 0.6875rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--text-tertiary);
      border: 1px solid var(--border);
      padding: var(--sp-1) var(--sp-3);
    }

    .instructor-link {
      display: inline-flex;
      align-items: center;
      gap: var(--sp-2);
      margin-top: var(--sp-5);
      font-size: 0.8125rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border);
      padding-bottom: var(--sp-1);
      transition: color var(--dur-quick) ease,
                  border-color var(--dur-quick) ease;
    }

    .instructor-link:hover {
      color: var(--clay-400);
      border-color: var(--clay-400);
    }

    .instructor-link .arrow {
      transition: transform var(--dur-std) var(--ease-gentle);
    }

    .instructor-link:hover .arrow { transform: translateX(4px); }

    /* ═══════════════════════════════════════════════════
       § 04 — MEMBERSHIP
    ═══════════════════════════════════════════════════ */

    .membership-table {
      display: grid;
      grid-template-columns: 220px repeat(3, 1fr);
      border: 1px solid var(--border);
      overflow: hidden;
    }

    .mem-header {
      padding: var(--sp-6);
      background: var(--surface);
      border-right: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
    }

    .mem-header:last-child { border-right: none; }

    .mem-header--feature {
      display: flex;
      align-items: flex-end;
    }

    .mem-header--feature span {
      font-size: 0.6875rem;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--text-tertiary);
    }

    .mem-plan-name {
      font-family: var(--font-display);
      font-size: 1.5rem;
      font-weight: 400;
      color: var(--text-primary);
      margin-bottom: var(--sp-2);
    }

    .mem-plan-tag {
      font-size: 0.6875rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--clay-400);
      margin-bottom: var(--sp-4);
    }

    .mem-plan-price {
      font-family: var(--font-display);
      font-size: 2.5rem;
      font-weight: 300;
      color: var(--text-primary);
      line-height: 1;
    }

    .mem-plan-price sup {
      font-size: 1rem;
      vertical-align: super;
      font-family: var(--font-body);
      font-weight: 400;
    }

    .mem-plan-period {
      font-size: 0.8125rem;
      color: var(--text-tertiary);
      margin-top: var(--sp-1);
    }

    .mem-header--featured {
      background: var(--text-primary);
      position: relative;
    }

    .mem-header--featured .mem-plan-name,
    .mem-header--featured .mem-plan-price { color: var(--bg); }
    .mem-header--featured .mem-plan-period { color: var(--stone-400); }
    .mem-header--featured .mem-plan-tag { color: var(--clay-300); }

    .mem-featured-badge {
      position: absolute;
      top: var(--sp-4); right: var(--sp-4);
      font-size: 0.625rem;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--clay-300);
      border: 1px solid var(--clay-600);
      padding: 2px var(--sp-2);
    }

    .mem-row {
      display: contents;
    }

    .mem-cell {
      padding: var(--sp-4) var(--sp-6);
      border-right: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      font-size: 0.9375rem;
      color: var(--text-secondary);
    }

    .mem-cell:last-child { border-right: none; }
    .mem-cell:nth-last-child(-n+4) { border-bottom: none; }

    .mem-cell--label {
      font-size: 0.8125rem;
      font-weight: 400;
      color: var(--text-tertiary);
      letter-spacing: 0.02em;
    }

    .mem-cell--featured {
      background: var(--sand-warm);
    }

    .mem-check {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--text-primary);
      color: var(--bg);
      font-size: 0.625rem;
      flex-shrink: 0;
    }

    .mem-check--clay { background: var(--clay-400); }

    .mem-dash {
      width: 16px;
      height: 1px;
      background: var(--stone-200);
    }

    .mem-footer {
      display: grid;
      grid-template-columns: 220px repeat(3, 1fr);
      border: 1px solid var(--border);
      border-top: none;
    }

    .mem-footer-cell {
      padding: var(--sp-5) var(--sp-6);
      border-right: 1px solid var(--border);
      display: flex;
      align-items: center;
    }

    .mem-footer-cell:first-child { background: var(--surface); }
    .mem-footer-cell:last-child { border-right: none; }

    .mem-footer-cell--featured { background: var(--clay-100); }

    .btn-plan {
      width: 100%;
      padding: var(--sp-3) var(--sp-4);
      font-size: 0.75rem;
      font-weight: 500;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-family: var(--font-body);
      text-align: center;
      transition: background var(--dur-quick) ease,
                  color var(--dur-quick) ease;
    }

    .btn-plan--ghost {
      border: 1px solid var(--border);
      color: var(--text-secondary);
    }

    .btn-plan--ghost:hover {
      border-color: var(--text-primary);
      color: var(--text-primary);
    }

    .btn-plan--filled {
      background: var(--clay-400);
      color: var(--bg);
    }

    .btn-plan--filled:hover { background: var(--clay-500); }

    /* Trial notice */
    .membership-note {
      margin-top: var(--sp-6);
      display: flex;
      align-items: center;
      gap: var(--sp-4);
      color: var(--text-tertiary);
      font-size: 0.875rem;
    }

    .membership-note::before {
      content: '';
      display: inline-block;
      width: 20px;
      height: 1px;
      background: var(--stone-300);
      flex-shrink: 0;
    }

    /* ═══════════════════════════════════════════════════
       § 05 — STUDIO SPACE
    ═══════════════════════════════════════════════════ */

    .studio-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      grid-template-rows: auto;
      gap: 0;
      border: 1px solid var(--border);
      overflow: hidden;
    }

    .studio-block {
      position: relative;
    }

    .studio-block--image {
      aspect-ratio: 1;
      overflow: hidden;
    }

    .studio-block--image-tall {
      grid-row: span 2;
      aspect-ratio: auto;
    }

    .studio-image-placeholder {
      width: 100%;
      height: 100%;
      min-height: 260px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .studio-block--text {
      padding: var(--sp-8) var(--sp-7);
      background: var(--surface);
      display: flex;
      flex-direction: column;
      justify-content: center;
      border-left: 1px solid var(--border);
      border-top: 1px solid var(--border);
    }

    .studio-block--dark {
      background: var(--stone-900);
    }

    .studio-stat-number {
      font-family: var(--font-display);
      font-size: clamp(3rem, 5vw, 5rem);
      font-weight: 300;
      color: var(--text-primary);
      line-height: 1;
      margin-bottom: var(--sp-2);
    }

    .studio-block--dark .studio-stat-number {
      color: var(--bg);
    }

    .studio-stat-label {
      font-size: 0.8125rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--text-secondary);
    }

    .studio-block--dark .studio-stat-label {
      color: var(--stone-400);
    }

    .studio-block-title {
      font-family: var(--font-display);
      font-size: 1.75rem;
      font-weight: 300;
      color: var(--text-primary);
      margin-bottom: var(--sp-3);
      line-height: 1.2;
    }

    .studio-block-text {
      font-size: 0.9375rem;
      color: var(--text-secondary);
      line-height: 1.7;
      font-weight: 300;
    }

    /* ═══════════════════════════════════════════════════
       CTA BAND
    ═══════════════════════════════════════════════════ */

    .cta-band {
      background: var(--stone-900);
      padding: var(--sp-11) var(--sp-6);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cta-band-inner {
      max-width: var(--max-w);
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: var(--sp-8);
      width: 100%;
    }

    .cta-band-title {
      font-family: var(--font-display);
      font-size: clamp(2rem, 4vw, 3.5rem);
      font-weight: 300;
      color: var(--bg);
      line-height: 1.15;
    }

    .cta-band-title em {
      font-style: italic;
      color: var(--clay-300);
    }

    .cta-band-sub {
      font-size: 1rem;
      color: var(--stone-400);
      margin-top: var(--sp-4);
      line-height: 1.65;
      font-weight: 300;
      max-width: 460px;
    }

    .cta-band-actions {
      display: flex;
      flex-direction: column;
      gap: var(--sp-3);
      flex-shrink: 0;
      min-width: 200px;
    }

    .btn-band-primary {
      padding: var(--sp-4) var(--sp-7);
      background: var(--clay-400);
      color: var(--bg);
      font-size: 0.8125rem;
      font-weight: 500;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-family: var(--font-body);
      text-align: center;
      transition: background var(--dur-quick) ease;
    }

    .btn-band-primary:hover { background: var(--clay-300); }

    .btn-band-ghost {
      padding: var(--sp-4) var(--sp-7);
      border: 1px solid var(--stone-700);
      color: var(--stone-400);
      font-size: 0.8125rem;
      font-weight: 400;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-family: var(--font-body);
      text-align: center;
      transition: border-color var(--dur-quick) ease,
                  color var(--dur-quick) ease;
    }

    .btn-band-ghost:hover {
      border-color: var(--stone-400);
      color: var(--bg);
    }

    /* ═══════════════════════════════════════════════════
       FOOTER
    ═══════════════════════════════════════════════════ */

    .footer {
      background: var(--bg);
      border-top: 1px solid var(--border);
    }

    .footer-main {
      max-width: var(--max-w);
      margin: 0 auto;
      padding: var(--sp-9) var(--sp-6);
      display: grid;
      grid-template-columns: 1.5fr 1fr 1fr 1fr;
      gap: var(--sp-8);
    }

    .footer-brand-title {
      font-family: var(--font-display);
      font-size: 1.375rem;
      font-weight: 300;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--text-primary);
      margin-bottom: var(--sp-4);
    }

    .footer-brand-text {
      font-size: 0.9375rem;
      color: var(--text-secondary);
      line-height: 1.7;
      font-weight: 300;
      margin-bottom: var(--sp-6);
    }

    .footer-address {
      font-size: 0.875rem;
      color: var(--text-tertiary);
      line-height: 1.9;
      font-style: normal;
    }

    .footer-col-title {
      font-size: 0.6875rem;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--text-primary);
      font-weight: 500;
      margin-bottom: var(--sp-5);
    }

    .footer-links {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: var(--sp-3);
    }

    .footer-link {
      font-size: 0.9375rem;
      color: var(--text-secondary);
      transition: color var(--dur-quick) ease;
    }

    .footer-link:hover { color: var(--clay-400); }

    .footer-hours {
      display: flex;
      flex-direction: column;
      gap: var(--sp-2);
    }

    .footer-hour-row {
      display: flex;
      justify-content: space-between;
      gap: var(--sp-5);
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .footer-hour-day {
      color: var(--text-tertiary);
      font-size: 0.8125rem;
      letter-spacing: 0.04em;
    }

    .footer-bottom {
      border-top: 1px solid var(--border);
      max-width: var(--max-w);
      margin: 0 auto;
      padding: var(--sp-5) var(--sp-6);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .footer-bottom-text {
      font-size: 0.8125rem;
      color: var(--text-tertiary);
    }

    .footer-bottom-links {
      display: flex;
      gap: var(--sp-6);
      list-style: none;
    }

    .footer-bottom-link {
      font-size: 0.8125rem;
      color: var(--text-tertiary);
      transition: color var(--dur-quick) ease;
    }

    .footer-bottom-link:hover { color: var(--text-secondary); }

    /* Watermark */
    .footer-watermark {
      text-align: center;
      padding: var(--sp-7) var(--sp-6) var(--sp-9);
      overflow: hidden;
      border-top: 1px solid var(--stone-100);
    }

    .footer-watermark-text {
      font-family: var(--font-display);
      font-size: clamp(4rem, 14vw, 12rem);
      font-weight: 300;
      color: var(--stone-100);
      letter-spacing: 0.1em;
      user-select: none;
      line-height: 1;
    }

    /* ═══════════════════════════════════════════════════
       NEWSLETTER FORM
    ═══════════════════════════════════════════════════ */

    .newsletter-form {
      display: flex;
      gap: 0;
      margin-top: var(--sp-5);
    }

    .newsletter-input {
      flex: 1;
      padding: var(--sp-3) var(--sp-4);
      border: 1px solid var(--border);
      border-right: none;
      background: var(--bg);
      font-family: var(--font-body);
      font-size: 0.875rem;
      color: var(--text-primary);
      outline: none;
      transition: border-color var(--dur-quick) ease;
      min-width: 0;
    }

    .newsletter-input::placeholder { color: var(--text-tertiary); }

    .newsletter-input:focus {
      border-color: var(--clay-400);
    }

    .newsletter-btn {
      padding: var(--sp-3) var(--sp-5);
      background: var(--text-primary);
      color: var(--bg);
      font-size: 0.75rem;
      font-weight: 500;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-family: var(--font-body);
      flex-shrink: 0;
      transition: background var(--dur-quick) ease;
    }

    .newsletter-btn:hover { background: var(--clay-400); }

    /* ═══════════════════════════════════════════════════
       SCROLL PROGRESS BAR
    ═══════════════════════════════════════════════════ */

    .scroll-progress {
      position: fixed;
      top: var(--nav-h);
      left: 0;
      height: 2px;
      background: var(--clay-400);
      z-index: 99;
      transform-origin: left;
      transform: scaleX(0);
      transition: transform 0.1s linear;
    }

    /* ═══════════════════════════════════════════════════
       SECTION DIVIDER
    ═══════════════════════════════════════════════════ */

    .divider-full {
      width: 100%;
      height: 1px;
      background: var(--border);
    }

    /* ═══════════════════════════════════════════════════
       RESPONSIVE
    ═══════════════════════════════════════════════════ */

    @media (max-width: 1024px) {
      .hero {
        grid-template-columns: 1fr;
        min-height: auto;
      }
      .hero__divider { display: none; }
      .hero__left { padding: var(--sp-9) 0 var(--sp-7) 0; }
      .hero__right { padding: 0 0 var(--sp-9) 0; }

      .instructor-row--left,
      .instructor-row--right {
        grid-template-columns: 1fr;
      }
      .instructor-row--right .instructor-portrait { order: 0; }
      .instructor-row--right .instructor-content { order: 1; }

      .membership-table,
      .mem-footer {
        grid-template-columns: 1fr 1fr;
        grid-template-rows: auto auto;
      }
      .mem-header--feature { display: none; }

      .cta-band-inner {
        grid-template-columns: 1fr;
      }

      .footer-main {
        grid-template-columns: 1fr 1fr;
      }

      .studio-grid {
        grid-template-columns: 1fr 1fr;
      }
      .studio-block--image-tall { grid-row: span 1; }
    }

    @media (max-width: 768px) {
      :root { --nav-h: 56px; }

      .nav__links { display: none; }

      .hero__headline { font-size: clamp(3rem, 12vw, 5rem); }

      .philosophy-inner {
        grid-template-columns: 1fr;
      }
      .philosophy__vertical-text,
      .philosophy__ornament { display: none; }

      .class-item {
        grid-template-columns: 80px 1fr;
      }
      .class-level { display: none; }
      .class-spots { display: none; }
      .class-detail-inner { grid-template-columns: 1fr; }

      .membership-table,
      .mem-footer {
        grid-template-columns: 1fr;
      }

      .studio-grid { grid-template-columns: 1fr; }

      .footer-main {
        grid-template-columns: 1fr;
        gap: var(--sp-7);
      }

      .footer-bottom {
        flex-direction: column;
        gap: var(--sp-4);
        text-align: center;
      }
    }

    /* ═══════════════════════════════════════════════════
       PAGE REVEAL ANIMATION
    ═══════════════════════════════════════════════════ */

    .reveal {
      opacity: 0;
      transform: translateY(24px);
      transition: opacity var(--dur-slow) var(--ease-gentle),
                  transform var(--dur-slow) var(--ease-gentle);
    }

    .reveal--visible {
      opacity: 1;
      transform: translateY(0);
    }

    /* Staggered children */
    .reveal-stagger > * {
      opacity: 0;
      transform: translateY(16px);
      transition: opacity var(--dur-slow) var(--ease-gentle),
                  transform var(--dur-slow) var(--ease-gentle);
    }

    .reveal-stagger--visible > *:nth-child(1) { opacity: 1; transform: translateY(0); transition-delay: 0ms; }
    .reveal-stagger--visible > *:nth-child(2) { opacity: 1; transform: translateY(0); transition-delay: 80ms; }
    .reveal-stagger--visible > *:nth-child(3) { opacity: 1; transform: translateY(0); transition-delay: 160ms; }
    .reveal-stagger--visible > *:nth-child(4) { opacity: 1; transform: translateY(0); transition-delay: 240ms; }
    .reveal-stagger--visible > *:nth-child(5) { opacity: 1; transform: translateY(0); transition-delay: 320ms; }

    /* Focus visible styles */
    :focus-visible {
      outline: 2px solid var(--clay-400);
      outline-offset: 3px;
    }
  </style>
</head>

<body>

  <!-- Skip to main content — WCAG AAA -->
  <a href="#main" class="visually-hidden" style="
    position:fixed;top:var(--sp-4);left:var(--sp-4);z-index:999;
    padding:var(--sp-3) var(--sp-5);background:var(--clay-400);color:var(--bg);
    font-size:0.875rem;font-weight:500;letter-spacing:0.06em;
    transform:translateY(-100%);transition:transform var(--dur-quick) ease;
  " onfocus="this.style.transform='translateY(0)'" onblur="this.style.transform='translateY(-100%)'">
    Skip to main content
  </a>

  <!-- Scroll progress bar -->
  <div class="scroll-progress" id="scrollProgress" aria-hidden="true"></div>

  <!-- ═══════════════════════════════════════════════════
       NAVIGATION
  ═══════════════════════════════════════════════════ -->
  <header>
    <nav class="nav" id="nav" role="navigation" aria-label="Main navigation">
      <div class="nav__inner">
        <a href="/" class="nav__wordmark" aria-label="Stillwater Yoga — Home">Stillwater</a>

        <ul class="nav__links" role="list">
          <li><a href="#schedule" class="nav__link">Schedule</a></li>
          <li><a href="#instructors" class="nav__link">Instructors</a></li>
          <li><a href="#membership" class="nav__link">Membership</a></li>
          <li><a href="#studio" class="nav__link">Studio</a></li>
        </ul>

        <a href="#membership" class="nav__cta" aria-label="Book a class or view membership options">
          Book a Class
        </a>
      </div>
    </nav>
  </header>

  <!-- ═══════════════════════════════════════════════════
       MAIN CONTENT
  ═══════════════════════════════════════════════════ -->
  <main id="main">

    <!-- ─── HERO ─── -->
    <section class="hero" aria-labelledby="hero-headline">
      <div class="hero__left">
        <div class="hero__eyebrow reveal">
          <span class="hero__eyebrow-line" aria-hidden="true"></span>
          <span class="hero__eyebrow-text">Est. 2019 &nbsp;·&nbsp; Portland, Oregon</span>
        </div>

        <h1 class="hero__headline reveal" id="hero-headline">
          The practice<br />
          of <em>returning</em><br />
          to yourself.
        </h1>

        <div class="hero__meta reveal">
          <div class="hero__meta-item">
            <span class="hero__meta-label">Weekly Classes</span>
            <span class="hero__meta-value">42+</span>
          </div>
          <div class="hero__meta-item">
            <span class="hero__meta-label">Instructors</span>
            <span class="hero__meta-value">8</span>
          </div>
          <div class="hero__meta-item">
            <span class="hero__meta-label">Studio Rooms</span>
            <span class="hero__meta-value">3</span>
          </div>
        </div>
      </div>

      <div class="hero__divider" aria-hidden="true"></div>

      <div class="hero__right">
        <p class="hero__intro reveal">
          Stillwater is a sanctuary for <strong>mindful movement</strong> in the heart of Southeast Portland. Whether you're finding the mat for the first time or deepening a long practice, there is a class — and a community — waiting for you.
        </p>

        <!-- Live next class card -->
        <div class="next-class reveal" role="complementary" aria-label="Next available class">
          <p class="next-class__label">Next Class</p>
          <p class="next-class__name">Morning Vinyasa Flow</p>
          <div class="next-class__details">
            <span class="next-class__detail">Today, 7:00 AM</span>
            <span class="next-class__detail">60 min</span>
            <span class="next-class__detail">Mei Tanaka</span>
          </div>
          <div class="next-class__spots">
            <div>
              <div class="spots-bar" aria-label="4 of 16 spots taken" role="img">
                <div class="spot spot--taken"></div>
                <div class="spot spot--taken"></div>
                <div class="spot spot--taken"></div>
                <div class="spot spot--taken"></div>
                <div class="spot"></div>
                <div class="spot"></div>
                <div class="spot"></div>
                <div class="spot"></div>
                <div class="spot"></div>
                <div class="spot"></div>
                <div class="spot"></div>
                <div class="spot"></div>
              </div>
            </div>
            <span class="spots-label">8 spots left</span>
          </div>
        </div>

        <div class="hero__actions reveal-stagger">
          <a href="#membership" class="btn-primary">
            Start Your Practice
            <span class="arrow" aria-hidden="true">→</span>
          </a>
          <a href="#schedule" class="btn-ghost">
            View Full Schedule
          </a>
        </div>
      </div>
    </section>

    <!-- ─── MARQUEE ─── -->
    <div class="marquee-strip" aria-hidden="true">
      <div class="marquee-track" role="presentation">
        <!-- Set 1 -->
        <div class="marquee-item">
          <span class="marquee-dot"></span>
          <span class="marquee-item__name">Morning Vinyasa Flow</span>
          <span class="marquee-item__time">7:00 AM — Mei Tanaka</span>
        </div>
        <div class="marquee-item">
          <span class="marquee-dot"></span>
          <span class="marquee-item__name">Restorative Yoga</span>
          <span class="marquee-item__time">9:30 AM — Soren Vass</span>
        </div>
        <div class="marquee-item">
          <span class="marquee-dot"></span>
          <span class="marquee-item__name">Yin &amp; Meditation</span>
          <span class="marquee-item__time">12:00 PM — Aiko Mori</span>
        </div>
        <div class="marquee-item">
          <span class="marquee-dot"></span>
          <span class="marquee-item__name">Ashtanga Primary Series</span>
          <span class="marquee-item__time">6:00 AM — James Harlow</span>
        </div>
        <div class="marquee-item">
          <span class="marquee-dot"></span>
          <span class="marquee-item__name">Candlelight Slow Flow</span>
          <span class="marquee-item__time">7:30 PM — Lucia Ferreira</span>
        </div>
        <div class="marquee-item">
          <span class="marquee-dot"></span>
          <span class="marquee-item__name">Pranayama &amp; Breathwork</span>
          <span class="marquee-item__time">10:00 AM — Aiko Mori</span>
        </div>
        <div class="marquee-item">
          <span class="marquee-dot"></span>
          <span class="marquee-item__name">Power Flow</span>
          <span class="marquee-item__time">5:30 PM — Marcus Webb</span>
        </div>
        <!-- Set 2 — mirror for seamless loop -->
        <div class="marquee-item">
          <span class="marquee-dot"></span>
          <span class="marquee-item__name">Morning Vinyasa Flow</span>
          <span class="marquee-item__time">7:00 AM — Mei Tanaka</span>
        </div>
        <div class="marquee-item">
          <span class="marquee-dot"></span>
          <span class="marquee-item__name">Restorative Yoga</span>
          <span class="marquee-item__time">9:30 AM — Soren Vass</span>
        </div>
        <div class="marquee-item">
          <span class="marquee-dot"></span>
          <span class="marquee-item__name">Yin &amp; Meditation</span>
          <span class="marquee-item__time">12:00 PM — Aiko Mori</span>
        </div>
        <div class="marquee-item">
          <span class="marquee-dot"></span>
          <span class="marquee-item__name">Ashtanga Primary Series</span>
          <span class="marquee-item__time">6:00 AM — James Harlow</span>
        </div>
        <div class="marquee-item">
          <span class="marquee-dot"></span>
          <span class="marquee-item__name">Candlelight Slow Flow</span>
          <span class="marquee-item__time">7:30 PM — Lucia Ferreira</span>
        </div>
        <div class="marquee-item">
          <span class="marquee-dot"></span>
          <span class="marquee-item__name">Pranayama &amp; Breathwork</span>
          <span class="marquee-item__time">10:00 AM — Aiko Mori</span>
        </div>
        <div class="marquee-item">
          <span class="marquee-dot"></span>
          <span class="marquee-item__name">Power Flow</span>
          <span class="marquee-item__time">5:30 PM — Marcus Webb</span>
        </div>
      </div>
    </div>

    <!-- ─── § 01 PHILOSOPHY ─── -->
    <section aria-labelledby="philosophy-title">
      <div class="philosophy">
        <div class="philosophy-inner">
          <p class="philosophy__vertical-text" aria-hidden="true">Our Philosophy</p>

          <div class="philosophy__content reveal">
            <p class="philosophy__quote" id="philosophy-title">
              "Yoga is not about <span>touching your toes.</span><br />
              It's about what you learn on the way down."
            </p>
            <p class="philosophy__body">
              We believe the mat is a mirror. What surfaces in practice — the resistance, the ease, the unexpected stillness — reflects what is already within you. Stillwater exists not to give you a workout, but to give you back to yourself, breath by breath.
            </p>
          </div>

          <p class="philosophy__ornament" aria-hidden="true">間</p>
        </div>
      </div>
    </section>

    <!-- ─── § 02 SCHEDULE ─── -->
    <section id="schedule" class="section" aria-labelledby="schedule-title">
      <div class="section-header reveal">
        <div class="section-number" aria-hidden="true">02</div>
        <div class="section-title-group">
          <p class="section-label">Weekly Schedule</p>
          <h2 class="section-title" id="schedule-title">Find your class.<br />Find your time.</h2>
          <p class="section-desc">Every session is a fresh beginning. Browse by day, filter by level, and reserve your spot — all in one place.</p>
        </div>
      </div>

      <!-- Day tabs -->
      <div class="schedule-tabs" role="tablist" aria-label="Days of the week">
        <button class="schedule-tab schedule-tab--active" role="tab" aria-selected="true" aria-controls="day-mon" id="tab-mon" onclick="switchDay('mon', this)">Mon</button>
        <button class="schedule-tab" role="tab" aria-selected="false" aria-controls="day-tue" id="tab-tue" onclick="switchDay('tue', this)">Tue</button>
        <button class="schedule-tab" role="tab" aria-selected="false" aria-controls="day-wed" id="tab-wed" onclick="switchDay('wed', this)">Wed</button>
        <button class="schedule-tab" role="tab" aria-selected="false" aria-controls="day-thu" id="tab-thu" onclick="switchDay('thu', this)">Thu</button>
        <button class="schedule-tab" role="tab" aria-selected="false" aria-controls="day-fri" id="tab-fri" onclick="switchDay('fri', this)">Fri</button>
        <button class="schedule-tab" role="tab" aria-selected="false" aria-controls="day-sat" id="tab-sat" onclick="switchDay('sat', this)">Sat</button>
        <button class="schedule-tab" role="tab" aria-selected="false" aria-controls="day-sun" id="tab-sun" onclick="switchDay('sun', this)">Sun</button>
      </div>

      <!-- Monday -->
      <div class="schedule-day schedule-day--active" id="day-mon" role="tabpanel" aria-labelledby="tab-mon">

        <div class="class-item" id="class-mon-1" onclick="toggleClass('class-mon-1')" role="button" aria-expanded="false" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')toggleClass('class-mon-1')">
          <div class="class-time">6:00<span class="class-time-ampm"> am</span></div>
          <div class="class-info">
            <div class="class-name">Ashtanga Primary Series</div>
            <div class="class-meta">
              <span class="class-meta-item">James Harlow</span>
              <span class="class-meta-item">90 min &nbsp;·&nbsp; Main Hall</span>
            </div>
          </div>
          <span class="class-level level--advanced">Advanced</span>
          <div class="class-spots">
            <div class="class-spots-count">4</div>
            <div class="class-spots-label">spots left</div>
          </div>
        </div>
        <div class="class-detail" id="detail-class-mon-1" aria-live="polite">
          <div class="class-detail-inner">
            <div></div>
            <p class="class-detail-desc">The traditional sequence of postures as codified by Sri K. Pattabhi Jois. A dynamic, flowing practice that builds internal heat and strength. Prior yoga experience required — this class is not suitable for beginners.</p>
            <button class="btn-book-class">Reserve Spot →</button>
          </div>
        </div>

        <div class="class-item" id="class-mon-2" onclick="toggleClass('class-mon-2')" role="button" aria-expanded="false" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')toggleClass('class-mon-2')">
          <div class="class-time">7:00<span class="class-time-ampm"> am</span></div>
          <div class="class-info">
            <div class="class-name">Morning Vinyasa Flow</div>
            <div class="class-meta">
              <span class="class-meta-item">Mei Tanaka</span>
              <span class="class-meta-item">60 min &nbsp;·&nbsp; Sunrise Room</span>
            </div>
          </div>
          <span class="class-level level--all">All Levels</span>
          <div class="class-spots">
            <div class="class-spots-count">8</div>
            <div class="class-spots-label">spots left</div>
          </div>
        </div>
        <div class="class-detail" id="detail-class-mon-2" aria-live="polite">
          <div class="class-detail-inner">
            <div></div>
            <p class="class-detail-desc">Begin your week with intention. This breath-synchronized flow moves through standing sequences and gentle backbends, waking the body with grace. Suitable for practitioners of all experience levels.</p>
            <button class="btn-book-class">Reserve Spot →</button>
          </div>
        </div>

        <div class="class-item" id="class-mon-3" onclick="toggleClass('class-mon-3')" role="button" aria-expanded="false" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')toggleClass('class-mon-3')">
          <div class="class-time">9:30<span class="class-time-ampm"> am</span></div>
          <div class="class-info">
            <div class="class-name">Gentle &amp; Restorative</div>
            <div class="class-meta">
              <span class="class-meta-item">Soren Vass</span>
              <span class="class-meta-item">75 min &nbsp;·&nbsp; Stillness Room</span>
            </div>
          </div>
          <span class="class-level level--beginner">Beginner</span>
          <div class="class-spots">
            <div class="class-spots-count">12</div>
            <div class="class-spots-label">spots left</div>
          </div>
        </div>
        <div class="class-detail" id="detail-class-mon-3" aria-live="polite">
          <div class="class-detail-inner">
            <div></div>
            <p class="class-detail-desc">Props-supported postures held for extended periods, inviting the nervous system to downregulate and release. Perfect for beginners, those returning from injury, or anyone who needs deep rest.</p>
            <button class="btn-book-class">Reserve Spot →</button>
          </div>
        </div>

        <div class="class-item" id="class-mon-4" onclick="toggleClass('class-mon-4')" role="button" aria-expanded="false" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')toggleClass('class-mon-4')">
          <div class="class-time">12:00<span class="class-time-ampm"> pm</span></div>
          <div class="class-info">
            <div class="class-name">Yin &amp; Meditation</div>
            <div class="class-meta">
              <span class="class-meta-item">Aiko Mori</span>
              <span class="class-meta-item">60 min &nbsp;·&nbsp; Sunrise Room</span>
            </div>
          </div>
          <span class="class-level level--all">All Levels</span>
          <div class="class-spots class-spots--few">
            <div class="class-spots-count">2</div>
            <div class="class-spots-label">spots left</div>
          </div>
        </div>
        <div class="class-detail" id="detail-class-mon-4" aria-live="polite">
          <div class="class-detail-inner">
            <div></div>
            <p class="class-detail-desc">Long-held floor postures target the connective tissue and fascia, followed by a 15-minute guided meditation. A midday reset for the mind and body. Only 2 spots remaining — book now.</p>
            <button class="btn-book-class">Reserve Spot →</button>
          </div>
        </div>

        <div class="class-item" id="class-mon-5" onclick="toggleClass('class-mon-5')" role="button" aria-expanded="false" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')toggleClass('class-mon-5')">
          <div class="class-time">5:30<span class="class-time-ampm"> pm</span></div>
          <div class="class-info">
            <div class="class-name">Power Flow</div>
            <div class="class-meta">
              <span class="class-meta-item">Marcus Webb</span>
              <span class="class-meta-item">60 min &nbsp;·&nbsp; Main Hall</span>
            </div>
          </div>
          <span class="class-level level--intermediate">Intermediate</span>
          <div class="class-spots class-spots--full">
            <div class="class-spots-count">Full</div>
            <div class="class-spots-label">Waitlist open</div>
          </div>
        </div>
        <div class="class-detail" id="detail-class-mon-5" aria-live="polite">
          <div class="class-detail-inner">
            <div></div>
            <p class="class-detail-desc">High-energy vinyasa with challenging sequences, arm balances, and inversions. This class will push your edge and build strength. This session is currently full — join the waitlist to claim a spot if one opens.</p>
            <button class="btn-book-class">Join Waitlist →</button>
          </div>
        </div>

        <div class="class-item" id="class-mon-6" onclick="toggleClass('class-mon-6')" role="button" aria-expanded="false" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')toggleClass('class-mon-6')">
          <div class="class-time">7:30<span class="class-time-ampm"> pm</span></div>
          <div class="class-info">
            <div class="class-name">Candlelight Slow Flow</div>
            <div class="class-meta">
              <span class="class-meta-item">Lucia Ferreira</span>
              <span class="class-meta-item">75 min &nbsp;·&nbsp; Stillness Room</span>
            </div>
          </div>
          <span class="class-level level--all">All Levels</span>
          <div class="class-spots">
            <div class="class-spots-count">6</div>
            <div class="class-spots-label">spots left</div>
          </div>
        </div>
        <div class="class-detail" id="detail-class-mon-6" aria-live="polite">
          <div class="class-detail-inner">
            <div></div>
            <p class="class-detail-desc">End your day in the warm glow of candlelight. A slow, mindful movement practice designed to transition body and mind from the activity of the day into the stillness of evening. All levels welcome.</p>
            <button class="btn-book-class">Reserve Spot →</button>
          </div>
        </div>

      </div><!-- /day-mon -->

      <!-- Tuesday (condensed for brevity — same structure) -->
      <div class="schedule-day" id="day-tue" role="tabpanel" aria-labelledby="tab-tue">
        <div class="class-item" id="class-tue-1" onclick="toggleClass('class-tue-1')" role="button" aria-expanded="false" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')toggleClass('class-tue-1')">
          <div class="class-time">6:30<span class="class-time-ampm"> am</span></div>
          <div class="class-info">
            <div class="class-name">Sunrise Hatha</div>
            <div class="class-meta"><span class="class-meta-item">Soren Vass</span><span class="class-meta-item">60 min &nbsp;·&nbsp; Main Hall</span></div>
          </div>
          <span class="class-level level--beginner">Beginner</span>
          <div class="class-spots"><div class="class-spots-count">10</div><div class="class-spots-label">spots left</div></div>
        </div>
        <div class="class-detail" id="detail-class-tue-1"><div class="class-detail-inner"><div></div><p class="class-detail-desc">A gentle classical yoga practice working through foundational postures with attention to alignment and breath. The perfect starting point for those new to yoga.</p><button class="btn-book-class">Reserve Spot →</button></div></div>

        <div class="class-item" id="class-tue-2" onclick="toggleClass('class-tue-2')" role="button" aria-expanded="false" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')toggleClass('class-tue-2')">
          <div class="class-time">10:00<span class="class-time-ampm"> am</span></div>
          <div class="class-info">
            <div class="class-name">Pranayama &amp; Breathwork</div>
            <div class="class-meta"><span class="class-meta-item">Aiko Mori</span><span class="class-meta-item">45 min &nbsp;·&nbsp; Stillness Room</span></div>
          </div>
          <span class="class-level level--all">All Levels</span>
          <div class="class-spots"><div class="class-spots-count">14</div><div class="class-spots-label">spots left</div></div>
        </div>
        <div class="class-detail" id="detail-class-tue-2"><div class="class-detail-inner"><div></div><p class="class-detail-desc">Explore the science and art of conscious breathing. From box breathing to kapalabhati to nadi shodhana, this class offers tools you can carry into daily life.</p><button class="btn-book-class">Reserve Spot →</button></div></div>

        <div class="class-item" id="class-tue-3" onclick="toggleClass('class-tue-3')" role="button" aria-expanded="false" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')toggleClass('class-tue-3')">
          <div class="class-time">6:00<span class="class-time-ampm"> pm</span></div>
          <div class="class-info">
            <div class="class-name">Vinyasa Fundamentals</div>
            <div class="class-meta"><span class="class-meta-item">Mei Tanaka</span><span class="class-meta-item">60 min &nbsp;·&nbsp; Sunrise Room</span></div>
          </div>
          <span class="class-level level--beginner">Beginner</span>
          <div class="class-spots"><div class="class-spots-count">7</div><div class="class-spots-label">spots left</div></div>
        </div>
        <div class="class-detail" id="detail-class-tue-3"><div class="class-detail-inner"><div></div><p class="class-detail-desc">A slower-paced vinyasa class that builds the vocabulary of flow yoga. Each transition is broken down so that students of any level can move with understanding and confidence.</p><button class="btn-book-class">Reserve Spot →</button></div></div>
      </div>

      <!-- Wed–Sun simplified panels -->
      <div class="schedule-day" id="day-wed" role="tabpanel" aria-labelledby="tab-wed">
        <div class="class-item" id="class-wed-1" onclick="toggleClass('class-wed-1')" role="button" aria-expanded="false" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')toggleClass('class-wed-1')">
          <div class="class-time">7:00<span class="class-time-ampm"> am</span></div>
          <div class="class-info"><div class="class-name">Morning Vinyasa Flow</div><div class="class-meta"><span class="class-meta-item">Lucia Ferreira</span><span class="class-meta-item">60 min &nbsp;·&nbsp; Main Hall</span></div></div>
          <span class="class-level level--all">All Levels</span>
          <div class="class-spots"><div class="class-spots-count">5</div><div class="class-spots-label">spots left</div></div>
        </div>
        <div class="class-detail" id="detail-class-wed-1"><div class="class-detail-inner"><div></div><p class="class-detail-desc">Wednesday's signature flow with Lucia — known for her musicality and poetic sequencing that makes every class feel like a moving meditation.</p><button class="btn-book-class">Reserve Spot →</button></div></div>

        <div class="class-item" id="class-wed-2" onclick="toggleClass('class-wed-2')" role="button" aria-expanded="false" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')toggleClass('class-wed-2')">
          <div class="class-time">12:15<span class="class-time-ampm"> pm</span></div>
          <div class="class-info"><div class="class-name">Chair Yoga</div><div class="class-meta"><span class="class-meta-item">Soren Vass</span><span class="class-meta-item">45 min &nbsp;·&nbsp; Stillness Room</span></div></div>
          <span class="class-level level--beginner">Beginner</span>
          <div class="class-spots"><div class="class-spots-count">16</div><div class="class-spots-label">spots left</div></div>
        </div>
        <div class="class-detail" id="detail-class-wed-2"><div class="class-detail-inner"><div></div><p class="class-detail-desc">Yoga adapted for those who need or prefer seated support. Accessible to everyone regardless of mobility or fitness level. No mat required — just a chair and a willingness to breathe.</p><button class="btn-book-class">Reserve Spot →</button></div></div>

        <div class="class-item" id="class-wed-3" onclick="toggleClass('class-wed-3')" role="button" aria-expanded="false" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')toggleClass('class-wed-3')">
          <div class="class-time">6:30<span class="class-time-ampm"> pm</span></div>
          <div class="class-info"><div class="class-name">Advanced Inversions Workshop</div><div class="class-meta"><span class="class-meta-item">James Harlow</span><span class="class-meta-item">90 min &nbsp;·&nbsp; Main Hall</span></div></div>
          <span class="class-level level--advanced">Advanced</span>
          <div class="class-spots class-spots--few"><div class="class-spots-count">3</div><div class="class-spots-label">spots left</div></div>
        </div>
        <div class="class-detail" id="detail-class-wed-3"><div class="class-detail-inner"><div></div><p class="class-detail-desc">Headstand, forearm stand, and handstand methodologies broken down with progressive drills and wall work. For experienced practitioners ready to go upside down with confidence.</p><button class="btn-book-class">Reserve Spot →</button></div></div>
      </div>

      <div class="schedule-day" id="day-thu" role="tabpanel" aria-labelledby="tab-thu">
        <div class="class-item" onclick="return false" role="button" aria-expanded="false" tabindex="0">
          <div class="class-time">6:00<span class="class-time-ampm"> am</span></div>
          <div class="class-info"><div class="class-name">Mysore Self-Practice</div><div class="class-meta"><span class="class-meta-item">James Harlow</span><span class="class-meta-item">120 min &nbsp;·&nbsp; Main Hall</span></div></div>
          <span class="class-level level--advanced">Advanced</span>
          <div class="class-spots"><div class="class-spots-count">8</div><div class="class-spots-label">spots left</div></div>
        </div>
        <div class="class-item" onclick="return false" role="button" aria-expanded="false" tabindex="0">
          <div class="class-time">9:30<span class="class-time-ampm"> am</span></div>
          <div class="class-info"><div class="class-name">Yoga Nidra</div><div class="class-meta"><span class="class-meta-item">Aiko Mori</span><span class="class-meta-item">60 min &nbsp;·&nbsp; Stillness Room</span></div></div>
          <span class="class-level level--all">All Levels</span>
          <div class="class-spots"><div class="class-spots-count">12</div><div class="class-spots-label">spots left</div></div>
        </div>
        <div class="class-item" onclick="return false" role="button" aria-expanded="false" tabindex="0">
          <div class="class-time">5:30<span class="class-time-ampm"> pm</span></div>
          <div class="class-info"><div class="class-name">Vinyasa Flow</div><div class="class-meta"><span class="class-meta-item">Marcus Webb</span><span class="class-meta-item">60 min &nbsp;·&nbsp; Main Hall</span></div></div>
          <span class="class-level level--intermediate">Intermediate</span>
          <div class="class-spots class-spots--few"><div class="class-spots-count">2</div><div class="class-spots-label">spots left</div></div>
        </div>
      </div>

      <div class="schedule-day" id="day-fri" role="tabpanel" aria-labelledby="tab-fri">
        <div class="class-item" onclick="return false" role="button" aria-expanded="false" tabindex="0">
          <div class="class-time">7:00<span class="class-time-ampm"> am</span></div>
          <div class="class-info"><div class="class-name">Rise &amp; Flow</div><div class="class-meta"><span class="class-meta-item">Mei Tanaka</span><span class="class-meta-item">60 min &nbsp;·&nbsp; Sunrise Room</span></div></div>
          <span class="class-level level--all">All Levels</span>
          <div class="class-spots"><div class="class-spots-count">9</div><div class="class-spots-label">spots left</div></div>
        </div>
        <div class="class-item" onclick="return false" role="button" aria-expanded="false" tabindex="0">
          <div class="class-time">12:00<span class="class-time-ampm"> pm</span></div>
          <div class="class-info"><div class="class-name">Lunchtime Yin</div><div class="class-meta"><span class="class-meta-item">Lucia Ferreira</span><span class="class-meta-item">45 min &nbsp;·&nbsp; Stillness Room</span></div></div>
          <span class="class-level level--all">All Levels</span>
          <div class="class-spots"><div class="class-spots-count">11</div><div class="class-spots-label">spots left</div></div>
        </div>
        <div class="class-item" onclick="return false" role="button" aria-expanded="false" tabindex="0">
          <div class="class-time">6:00<span class="class-time-ampm"> pm</span></div>
          <div class="class-info"><div class="class-name">Friday Flow</div><div class="class-meta"><span class="class-meta-item">Marcus Webb</span><span class="class-meta-item">75 min &nbsp;·&nbsp; Main Hall</span></div></div>
          <span class="class-level level--intermediate">Intermediate</span>
          <div class="class-spots class-spots--full"><div class="class-spots-count">Full</div><div class="class-spots-label">Waitlist open</div></div>
        </div>
      </div>

      <div class="schedule-day" id="day-sat" role="tabpanel" aria-labelledby="tab-sat">
        <div class="class-item" onclick="return false" role="button" aria-expanded="false" tabindex="0">
          <div class="class-time">8:00<span class="class-time-ampm"> am</span></div>
          <div class="class-info"><div class="class-name">Community Flow</div><div class="class-meta"><span class="class-meta-item">All Instructors</span><span class="class-meta-item">75 min &nbsp;·&nbsp; Main Hall</span></div></div>
          <span class="class-level level--all">All Levels</span>
          <div class="class-spots class-spots--few"><div class="class-spots-count">3</div><div class="class-spots-label">spots left</div></div>
        </div>
        <div class="class-item" onclick="return false" role="button" aria-expanded="false" tabindex="0">
          <div class="class-time">10:30<span class="class-time-ampm"> am</span></div>
          <div class="class-info"><div class="class-name">Vinyasa Masterclass</div><div class="class-meta"><span class="class-meta-item">James Harlow</span><span class="class-meta-item">90 min &nbsp;·&nbsp; Main Hall</span></div></div>
          <span class="class-level level--intermediate">Intermediate</span>
          <div class="class-spots"><div class="class-spots-count">6</div><div class="class-spots-label">spots left</div></div>
        </div>
        <div class="class-item" onclick="return false" role="button" aria-expanded="false" tabindex="0">
          <div class="class-time">1:00<span class="class-time-ampm"> pm</span></div>
          <div class="class-info"><div class="class-name">Aerial Yoga Introduction</div><div class="class-meta"><span class="class-meta-item">Soren Vass</span><span class="class-meta-item">60 min &nbsp;·&nbsp; Aerial Studio</span></div></div>
          <span class="class-level level--beginner">Beginner</span>
          <div class="class-spots"><div class="class-spots-count">8</div><div class="class-spots-label">spots left</div></div>
        </div>
      </div>

      <div class="schedule-day" id="day-sun" role="tabpanel" aria-labelledby="tab-sun">
        <div class="class-item" onclick="return false" role="button" aria-expanded="false" tabindex="0">
          <div class="class-time">9:00<span class="class-time-ampm"> am</span></div>
          <div class="class-info"><div class="class-name">Sunday Slow Flow</div><div class="class-meta"><span class="class-meta-item">Aiko Mori</span><span class="class-meta-item">90 min &nbsp;·&nbsp; Sunrise Room</span></div></div>
          <span class="class-level level--all">All Levels</span>
          <div class="class-spots"><div class="class-spots-count">10</div><div class="class-spots-label">spots left</div></div>
        </div>
        <div class="class-item" onclick="return false" role="button" aria-expanded="false" tabindex="0">
          <div class="class-time">11:30<span class="class-time-ampm"> am</span></div>
          <div class="class-info"><div class="class-name">Restorative &amp; Nidra</div><div class="class-meta"><span class="class-meta-item">Lucia Ferreira</span><span class="class-meta-item">90 min &nbsp;·&nbsp; Stillness Room</span></div></div>
          <span class="class-level level--all">All Levels</span>
          <div class="class-spots"><div class="class-spots-count">14</div><div class="class-spots-label">spots left</div></div>
        </div>
      </div>

    </section><!-- /schedule -->

    <div class="divider-full"></div>

    <!-- ─── § 03 INSTRUCTORS ─── -->
    <section id="instructors" aria-labelledby="instructors-title">
      <div class="section" style="padding-bottom: 0;">
        <div class="section-header reveal">
          <div class="section-number" aria-hidden="true">03</div>
          <div class="section-title-group">
            <p class="section-label">Our Instructors</p>
            <h2 class="section-title" id="instructors-title">Teachers who've<br />walked the path.</h2>
            <p class="section-desc">Every instructor at Stillwater brings decades of embodied practice and a genuine commitment to holding safe, transformative space for every student.</p>
          </div>
        </div>
      </div>

      <div class="instructors-grid" role="list">

        <!-- Instructor 1 — Mei Tanaka -->
        <article class="instructor-row instructor-row--left" role="listitem">
          <div class="instructor-portrait">
            <div class="instructor-portrait-bg" style="background: var(--sand-deep);">
              <svg class="portrait-placeholder" viewBox="0 0 480 640" fill="none" aria-hidden="true" role="img">
                <rect width="480" height="640" fill="#EDE5D8"/>
                <!-- Elegant abstract form -->
                <ellipse cx="240" cy="200" rx="80" ry="95" fill="#D4CFC9"/>
                <path d="M120 640 Q240 380 360 640" fill="#C4856A" opacity="0.15"/>
                <path d="M160 640 Q240 420 320 640" fill="#C4856A" opacity="0.2"/>
                <ellipse cx="240" cy="190" rx="55" ry="62" fill="#B0A49A" opacity="0.6"/>
                <circle cx="240" cy="160" r="45" fill="#8C7B6E" opacity="0.4"/>
                <!-- Hair suggestion -->
                <path d="M195 145 Q240 105 285 145 Q295 180 240 185 Q185 180 195 145Z" fill="#3D3832" opacity="0.5"/>
                <!-- Subtle body shape -->
                <path d="M150 640 Q180 480 240 440 Q300 480 330 640Z" fill="#D4CFC9" opacity="0.5"/>
                <!-- Text overlay -->
                <text x="240" y="550" text-anchor="middle" font-family="Georgia, serif" font-size="13" fill="#8C7B6E" letter-spacing="3" opacity="0.7">MEI TANAKA</text>
              </svg>
            </div>
          </div>
          <div class="instructor-content">
            <div class="instructor-number" aria-hidden="true">01</div>
            <h3 class="instructor-name">Mei Tanaka</h3>
            <p class="instructor-specialty">Vinyasa &amp; Pranayama</p>
            <p class="instructor-bio">
              Trained in Mysore, India under Sharath Jois, Mei brings twelve years of Ashtanga foundation to her vinyasa teaching. Her classes are known for their precision, warmth, and the quality of silence she creates within movement.
            </p>
            <div class="instructor-tags">
              <span class="instructor-tag">Ashtanga</span>
              <span class="instructor-tag">Vinyasa</span>
              <span class="instructor-tag">Pranayama</span>
              <span class="instructor-tag">Sanskrit</span>
            </div>
            <a href="/instructors/mei-tanaka" class="instructor-link">
              Full profile <span class="arrow" aria-hidden="true">→</span>
            </a>
          </div>
        </article>

        <!-- Instructor 2 — James Harlow -->
        <article class="instructor-row instructor-row--right" role="listitem">
          <div class="instructor-portrait" style="border-left: 1px solid var(--border);">
            <div class="instructor-portrait-bg" style="background: var(--stone-900);">
              <svg class="portrait-placeholder" viewBox="0 0 480 640" fill="none" aria-hidden="true">
                <rect width="480" height="640" fill="#2E2B26"/>
                <ellipse cx="240" cy="195" rx="85" ry="100" fill="#3D3832"/>
                <path d="M110 640 Q240 360 370 640" fill="#C4856A" opacity="0.12"/>
                <ellipse cx="240" cy="188" rx="58" ry="65" fill="#544F48" opacity="0.8"/>
                <circle cx="240" cy="155" r="48" fill="#6E6760" opacity="0.6"/>
                <path d="M190 140 Q240 95 290 140 Q302 178 240 183 Q178 178 190 140Z" fill="#1C1915" opacity="0.8"/>
                <path d="M145 640 Q185 470 240 430 Q295 470 335 640Z" fill="#3D3832" opacity="0.7"/>
                <text x="240" y="550" text-anchor="middle" font-family="Georgia, serif" font-size="13" fill="#6E6760" letter-spacing="3">JAMES HARLOW</text>
              </svg>
            </div>
          </div>
          <div class="instructor-content">
            <div class="instructor-number" aria-hidden="true">02</div>
            <h3 class="instructor-name">James Harlow</h3>
            <p class="instructor-specialty">Ashtanga &amp; Advanced Practice</p>
            <p class="instructor-bio">
              With over 20 years of dedicated Ashtanga practice, James holds authorisation directly from the Sri K. Pattabhi Jois Ashtanga Yoga Institute. He leads the Mysore programme and advanced workshops with equal parts rigor and compassion.
            </p>
            <div class="instructor-tags">
              <span class="instructor-tag">Mysore</span>
              <span class="instructor-tag">Inversions</span>
              <span class="instructor-tag">Adjustments</span>
              <span class="instructor-tag">Philosophy</span>
            </div>
            <a href="/instructors/james-harlow" class="instructor-link">
              Full profile <span class="arrow" aria-hidden="true">→</span>
            </a>
          </div>
        </article>

        <!-- Instructor 3 — Aiko Mori -->
        <article class="instructor-row instructor-row--left" role="listitem" style="border-top: 1px solid var(--border);">
          <div class="instructor-portrait" style="background: var(--water-100);">
            <div class="instructor-portrait-bg" style="background: var(--water-100);">
              <svg class="portrait-placeholder" viewBox="0 0 480 640" fill="none" aria-hidden="true">
                <rect width="480" height="640" fill="#E8F0F3"/>
                <ellipse cx="240" cy="200" rx="82" ry="97" fill="#B8CDD4"/>
                <path d="M115 640 Q240 370 365 640" fill="#7B9EA8" opacity="0.2"/>
                <ellipse cx="240" cy="192" rx="56" ry="63" fill="#9BBAC5" opacity="0.7"/>
                <circle cx="240" cy="160" r="46" fill="#7B9EA8" opacity="0.5"/>
                <path d="M192 144 Q240 100 288 144 Q300 180 240 186 Q180 180 192 144Z" fill="#4A7280" opacity="0.6"/>
                <path d="M148 640 Q183 472 240 435 Q297 472 332 640Z" fill="#B8CDD4" opacity="0.6"/>
                <text x="240" y="550" text-anchor="middle" font-family="Georgia, serif" font-size="13" fill="#5D8A99" letter-spacing="3">AIKO MORI</text>
              </svg>
            </div>
          </div>
          <div class="instructor-content">
            <div class="instructor-number" aria-hidden="true">03</div>
            <h3 class="instructor-name">Aiko Mori</h3>
            <p class="instructor-specialty">Yin, Meditation &amp; Yoga Nidra</p>
            <p class="instructor-bio">
              A former neuroscience researcher, Aiko bridges the ancient wisdom of contemplative practice with modern understanding of the nervous system. Her meditation and Yoga Nidra sessions regularly sell out within hours of opening.
            </p>
            <div class="instructor-tags">
              <span class="instructor-tag">Yin Yoga</span>
              <span class="instructor-tag">Yoga Nidra</span>
              <span class="instructor-tag">Mindfulness</span>
              <span class="instructor-tag">Neuroscience</span>
            </div>
            <a href="/instructors/aiko-mori" class="instructor-link">
              Full profile <span class="arrow" aria-hidden="true">→</span>
            </a>
          </div>
        </article>

      </div>

      <!-- View all instructors link -->
      <div class="section" style="padding-top: var(--sp-7); padding-bottom: var(--sp-9); text-align: right;">
        <a href="/instructors" class="instructor-link" style="display: inline-flex;">
          View all 8 instructors <span class="arrow" aria-hidden="true">→</span>
        </a>
      </div>
    </section>

    <div class="divider-full"></div>

    <!-- ─── § 04 MEMBERSHIP ─── -->
    <section id="membership" class="section" aria-labelledby="membership-title">
      <div class="section-header reveal">
        <div class="section-number" aria-hidden="true">04</div>
        <div class="section-title-group">
          <p class="section-label">Membership</p>
          <h2 class="section-title" id="membership-title">Your practice,<br />your commitment.</h2>
          <p class="section-desc">Three paths into regular practice. No long-term contracts. Pause or cancel any time — the studio should meet you where you are.</p>
        </div>
      </div>

      <!-- Membership comparison table -->
      <div class="reveal" role="region" aria-label="Membership plan comparison">
        <div class="membership-table" role="table">
          <!-- Header row -->
          <div class="mem-header mem-header--feature" role="columnheader">
            <span>What's included</span>
          </div>

          <div class="mem-header" role="columnheader">
            <p class="mem-plan-tag">Drop-in</p>
            <p class="mem-plan-name">Pay As You Go</p>
            <p class="mem-plan-price"><sup>$</sup>28</p>
            <p class="mem-plan-period">per class</p>
          </div>

          <div class="mem-header mem-header--featured" role="columnheader">
            <div class="mem-featured-badge">Most Popular</div>
            <p class="mem-plan-tag">Monthly Membership</p>
            <p class="mem-plan-name">Unlimited</p>
            <p class="mem-plan-price"><sup>$</sup>149</p>
            <p class="mem-plan-period">per month</p>
          </div>

          <div class="mem-header" role="columnheader">
            <p class="mem-plan-tag">Class Pack</p>
            <p class="mem-plan-name">10 Classes</p>
            <p class="mem-plan-price"><sup>$</sup>220</p>
            <p class="mem-plan-period">use within 90 days</p>
          </div>

          <!-- Feature rows -->
          <div class="mem-cell mem-cell--label" role="rowheader">Unlimited classes</div>
          <div class="mem-cell" role="cell"><div class="mem-dash"></div></div>
          <div class="mem-cell mem-cell--featured" role="cell"><div class="mem-check mem-check--clay" aria-label="included">✓</div></div>
          <div class="mem-cell" role="cell"><div class="mem-dash"></div></div>

          <div class="mem-cell mem-cell--label" role="rowheader">Class credits</div>
          <div class="mem-cell" role="cell" aria-label="1 credit per class">1 per class</div>
          <div class="mem-cell mem-cell--featured" role="cell" aria-label="Unlimited">Unlimited</div>
          <div class="mem-cell" role="cell" aria-label="10 credits">10 credits</div>

          <div class="mem-cell mem-cell--label" role="rowheader">Guest passes / month</div>
          <div class="mem-cell" role="cell"><div class="mem-dash"></div></div>
          <div class="mem-cell mem-cell--featured" role="cell">2 / month</div>
          <div class="mem-cell" role="cell"><div class="mem-dash"></div></div>

          <div class="mem-cell mem-cell--label" role="rowheader">Workshop discounts</div>
          <div class="mem-cell" role="cell"><div class="mem-dash"></div></div>
          <div class="mem-cell mem-cell--featured" role="cell">15% off</div>
          <div class="mem-cell" role="cell">10% off</div>

          <div class="mem-cell mem-cell--label" role="rowheader">Online classes</div>
          <div class="mem-cell" role="cell"><div class="mem-check" aria-label="included">✓</div></div>
          <div class="mem-cell mem-cell--featured" role="cell"><div class="mem-check mem-check--clay" aria-label="included">✓</div></div>
          <div class="mem-cell" role="cell"><div class="mem-check" aria-label="included">✓</div></div>

          <div class="mem-cell mem-cell--label" role="rowheader">Priority booking</div>
          <div class="mem-cell" role="cell"><div class="mem-dash"></div></div>
          <div class="mem-cell mem-cell--featured" role="cell"><div class="mem-check mem-check--clay" aria-label="included">✓</div></div>
          <div class="mem-cell" role="cell"><div class="mem-dash"></div></div>

          <div class="mem-cell mem-cell--label" role="rowheader">Pause or cancel</div>
          <div class="mem-cell" role="cell">Any time</div>
          <div class="mem-cell mem-cell--featured" role="cell">Any time</div>
          <div class="mem-cell" role="cell">Any time</div>
        </div>

        <!-- CTA row -->
        <div class="mem-footer">
          <div class="mem-footer-cell"></div>
          <div class="mem-footer-cell">
            <button class="btn-plan btn-plan--ghost">Book Single Class</button>
          </div>
          <div class="mem-footer-cell mem-footer-cell--featured">
            <button class="btn-plan btn-plan--filled">Start Membership</button>
          </div>
          <div class="mem-footer-cell">
            <button class="btn-plan btn-plan--ghost">Buy Class Pack</button>
          </div>
        </div>
      </div>

      <p class="membership-note">
        All memberships include a 7-day free trial for new members. No credit card required to start.
      </p>
    </section>

    <div class="divider-full"></div>

    <!-- ─── § 05 STUDIO SPACE ─── -->
    <section id="studio" class="section" aria-labelledby="studio-title">
      <div class="section-header reveal">
        <div class="section-number" aria-hidden="true">05</div>
        <div class="section-title-group">
          <p class="section-label">The Studio</p>
          <h2 class="section-title" id="studio-title">Three rooms.<br />One intention.</h2>
          <p class="section-desc">Purpose-built for practice. Natural materials, living walls, acoustic engineering, and light that shifts with the day.</p>
        </div>
      </div>

      <div class="studio-grid reveal" role="region" aria-label="Studio spaces">
        <!-- Row 1 -->
        <div class="studio-block studio-block--image-tall">
          <div class="studio-image-placeholder" style="background: linear-gradient(160deg, #EDE5D8 0%, #D4CFC9 50%, #C4856A15 100%); min-height: 520px;">
            <svg width="100%" height="100%" viewBox="0 0 480 520" fill="none" aria-label="Main Hall — the largest practice space, bathed in natural light" role="img">
              <defs>
                <linearGradient id="floorGrad" x1="0" y1="300" x2="480" y2="520" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#C4856A" stop-opacity="0.08"/>
                  <stop offset="100%" stop-color="#8C7B6E" stop-opacity="0.15"/>
                </linearGradient>
              </defs>
              <!-- Room perspective lines -->
              <path d="M0 100 L480 100" stroke="#D4CFC9" stroke-width="1"/>
              <!-- Wooden floor planks -->
              <rect x="0" y="340" width="480" height="180" fill="url(#floorGrad)"/>
              <line x1="0" y1="360" x2="480" y2="360" stroke="#B0A49A" stroke-width="0.5" opacity="0.5"/>
              <line x1="0" y1="385" x2="480" y2="385" stroke="#B0A49A" stroke-width="0.5" opacity="0.5"/>
              <line x1="0" y1="410" x2="480" y2="410" stroke="#B0A49A" stroke-width="0.5" opacity="0.5"/>
              <line x1="0" y1="440" x2="480" y2="440" stroke="#B0A49A" stroke-width="0.5" opacity="0.4"/>
              <line x1="0" y1="472" x2="480" y2="472" stroke="#B0A49A" stroke-width="0.5" opacity="0.3"/>
              <!-- Window light beams -->
              <path d="M60 100 L20 340" stroke="#C4856A" stroke-width="0.5" opacity="0.3"/>
              <path d="M140 100 L80 340" stroke="#C4856A" stroke-width="0.5" opacity="0.2"/>
              <path d="M240 100 L200 340" stroke="#C4856A" stroke-width="0.5" opacity="0.2"/>
              <path d="M340 100 L360 340" stroke="#C4856A" stroke-width="0.5" opacity="0.2"/>
              <path d="M420 100 L460 340" stroke="#C4856A" stroke-width="0.5" opacity="0.3"/>
              <!-- Large windows -->
              <rect x="40" y="120" width="80" height="180" rx="0" fill="none" stroke="#B0A49A" stroke-width="1.5"/>
              <line x1="80" y1="120" x2="80" y2="300" stroke="#B0A49A" stroke-width="0.75"/>
              <line x1="40" y1="210" x2="120" y2="210" stroke="#B0A49A" stroke-width="0.75"/>
              <rect x="180" y="120" width="80" height="180" rx="0" fill="none" stroke="#B0A49A" stroke-width="1.5"/>
              <line x1="220" y1="120" x2="220" y2="300" stroke="#B0A49A" stroke-width="0.75"/>
              <line x1="180" y1="210" x2="260" y2="210" stroke="#B0A49A" stroke-width="0.75"/>
              <rect x="320" y="120" width="80" height="180" rx="0" fill="none" stroke="#B0A49A" stroke-width="1.5"/>
              <line x1="360" y1="120" x2="360" y2="300" stroke="#B0A49A" stroke-width="0.75"/>
              <line x1="320" y1="210" x2="400" y2="210" stroke="#B0A49A" stroke-width="0.75"/>
              <!-- Mats on floor -->
              <rect x="60" y="350" width="70" height="110" rx="2" fill="#C4856A" opacity="0.2"/>
              <rect x="160" y="350" width="70" height="110" rx="2" fill="#C4856A" opacity="0.15"/>
              <rect x="260" y="350" width="70" height="110" rx="2" fill="#7B9EA8" opacity="0.15"/>
              <rect x="355" y="350" width="70" height="110" rx="2" fill="#C4856A" opacity="0.12"/>
              <!-- Caption -->
              <text x="240" y="490" text-anchor="middle" font-family="Georgia, serif" font-size="11" fill="#8C7B6E" letter-spacing="3">MAIN HALL — 1,200 SQ FT</text>
            </svg>
          </div>
        </div>

        <div class="studio-block studio-block--text" style="border-left: 1px solid var(--border);">
          <h3 class="studio-block-title">Main Hall</h3>
          <p class="studio-block-text">Our largest space at 1,200 sq ft. Sustainably-harvested cork floors, floor-to-ceiling windows facing east, and a living wall of native plants. Holds up to 24 practitioners.</p>
        </div>

        <div class="studio-block studio-block--dark" style="border-left: 1px solid var(--border);">
          <div style="padding: var(--sp-8);">
            <div class="studio-stat-number">42+</div>
            <div class="studio-stat-label">Classes weekly</div>
            <div class="studio-stat-number" style="margin-top: var(--sp-7);">8</div>
            <div class="studio-stat-label">Lead instructors</div>
          </div>
        </div>

        <!-- Row 2 -->
        <div class="studio-block studio-block--text" style="border-top: 1px solid var(--border);">
          <h3 class="studio-block-title">Stillness Room</h3>
          <p class="studio-block-text">Acoustically isolated for restorative, yin, and meditation. Heated floors, low lighting, and a ceiling designed to hold the quality of silence.</p>
        </div>

        <div class="studio-block studio-block--image" style="border-left: 1px solid var(--border); border-top: 1px solid var(--border);">
          <div class="studio-image-placeholder" style="background: linear-gradient(135deg, #2E2B26 0%, #1C1915 100%); min-height: 260px;">
            <svg width="100%" height="260" viewBox="0 0 480 260" fill="none" aria-label="Stillness Room — the meditation and restorative space" role="img">
              <!-- Candle/ambient lighting effect -->
              <circle cx="240" cy="130" r="160" fill="#C4856A" opacity="0.04"/>
              <circle cx="240" cy="130" r="100" fill="#C4856A" opacity="0.06"/>
              <circle cx="240" cy="130" r="50" fill="#C4856A" opacity="0.08"/>
              <!-- Floor -->
              <rect x="0" y="180" width="480" height="80" fill="#2E2B26"/>
              <!-- Candle flames -->
              <ellipse cx="120" cy="155" rx="6" ry="10" fill="#C4856A" opacity="0.6"/>
              <ellipse cx="120" cy="157" rx="3" ry="6" fill="#EDD4C8" opacity="0.8"/>
              <line x1="120" y1="165" x2="120" y2="178" stroke="#544F48" stroke-width="1.5"/>
              <ellipse cx="360" cy="155" rx="6" ry="10" fill="#C4856A" opacity="0.6"/>
              <ellipse cx="360" cy="157" rx="3" ry="6" fill="#EDD4C8" opacity="0.8"/>
              <line x1="360" y1="165" x2="360" y2="178" stroke="#544F48" stroke-width="1.5"/>
              <text x="240" y="220" text-anchor="middle" font-family="Georgia, serif" font-size="11" fill="#6E6760" letter-spacing="3">STILLNESS ROOM</text>
            </svg>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── CTA BAND ─── -->
    <div class="cta-band" role="complementary" aria-label="Call to action">
      <div class="cta-band-inner reveal">
        <div>
          <h2 class="cta-band-title">
            The mat is waiting.<br />
            <em>Your first class is free.</em>
          </h2>
          <p class="cta-band-sub">
            Every new member begins with a complimentary 7-day trial. Book any class, meet your instructors, and discover which practice calls to you — with no commitment required.
          </p>
        </div>
        <div class="cta-band-actions">
          <a href="#membership" class="btn-band-primary">Begin Free Trial</a>
          <a href="#schedule" class="btn-band-ghost">Browse Schedule</a>
        </div>
      </div>
    </div>

  </main>

  <!-- ═══════════════════════════════════════════════════
       FOOTER
  ═══════════════════════════════════════════════════ -->
  <footer class="footer" role="contentinfo">
    <div class="footer-main">

      <!-- Brand column -->
      <div>
        <p class="footer-brand-title">Stillwater</p>
        <p class="footer-brand-text">
          A sanctuary for mindful movement in Southeast Portland. We believe practice is a lifelong conversation with yourself — and we're honoured to hold space for yours.
        </p>
        <address class="footer-address">
          2847 SE Division Street<br />
          Portland, Oregon 97202<br />
          <a href="tel:+15033214950" style="color: inherit; transition: color var(--dur-quick) ease;" onmouseover="this.style.color='var(--clay-400)'" onmouseout="this.style.color='inherit'">(503) 321-4950</a><br />
          <a href="mailto:hello@stillwater.studio" style="color: inherit; transition: color var(--dur-quick) ease;" onmouseover="this.style.color='var(--clay-400)'" onmouseout="this.style.color='inherit'">hello@stillwater.studio</a>
        </address>
      </div>

      <!-- Navigation -->
      <nav aria-label="Footer navigation">
        <p class="footer-col-title">Navigate</p>
        <ul class="footer-links" role="list">
          <li><a href="/schedule" class="footer-link">Class Schedule</a></li>
          <li><a href="/instructors" class="footer-link">Instructors</a></li>
          <li><a href="/pricing" class="footer-link">Membership</a></li>
          <li><a href="/workshops" class="footer-link">Workshops</a></li>
          <li><a href="/about" class="footer-link">About Stillwater</a></li>
          <li><a href="/blog" class="footer-link">Journal</a></li>
        </ul>
      </nav>

      <!-- Hours -->
      <div>
        <p class="footer-col-title">Studio Hours</p>
        <div class="footer-hours">
          <div class="footer-hour-row">
            <span class="footer-hour-day">Mon – Fri</span>
            <span>5:45 am – 9:00 pm</span>
          </div>
          <div class="footer-hour-row">
            <span class="footer-hour-day">Saturday</span>
            <span>7:00 am – 5:00 pm</span>
          </div>
          <div class="footer-hour-row">
            <span class="footer-hour-day">Sunday</span>
            <span>8:00 am – 4:00 pm</span>
          </div>
        </div>

        <p class="footer-col-title" style="margin-top: var(--sp-7);">Follow</p>
        <ul class="footer-links" role="list">
          <li><a href="https://instagram.com/stillwateryoga" class="footer-link" aria-label="Stillwater on Instagram">Instagram</a></li>
          <li><a href="https://youtube.com/stillwateryoga" class="footer-link" aria-label="Stillwater on YouTube">YouTube</a></li>
        </ul>
      </div>

      <!-- Newsletter -->
      <div>
        <p class="footer-col-title">Stay in the flow</p>
        <p style="font-size: 0.9375rem; color: var(--text-secondary); line-height: 1.65; font-weight: 300; margin-bottom: 0;">
          Weekly schedule updates, workshop announcements, and reflections from our instructors — delivered with intention.
        </p>
        <form class="newsletter-form" onsubmit="handleNewsletterSubmit(event)" novalidate aria-label="Newsletter signup form">
          <label for="newsletter-email" class="visually-hidden">Email address</label>
          <input
            type="email"
            id="newsletter-email"
            class="newsletter-input"
            placeholder="your@email.com"
            autocomplete="email"
            required
            aria-required="true"
          />
          <button type="submit" class="newsletter-btn" aria-label="Subscribe to newsletter">
            Subscribe
          </button>
        </form>
        <p style="margin-top: var(--sp-3); font-size: 0.75rem; color: var(--text-tertiary);">
          No spam. Unsubscribe any time.
        </p>
      </div>

    </div>

    <!-- Bottom bar -->
    <div class="footer-bottom">
      <p class="footer-bottom-text">
        © 2025 Stillwater Yoga Studio LLC — Portland, Oregon
      </p>
      <ul class="footer-bottom-links" role="list">
        <li><a href="/privacy" class="footer-bottom-link">Privacy Policy</a></li>
        <li><a href="/terms" class="footer-bottom-link">Terms of Service</a></li>
        <li><a href="/accessibility" class="footer-bottom-link">Accessibility</a></li>
      </ul>
    </div>

    <!-- Giant watermark -->
    <div class="footer-watermark" aria-hidden="true">
      <p class="footer-watermark-text">STILLWATER</p>
    </div>
  </footer>

  <!-- ═══════════════════════════════════════════════════
       JAVASCRIPT — Minimal, purposeful
  ═══════════════════════════════════════════════════ -->
  <script>
    'use strict';

    // ── Scroll Progress Bar ──────────────────────────────
    const scrollProgress = document.getElementById('scrollProgress');

    function updateScrollProgress() {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = window.scrollY / docHeight;
      scrollProgress.style.width = (scrolled * 100) + '%';
    }

    // ── Nav Hide/Show on Scroll ──────────────────────────
    const nav = document.getElementById('nav');
    let lastScrollY = 0;
    let scrollTimeout;

    function handleNavScroll() {
      const currentScrollY = window.scrollY;

      // Add scrolled class for blur effect
      if (currentScrollY > 20) {
        nav.classList.add('nav--scrolled');
      } else {
        nav.classList.remove('nav--scrolled');
      }

      // Hide on scroll down, show on scroll up
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        nav.classList.add('nav--hidden');
      } else {
        nav.classList.remove('nav--hidden');
      }

      lastScrollY = currentScrollY;
    }

    // ── Scroll Event Listener (throttled) ───────────────
    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateScrollProgress();
          handleNavScroll();
          checkRevealElements();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    // ── Intersection Observer for Reveal Animations ──────
    const revealElements = document.querySelectorAll('.reveal, .reveal-stagger');

    function checkRevealElements() {
      revealElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight * 0.88;

        if (isVisible) {
          if (el.classList.contains('reveal')) {
            el.classList.add('reveal--visible');
          } else if (el.classList.contains('reveal-stagger')) {
            el.classList.add('reveal-stagger--visible');
          }
        }
      });
    }

    // Run once on load
    checkRevealElements();

    // ── Schedule Day Tabs ────────────────────────────────
    function switchDay(dayId, tabEl) {
      // Deactivate all tabs
      document.querySelectorAll('.schedule-tab').forEach(tab => {
        tab.classList.remove('schedule-tab--active');
        tab.setAttribute('aria-selected', 'false');
      });

      // Hide all day panels
      document.querySelectorAll('.schedule-day').forEach(day => {
        day.classList.remove('schedule-day--active');
      });

      // Activate selected tab
      tabEl.classList.add('schedule-tab--active');
      tabEl.setAttribute('aria-selected', 'true');

      // Show selected day panel
      const panel = document.getElementById('day-' + dayId);
      if (panel) {
        panel.classList.add('schedule-day--active');
        // Smooth fade-in
        panel.style.opacity = '0';
        requestAnimationFrame(() => {
          panel.style.transition = 'opacity 250ms ease';
          panel.style.opacity = '1';
        });
      }
    }

    // Keyboard navigation for schedule tabs
    document.querySelectorAll('.schedule-tab').forEach((tab, index, tabs) => {
      tab.addEventListener('keydown', (e) => {
        let newIndex;
        if (e.key === 'ArrowRight') {
          newIndex = (index + 1) % tabs.length;
        } else if (e.key === 'ArrowLeft') {
          newIndex = (index - 1 + tabs.length) % tabs.length;
        } else if (e.key === 'Home') {
          newIndex = 0;
        } else if (e.key === 'End') {
          newIndex = tabs.length - 1;
        }

        if (newIndex !== undefined) {
          e.preventDefault();
          tabs[newIndex].focus();
          tabs[newIndex].click();
        }
      });
    });

    // ── Class Item Expand/Collapse ───────────────────────
    function toggleClass(classId) {
      const item = document.getElementById(classId);
      const detail = document.getElementById('detail-' + classId);

      if (!item || !detail) return;

      const isExpanded = item.classList.contains('class-item--expanded');

      // Close all others in this day panel
      const parentPanel = item.closest('.schedule-day');
      if (parentPanel) {
        parentPanel.querySelectorAll('.class-item--expanded').forEach(expandedItem => {
          if (expandedItem !== item) {
            expandedItem.classList.remove('class-item--expanded');
            expandedItem.setAttribute('aria-expanded', 'false');
            const otherId = expandedItem.id;
            const otherDetail = document.getElementById('detail-' + otherId);
            if (otherDetail) {
              otherDetail.classList.remove('class-detail--open');
            }
          }
        });
      }

      // Toggle this item
      if (isExpanded) {
        item.classList.remove('class-item--expanded');
        item.setAttribute('aria-expanded', 'false');
        detail.classList.remove('class-detail--open');
      } else {
        item.classList.add('class-item--expanded');
        item.setAttribute('aria-expanded', 'true');
        detail.classList.add('class-detail--open');
      }
    }

    // ── Newsletter Form ──────────────────────────────────
    function handleNewsletterSubmit(event) {
      event.preventDefault();

      const form = event.target;
      const input = form.querySelector('#newsletter-email');
      const btn = form.querySelector('.newsletter-btn');
      const email = input.value.trim();

      // Basic validation
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        input.style.borderColor = 'var(--color-error, #B85450)';
        input.focus();
        return;
      }

      // Simulate API call
      btn.textContent = '...';
      btn.disabled = true;

      setTimeout(() => {
        btn.textContent = 'Subscribed ✓';
        btn.style.background = 'var(--water-500)';
        input.value = '';
        input.style.borderColor = 'var(--border)';

        setTimeout(() => {
          btn.textContent = 'Subscribe';
          btn.style.background = '';
          btn.disabled = false;
        }, 3000);
      }, 800);
    }

    // ── Smooth scrolling for anchor links ────────────────
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) {
          e.preventDefault();
          const offset = parseInt(getComputedStyle(document.documentElement)
            .getPropertyValue('--nav-h')) || 64;
          const targetY = target.getBoundingClientRect().top + window.scrollY - offset - 16;

          window.scrollTo({ top: targetY, behavior: 'smooth' });
        }
      });
    });

    // ── Initialize scroll progress ───────────────────────
    updateScrollProgress();

    // ── Respect prefers-reduced-motion for marquee ───────
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const marqueeTrack = document.querySelector('.marquee-track');
      if (marqueeTrack) {
        marqueeTrack.style.animation = 'none';
      }
    }
  </script>

</body>
</html>

```

# test/setup.ts
```ts
/**
 * Vitest global setup — runs before all tests.
 * Loads env vars from .env.test (if present) or .env.local.
 */

import { config } from 'dotenv';

// Load .env.local first (monorepo root), then .env.test if present
config({ path: '.env.local' });
config({ path: '.env.test' });

// Ensure NODE_ENV is 'test' for all test runs
process.env['NODE_ENV'] = 'test';

// Suppress console.log in tests (keep console.warn + console.error)
if (process.env['NODE_ENV'] === 'test') {
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    if (process.env['VERBOSE_TESTS'] === 'true') {
      originalLog(...args);
    }
  };
}

```

# tooling/typescript/library.json
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "Library Package",
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "jsx": "react-jsx",
    "noEmit": false,
    "declaration": true,
    "declarationMap": true,
    "emitDeclarationOnly": true,
    "outDir": "dist",
    "rootDir": "src",
    "composite": true
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.spec.ts",
    "**/*.spec.tsx",
    ".turbo"
  ]
}

```

# tooling/typescript/base.json
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "Base",
  "compilerOptions": {
    /* Language & Environment */
    "target": "ES2022",
    "lib": ["ES2022"],
    "jsx": "preserve",

    /* Module Resolution */
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "moduleDetection": "force",
    "resolveJsonModule": true,
    "allowJs": false,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "customConditions": ["@stillwater/source"],

    /* Type Checking — STRICT MODE MANDATORY */
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "useUnknownInCatchVariables": true,

    /* Output */
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noEmit": true,

    /* Performance */
    "skipLibCheck": true,
    "incremental": true,

    /* Path Aliases — defined per-package, not here */
    "baseUrl": "."
  },
  "exclude": [
    "node_modules",
    "dist",
    ".turbo",
    "coverage"
  ]
}

```

# tooling/typescript/package.json
```json
{
  "name": "@stillwater/typescript-config",
  "version": "0.0.0",
  "private": true,
  "exports": {
    "./base": "./base.json",
    "./nextjs": "./nextjs.json",
    "./library": "./library.json"
  }
}

```

# tooling/typescript/nextjs.json
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "Next.js App Router",
  "extends": "./base.json",
  "compilerOptions": {
    /* Next.js 16 requires these overrides */
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "jsx": "preserve",
    "allowJs": true,
    "moduleResolution": "Bundler",

    /* React Compiler support (stable in Next.js 16) */
    "plugins": [
      {
        "name": "next"
      }
    ],

    /* Path mapping for @/ — defined in each app's tsconfig */
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.d.ts"
  ],
  "exclude": [
    "node_modules",
    ".next",
    "out",
    "dist",
    ".turbo"
  ]
}

```

# tooling/eslint/package.json
```json
{
  "name": "@stillwater/eslint-config",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./index.js"
  },
  "dependencies": {
    "@eslint/js": "^9.17.0",
    "@next/eslint-plugin-next": "^16.0.0",
    "eslint-plugin-import": "^2.31.0",
    "eslint-plugin-react": "^7.37.3",
    "eslint-plugin-react-hooks": "^5.1.0",
    "eslint-plugin-tailwindcss": "^3.17.5",
    "typescript-eslint": "^8.19.1"
  }
}

```

# tooling/eslint/index.js
```js
// @ts-check

/**
 * Stillwater — Shared ESLint Configuration
 * Applied across all packages and apps in the monorepo.
 *
 * Stack: TypeScript strict, React 19, Next.js 16, Tailwind CSS v4
 */

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";
import importPlugin from "eslint-plugin-import";
import tailwindPlugin from "eslint-plugin-tailwindcss";

/** @type {import("typescript-eslint").Config} */
export default tseslint.config(
  // ── Base ignores (applies globally) ──────────────────────────────
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/build/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/*.config.js",
      "**/*.config.mjs",
    ],
  },

  // ── Base ESLint recommended ───────────────────────────────────────
  eslint.configs.recommended,

  // ── TypeScript strict ─────────────────────────────────────────────
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // ── Core rules ───────────────────────────────────────────────────
  {
    rules: {
      // TypeScript
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/require-await": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],

      // General best practices
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "prefer-template": "error",
    },
  },

  // ── React + React Hooks ───────────────────────────────────────────
  {
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off", // Not needed with React 19 JSX transform
      "react/prop-types": "off",          // TypeScript handles this
      "react/display-name": "warn",
      "react-hooks/exhaustive-deps": "error",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },

  // ── Import ordering ───────────────────────────────────────────────
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
            "type",
          ],
          pathGroups: [
            {
              pattern: "react",
              group: "external",
              position: "before",
            },
            {
              pattern: "next/**",
              group: "external",
              position: "before",
            },
            {
              pattern: "@stillwater/**",
              group: "internal",
              position: "before",
            },
          ],
          pathGroupsExcludedImportTypes: ["type"],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
      "import/no-duplicates": "error",
      "import/no-cycle": "error",
    },
  },

  // ── Tailwind CSS ──────────────────────────────────────────────────
  {
    plugins: {
      tailwindcss: tailwindPlugin,
    },
    rules: {
      "tailwindcss/classnames-order": "warn",
      "tailwindcss/no-contradicting-classname": "error",
    },
  },

  // ── Next.js (D19: wire previously-unused nextPlugin) ──────────────
  {
    plugins: {
      next: nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      "next/no-html-link-for-pages": "off",
    },
  },
);

```

# tooling/tailwind/base.ts
```ts
/**
 * Stillwater — Shared Tailwind CSS v4 Base Configuration
 *
 * Design Philosophy: "Editorial Calm" — Warm Mineral Palette
 * Anti-Generic enforcement: NO purple gradients, NO Inter-only, NO generic grids.
 *
 * NOTE: In Tailwind v4, most configuration moves to CSS (@theme directive).
 * This file exports JS-accessible tokens for use in Storybook, tests, etc.
 */

import type { Config } from "tailwindcss";

export const stillwaterBase = {
  // ── Content sources ─────────────────────────────────────────────
  // Each app extends this with its own src paths
  content: [],

  theme: {
    extend: {
      // ── Typography ─────────────────────────────────────────────
      fontFamily: {
        display: [
          "Cormorant Garamond",
          "Georgia",
          "Times New Roman",
          "serif",
        ],
        body: [
          "DM Sans",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        mono: [
          "Berkeley Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },

      // ── Colour palette (mirrors CSS custom properties) ─────────
      colors: {
        stone: {
          950: "#0F0D0B",
          900: "#1C1915",
          800: "#2E2B26",
          700: "#3D3832",
          600: "#544F48",
          500: "#6E6760",
          400: "#8C7B6E",
          300: "#B0A49A",
          200: "#D4CFC9",
          100: "#E8E3DC",
          50:  "#F5F0E8",
        },
        clay: {
          600: "#8A4030",
          500: "#9E5E44",
          400: "#C4856A",
          300: "#D9A48F",
          200: "#EDD4C8",
          100: "#F7EDE8",
        },
        water: {
          700: "#4A7280",
          600: "#5D8A99",
          500: "#7B9EA8",
          400: "#9BBAC5",
          300: "#B8CDD4",
          100: "#E8F0F3",
        },
        sand: {
          DEFAULT: "#F5F0E8",
          warm:    "#EDE5D8",
          deep:    "#E2D8CB",
        },
      },

      // ── Spacing ────────────────────────────────────────────────
      spacing: {
        "px": "1px",
        "0.5": "2px",
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "5": "24px",
        "6": "32px",
        "7": "48px",
        "8": "64px",
        "9": "96px",
        "10": "128px",
        "11": "192px",
        "12": "256px",
      },

      // ── Max-widths ─────────────────────────────────────────────
      maxWidth: {
        content: "1360px",
        narrow:  "720px",
        wide:    "1440px",
      },

      // ── Typography Scale ───────────────────────────────────────
      fontSize: {
        "display-2xl": ["clamp(3.5rem,8vw,7rem)",    { lineHeight: "1.0" }],
        "display-xl":  ["clamp(2.5rem,5vw,4.5rem)",  { lineHeight: "1.05" }],
        "display-lg":  ["clamp(2rem,4vw,3.25rem)",   { lineHeight: "1.1" }],
        "heading-lg":  ["clamp(1.5rem,3vw,2rem)",    { lineHeight: "1.2" }],
        "heading-md":  ["1.25rem",                   { lineHeight: "1.3" }],
        "body-lg":     ["1.125rem",                  { lineHeight: "1.75" }],
        "body-md":     ["1rem",                      { lineHeight: "1.65" }],
        "body-sm":     ["0.875rem",                  { lineHeight: "1.6" }],
        "caption":     ["0.75rem",                   { lineHeight: "1.4" }],
        "label":       ["0.6875rem",                 { lineHeight: "1.4" }],
      },

      // ── Border Radius (intentionally minimal) ──────────────────
      borderRadius: {
        none: "0",
        sm:   "2px",
        DEFAULT: "0",  // Stillwater: no softness — sharp edges for editorial feel
      },

      // ── Animation ─────────────────────────────────────────────
      transitionTimingFunction: {
        "gentle":  "cubic-bezier(0.16, 1, 0.3, 1)",
        "breathe": "cubic-bezier(0.45, 0, 0.55, 1)",
        "sharp":   "cubic-bezier(0.4, 0, 0.2, 1)",
      },

      transitionDuration: {
        instant:  "100ms",
        quick:    "150ms",
        standard: "300ms",
        slow:     "600ms",
        crawl:    "900ms",
      },

      // ── Keyframes ─────────────────────────────────────────────
      keyframes: {
        marquee: {
          "from": { transform: "translateX(0)" },
          "to":   { transform: "translateX(-50%)" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "reveal": {
          from: { opacity: "0", transform: "translateY(24px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(360deg)" },
        },
      },

      animation: {
        marquee:    "marquee 32s linear infinite",
        "fade-in":  "fade-in 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        reveal:     "reveal 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "spin-slow": "spin-slow 3s linear infinite",
      },
    },
  },

  plugins: [],
} satisfies Omit<Config, "content">;

```

# tooling/tailwind/package.json
```json
{
  "name": "@stillwater/tailwind-config",
  "version": "0.0.0",
  "private": true,
  "exports": {
    ".": "./base.ts"
  },
  "devDependencies": {
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.3"
  }
}

```

# turbo.json
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [
    ".env",
    ".env.local"
  ],
  "globalEnv": [
    "NODE_ENV",
    "VERCEL_ENV",
    "VERCEL_URL",
    "DATABASE_URL",
    "DATABASE_URL_UNPOOLED",
    "NEXT_PUBLIC_APP_URL"
  ],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": [
        "$TURBO_DEFAULT$",
        ".env",
        ".env.local"
      ],
      "outputs": [
        ".next/**",
        "!.next/cache/**",
        "dist/**"
      ]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": [],
      "outputs": []
    },
    "lint:fix": {
      "cache": false,
      "outputs": []
    },
    "check-types": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": [
        "coverage/**"
      ],
      "inputs": [
        "src/**/*.ts",
        "src/**/*.tsx",
        "test/**/*.ts",
        "test/**/*.tsx",
        "vitest.config.*"
      ]
    },
    "test:e2e": {
      "dependsOn": ["build"],
      "cache": false,
      "outputs": [
        "playwright-report/**",
        "test-results/**"
      ]
    },
    "clean": {
      "cache": false
    },
    "db:generate": {
      "cache": false,
      "outputs": [
        "drizzle/**"
      ]
    },
    "db:migrate": {
      "cache": false
    },
    "db:push": {
      "cache": false
    },
    "db:seed": {
      "cache": false,
      "dependsOn": ["db:migrate"]
    },
    "db:studio": {
      "cache": false,
      "persistent": true
    },
    "db:reset": {
      "cache": false
    },
    "deploy": {
      "dependsOn": ["build"],
      "cache": false,
      "outputs": []
    }
  }
}

```

# vitest.config.ts
```ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    pool: 'forks',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@stillwater/db': resolve(__dirname, 'packages/db/src'),
      '@stillwater/api': resolve(__dirname, 'packages/api/src'),
      '@stillwater/auth': resolve(__dirname, 'packages/auth/src'),
      '@stillwater/config': resolve(__dirname, 'packages/config/src'),
      '@stillwater/ui': resolve(__dirname, 'packages/ui/src'),
      '@stillwater/payments': resolve(__dirname, 'packages/payments/src'),
      '@stillwater/email': resolve(__dirname, 'packages/email/src'),
    },
  },
});

```

# .env.example
```example
# ══════════════════════════════════════════════════════════════════
# STILLWATER — Environment Variables Reference
# ══════════════════════════════════════════════════════════════════
# Copy this file to .env.local and fill in the values.
# NEVER commit .env.local or any file containing real secrets.
# See Project Architecture Document § Appendix A for full documentation.
# ══════════════════════════════════════════════════════════════════

# ─── Application ───────────────────────────────────────────────────
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ─── Database (Neon PostgreSQL) ────────────────────────────────────
# Pooled connection — for all application queries (Neon PgBouncer)
DATABASE_URL=postgresql://stillwater:stillwater_local_dev@localhost:5432/stillwater_dev

# Direct / unpooled connection — ONLY for migrations and seeding
# In production: use Neon's direct connection string (no -pooler suffix)
DATABASE_URL_UNPOOLED=postgresql://stillwater:stillwater_local_dev@localhost:5432/stillwater_dev

# ─── Authentication (Better Auth) ──────────────────────────────────
# Generate: openssl rand -base64 32
BETTER_AUTH_SECRET=your-secret-here-min-32-chars
BETTER_AUTH_URL=http://localhost:3000

# Google OAuth provider
# Create at: https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# ─── Stripe ────────────────────────────────────────────────────────
# Test keys: https://dashboard.stripe.com/test/apikeys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# ─── Sanity CMS ────────────────────────────────────────────────────
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=development
# Read token (server-side only — never expose publicly)
SANITY_API_TOKEN=your-sanity-read-token
# Webhook secret for ISR revalidation
SANITY_WEBHOOK_SECRET=your-sanity-webhook-secret

# ─── Email (Resend) ────────────────────────────────────────────────
# Get API key at: https://resend.com/api-keys
RESEND_API_KEY=re_...
EMAIL_FROM=hello@stillwater.studio

# ─── Background Jobs (Trigger.dev) ─────────────────────────────────
# Get at: https://cloud.trigger.dev/projects
TRIGGER_SECRET_KEY=tr_dev_...

# ─── Redis (Upstash) ───────────────────────────────────────────────
# Create free Redis at: https://console.upstash.com
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token

# ─── Error Tracking (Sentry) ───────────────────────────────────────
SENTRY_DSN=https://your-key@sentry.io/your-project
# Only needed in CI for source map uploads
SENTRY_AUTH_TOKEN=sntrys_...
NEXT_PUBLIC_SENTRY_DSN=https://your-key@sentry.io/your-project

# ─── Analytics (PostHog) ───────────────────────────────────────────
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# ─── Logging (Axiom) ───────────────────────────────────────────────
AXIOM_TOKEN=xaat-...
AXIOM_DATASET=stillwater-logs

# ─── Cloudflare Images / R2 ────────────────────────────────────────
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_IMAGES_TOKEN=your-images-token
CLOUDFLARE_R2_ACCESS_KEY_ID=your-r2-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-r2-secret-key
CLOUDFLARE_R2_BUCKET=stillwater-media
CLOUDFLARE_R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
NEXT_PUBLIC_CLOUDFLARE_IMAGES_URL=https://imagedelivery.net/your-account-hash

# ─── Vercel (CI/CD only — do not set locally) ──────────────────────
# VERCEL_TOKEN=
# VERCEL_ORG_ID=
# VERCEL_PROJECT_ID=

# ─── Neon API (CI/CD only — branch management) ─────────────────────
# NEON_API_KEY=
# NEON_PROJECT_ID=

```

# .env.local
```local
# ══════════════════════════════════════════════════════════════════
# STILLWATER — Environment Variables Reference
# ══════════════════════════════════════════════════════════════════
# Copy this file to .env.local and fill in the values.
# NEVER commit .env.local or any file containing real secrets.
# See Project Architecture Document § Appendix A for full documentation.
# ══════════════════════════════════════════════════════════════════

# ─── Application ───────────────────────────────────────────────────
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ─── Database (Neon PostgreSQL) ────────────────────────────────────
# Pooled connection — for all application queries (Neon PgBouncer)
DATABASE_URL=postgresql://stillwater:stillwater_local_dev@localhost:5432/stillwater_dev

# Direct / unpooled connection — ONLY for migrations and seeding
# In production: use Neon's direct connection string (no -pooler suffix)
DATABASE_URL_UNPOOLED=postgresql://stillwater:stillwater_local_dev@localhost:5432/stillwater_dev

# ─── Authentication (Better Auth) ──────────────────────────────────
# Generate: openssl rand -base64 32
BETTER_AUTH_SECRET=your-secret-here-min-32-chars
BETTER_AUTH_URL=http://localhost:3000

# Google OAuth provider
# Create at: https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# ─── Stripe ────────────────────────────────────────────────────────
# Test keys: https://dashboard.stripe.com/test/apikeys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# ─── Sanity CMS ────────────────────────────────────────────────────
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=development
# Read token (server-side only — never expose publicly)
SANITY_API_TOKEN=your-sanity-read-token
# Webhook secret for ISR revalidation
SANITY_WEBHOOK_SECRET=your-sanity-webhook-secret

# ─── Email (Resend) ────────────────────────────────────────────────
# Get API key at: https://resend.com/api-keys
RESEND_API_KEY=re_...
EMAIL_FROM=hello@stillwater.studio

# ─── Background Jobs (Trigger.dev) ─────────────────────────────────
# Get at: https://cloud.trigger.dev/projects
TRIGGER_SECRET_KEY=tr_dev_...

# ─── Redis (Upstash) ───────────────────────────────────────────────
# Create free Redis at: https://console.upstash.com
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token

# ─── Error Tracking (Sentry) ───────────────────────────────────────
SENTRY_DSN=https://your-key@sentry.io/your-project
# Only needed in CI for source map uploads
SENTRY_AUTH_TOKEN=sntrys_...
NEXT_PUBLIC_SENTRY_DSN=https://your-key@sentry.io/your-project

# ─── Analytics (PostHog) ───────────────────────────────────────────
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# ─── Logging (Axiom) ───────────────────────────────────────────────
AXIOM_TOKEN=xaat-...
AXIOM_DATASET=stillwater-logs

# ─── Cloudflare Images / R2 ────────────────────────────────────────
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_IMAGES_TOKEN=your-images-token
CLOUDFLARE_R2_ACCESS_KEY_ID=your-r2-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-r2-secret-key
CLOUDFLARE_R2_BUCKET=stillwater-media
CLOUDFLARE_R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
NEXT_PUBLIC_CLOUDFLARE_IMAGES_URL=https://imagedelivery.net/your-account-hash

# ─── Vercel (CI/CD only — do not set locally) ──────────────────────
# VERCEL_TOKEN=
# VERCEL_ORG_ID=
# VERCEL_PROJECT_ID=

# ─── Neon API (CI/CD only — branch management) ─────────────────────
# NEON_API_KEY=
# NEON_PROJECT_ID=

```

# .github/CODEOWNERS
```txt
# Default owner — reviewed on every PR
* @nordeim

# Database layer — requires DB team review
/packages/db/ @nordeim

# API layer — requires backend review
/packages/api/ @nordeim
/packages/payments/ @nordeim
/services/workers/ @nordeim

# UI layer — requires frontend review
/packages/ui/ @nordeim
/apps/web/src/components/ @nordeim
/apps/web/src/app/ @nordeim

# Auth — requires security review
/packages/auth/ @nordeim
/apps/web/proxy.ts @nordeim

# Config — requires DevOps review
/tooling/ @nordeim
/.github/ @nordeim
/docker-compose.yml @nordeim
/infrastructure/ @nordeim

# Documentation
/PAD.md @nordeim
/MASTER_EXECUTION_PLAN.md @nordeim
/stillwater_SKILL.md @nordeim
/CLAUDE.md @nordeim
/README.md @nordeim

```

# .github/workflows/deploy-production.yml
```yml
name: Deploy Production

on:
  push:
    branches: [main]

env:
  NODE_VERSION: '22'
  PNPM_VERSION: '9.15.4'

jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      # Step 1: Run migrations on production DB FIRST
      - name: Run DB migrations
        env:
          DATABASE_URL_UNPOOLED: ${{ secrets.PROD_DATABASE_URL_UNPOOLED }}
        run: pnpm db:migrate

      # Step 2: Deploy to Vercel (zero-downtime)
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          working-directory: ./

      # Step 3: Smoke test production
      - name: Smoke test
        run: |
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://stillwater.studio)
          if [ "$STATUS" != "200" ]; then
            echo "❌ Production smoke test failed: HTTP $STATUS"
            exit 1
          fi
          echo "✅ Production smoke test passed: HTTP 200"

      # Step 4: Notify Slack
      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v1.26.0
        with:
          slack-message: |
            ${{ job.status == 'success' && '✅' || '❌' }} Stillwater deployed to production: ${{ job.status }}
            Commit: ${{ github.event.head_commit.message }}
            URL: https://stillwater.studio
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

```

# .github/workflows/ci.yml
```yml
name: CI

on:
  pull_request:
    branches: [develop, main]
  push:
    branches: [develop]

env:
  NODE_VERSION: '22'
  PNPM_VERSION: '9.15.4'

jobs:
  quality-gates:
    name: Quality Gates
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:17-alpine
        env:
          POSTGRES_DB: stillwater_dev
          POSTGRES_USER: stillwater
          POSTGRES_PASSWORD: stillwater_local_dev
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s
          --health-timeout 3s
          --health-retries 5

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run migrations
        env:
          DATABASE_URL_UNPOOLED: postgresql://stillwater:stillwater_local_dev@localhost:5432/stillwater_dev
        run: pnpm db:migrate

      - name: Seed database
        env:
          DATABASE_URL_UNPOOLED: postgresql://stillwater:stillwater_local_dev@localhost:5432/stillwater_dev
        run: pnpm db:seed

      # Gate 1: Type safety
      - name: Type check
        run: pnpm check-types

      # Gate 2: Lint
      - name: Lint
        run: pnpm lint

      # Gate 3: Unit + integration tests
      - name: Test with coverage
        env:
          DATABASE_URL: postgresql://stillwater:stillwater_local_dev@localhost:5432/stillwater_dev
          DATABASE_URL_UNPOOLED: postgresql://stillwater:stillwater_local_dev@localhost:5432/stillwater_dev
          UPSTASH_REDIS_REST_URL: http://localhost:6379
          UPSTASH_REDIS_REST_TOKEN: test-token
        run: pnpm test:coverage

      # Gate 4: Build
      - name: Build
        run: pnpm build

      # Gate 5: E2E tests
      - name: E2E tests
        run: pnpm test:e2e

      # Gate 8: Security audit
      - name: Security audit
        run: pnpm audit --audit-level=high

      - name: Upload coverage
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
          retention-days: 7

      - name: Upload Playwright report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

```

# .github/workflows/deploy-preview.yml
```yml
name: Deploy Preview

on:
  pull_request:
    types: [opened, synchronize, reopened]
    branches: [develop, main]

env:
  NODE_VERSION: '22'
  PNPM_VERSION: '9.15.4'

jobs:
  deploy-preview:
    name: Deploy to Vercel Preview
    runs-on: ubuntu-latest
    if: github.event.pull_request.head.repo.full_name == github.repository

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build
        env:
          NEXT_PUBLIC_APP_URL: https://stillwater-pr-${{ github.event.pull_request.number }}.vercel.app

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod=false'
          working-directory: ./

      - name: Comment PR with preview URL
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🚀 Preview deployment: https://stillwater-pr-' + context.issue.number + '.vercel.app'
            })

```

# .editorconfig
```txt
root = true

[*]
end_of_line = lf
insert_final_newline = true
charset = utf-8

[*.{ts,tsx,js,jsx,mjs,cjs}]
indent_style = space
indent_size = 2

[*.{json,yml,yaml,md,css,html}]
indent_style = space
indent_size = 2

[*.md]
trim_trailing_whitespace = false

```

# .npmrc
```txt
# Stillwater — pnpm configuration
# D15: Custom condition for monorepo source-resolution
# Enables @stillwater/* workspace packages to resolve to src/ instead of dist/
custom-conditions=@stillwater/source

# Hoisted node-linker for better兼容 with native modules
node-linker=hoisted

# Strict peer dependencies
strict-peer-dependencies=true

# Never auto-install peers — explicit declaration required
auto-install-peers=false

```

# .prettierrc
```txt
{
  "printWidth": 100,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "tabWidth": 2,
  "plugins": ["prettier-plugin-tailwindcss"]
}

```

