/**
 * Stillwater — proxy.ts (Next.js 16)
 *
 * IMPORTANT: In Next.js 16, middleware.ts was renamed to proxy.ts
 * and the exported function must be named `proxy` (not `middleware`).
 * See: https://nextjs.org/blog/next-16#proxy
 *
 * Responsibilities:
 *  1. Content-Security-Policy header with per-request nonce (P0 fix)
 *  2. Auth session verification (Better Auth) — cookie-only check
 *  3. RBAC route protection (role-based access) — deferred to layouts
 *
 * P0 fix (2026-07-14): CSP nonce handling.
 * The previous static CSP (`script-src 'self' https://js.stripe.com`) blocked
 * ALL inline scripts, including the $RS/$RC/$RV functions Next.js RSC
 * streaming uses to swap content chunks into the DOM. This left 4 marketing
 * routes stuck on the Suspense "Loading…" fallback forever — even though
 * the server streamed full HTML with real data.
 *
 * Fix: generate a per-request nonce in proxy.ts, set it as `x-nonce` on the
 * REQUEST headers (so Next.js auto-adds `nonce="..."` to all inline scripts
 * it generates), and set the CSP with `'nonce-${nonce}'` on the RESPONSE.
 *
 * Reference: Next.js 16 CSP guide
 * node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md
 *
 * Runs on: Edge or Node.js runtime. The 2-layer auth pattern works on both
 * runtimes — cookie-only check is recommended regardless for performance and
 * to avoid DB round-trips on every request. Do NOT call auth.api.getSession()
 * here. See PAD § 9.4 + ADR-009 for route protection logic.
 *
 * ─────────────────────────────────────────────────────────────────────
 * V17-2 (2026-07-21): PRODUCTION NO-OP STATUS — RETAINED FOR FUTURE USE
 * ─────────────────────────────────────────────────────────────────────
 * Per V9-2 fix comment in next.config.ts, the response headers set by
 * proxy.ts DO NOT reach production on Vercel + Next.js 16.2.10 (GitHub
 * issues vercel/next.js#85711, vercel/next.js#86303 — proxy.ts response
 * headers are dropped in production). The PRODUCTION Content-Security-Policy
 * is shipped by `next.config.ts` `headers()` instead, which uses
 * `'unsafe-inline'` (without `'strict-dynamic'` — V16-3 fix).
 *
 * The nonce-based CSP machinery in this file is RETAINED as a no-op for
 * the future: when Vercel/Next.js fixes the proxy.ts response-header drop
 * issue, we can switch to nonce-based CSP (more secure than `'unsafe-inline'`)
 * by removing the next.config.ts CSP and relying on proxy.ts.
 *
 * Per SKILL.md Lesson 108: "Keep proxy.ts's nonce-based CSP as a no-op
 * for the future."
 *
 * DO NOT DELETE this nonce machinery — it is intentional defense-in-depth.
 * DO NOT assume this CSP is active in production — verify via the response
 * headers on the live site (https://stillwater.jesspete.shop/).
 */

import { type NextRequest, NextResponse } from "next/server";

import { getSessionCookie } from "better-auth/cookies";

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

// ── CSP with per-request nonce (P0 fix, 2026-07-14) ─────────────────
// Generate a cryptographic nonce per request. Next.js 16 reads `x-nonce`
// from the request headers and auto-adds `nonce="..."` to ALL inline
// scripts it generates (RSC streaming $RS/$RC/$RV, bootstrap, etc.).
// Server components can also read it via `headers().get('x-nonce')`.
//
// `'strict-dynamic'` allows scripts loaded by nonced scripts to also
// execute (needed for dynamically imported chunks).
function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

function buildCspHeader(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    // 'nonce-${nonce}' allows Next.js's inline scripts (RSC streaming,
    // bootstrap) to execute. 'strict-dynamic' allows dynamically loaded
    // chunks. 'unsafe-eval' is dev-only (React DevTools).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""} https://js.stripe.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://imagedelivery.net https://cdn.sanity.io",
    "font-src 'self'",
    "connect-src 'self' https://api.stripe.com wss: https://*.sentry.io https://*.posthog.com",
    "frame-src https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

// ── Proxy function (replaces middleware in Next.js 16) ───────────────
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // P0 fix: generate nonce + build CSP.
  const nonce = generateNonce();
  const csp = buildCspHeader(nonce);

  // Set nonce on REQUEST headers so Next.js auto-adds it to inline scripts.
  // Also set CSP on request headers (per Next.js 16 CSP guide pattern).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  // Check if route requires authentication (prefix match)
  const requiresAuth = AUTH_REQUIRED_ROUTES.some((route) => pathname.startsWith(route));

  if (!requiresAuth) {
    // Public route — pass through with nonce + CSP
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set("Content-Security-Policy", csp);
    return response;
  }

  // Cookie-existence-only optimistic check (Edge-compatible, no DB access)
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const signInUrl = new URL("/auth/sign-in", request.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", pathname);
    const response = NextResponse.redirect(signInUrl, {
      headers: { "Content-Security-Policy": csp },
    });
    // Also set nonce on the redirect's request headers for the sign-in page
    response.headers.set("Content-Security-Policy", csp);
    return response;
  }

  // NOTE: Do NOT do RBAC role checks here. Those happen in layout.tsx.
  // The cookie existence is enough for the optimistic redirect;
  // if the session is invalid/expired, layout.tsx will catch it.
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", csp);
  return response;
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
