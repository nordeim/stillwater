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
 * Runs on: Edge or Node.js runtime (Next.js 16 documentation is inconsistent
 * on the default). The 2-layer auth pattern works on both runtimes — cookie-only
 * check is recommended regardless for performance and to avoid DB round-trips
 * on every request. Do NOT call auth.api.getSession() here.
 * See PAD § 9.4 + ADR-009 for route protection logic.
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

// ── Proxy function (replaces middleware in Next.js 16) ───────────────
// Note: Not async — no await needed. The cookie-existence check via
// getSessionCookie() is synchronous. If async work is added later
// (e.g., i18n locale detection), add `async` back.
export function proxy(request: NextRequest) {
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
