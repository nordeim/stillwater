# Project Brief — Stillwater Yoga Studio

**Last updated:** 2026-07-24 (V20 remediation complete)
**Current commit:** V20-final (on `main` branch)
**Live site:** https://stillwater.jesspete.shop/

---

## Current Status: V20 Remediation Complete

V20 remediates 7 issues identified by the V19 live-site E2E verification + codebase re-validation. The most critical finding was a **site-wide CSS cascade bug** in `packages/ui/src/globals.css` — two unlayered rules were silently overriding EVERY Tailwind v4 `@layer utilities` rule, breaking all padding/margin/text-color utilities on anchor CTAs, sections, navbar, and SkipLink. This was the root cause of V19-1 being only PARTIALLY fixed.

All fixes use TDD with regression tests. All quality gates pass.

---

## V20 Remediation Summary (2026-07-24)

### Critical Fixes (4)
1. **V20-1:** Wrap `packages/ui/src/globals.css` resets + link styles in `@layer base` — fixes site-wide padding/margin/text-color breakage (navbar 33px→65px, sections padding 0→correct, CTAs 1.67:1→16.26:1 contrast, SkipLink 1×1px→visible)
2. **V20-2:** Fix `/schedule` page slug-as-name — add nested `instructor: { with: { user: true } }` (V19-12 was incomplete — only fixed the tRPC router, not this direct DB query)
3. **V20-3:** Add root `app/not-found.tsx` — custom 404 page was never used (only `(marketing)/not-found.tsx` existed)
4. **V20-4:** Add auth env var fail-fast validator — `RESEND_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_URL` all silently fell back to placeholders, causing the production auth 500 outage

### Medium Fixes (3)
5. **V20-5:** Remove dead `NEXT_PUBLIC_POSTHOG_HOST` env var (PostHog uses `/_analytics` reverse proxy)
6. **V20-6:** Untrack `pnpm_log.txt` from git (was in .gitignore but still tracked)
7. **V20-7:** Update `.env.example` `BETTER_AUTH_URL` comment to clarify production vs local dev

### V20 Quality Gates
| Gate | Result |
|---|---|
| `pnpm check-types` | ✅ All 9 packages pass |
| `pnpm lint` | ✅ 0 errors (10 intentional `no-console` warnings) |
| `pnpm test` | ✅ **832 tests pass** (823 pre-existing + 9 new regression tests) |
| `pnpm build` | ✅ 9/9 packages build; 20 static pages |

---

## V20 Root Cause Analysis: The CSS Cascade Bug (V20-1)

The most consequential V20 finding was a **site-wide CSS cascade bug** that was the root cause of V19-1 being only PARTIALLY fixed. The V19-1 fix defined the missing `--color-sand-50` and `--color-sand-100` tokens — but live-site E2E showed anchor CTAs still rendered with clay-400 text (1.67:1 contrast on clay-500 background, WCAG AA FAIL) instead of the intended sand-50/sand-100.

**Root cause:** In `packages/ui/src/globals.css`, two rules were UNLAYERED:
```css
* { margin: 0; padding: 0; box-sizing: border-box; }  /* line 11-17 */
a { color: var(--color-action); }                       /* line 54-58 */
```

In Tailwind v4, UNLAYERED rules beat `@layer utilities` rules. This meant `* { padding: 0 }` overrode every `px-6`/`py-3`/`py-24` utility, and `a { color: var(--color-action) }` overrode every `text-sand-50`/`text-sand-100` utility on anchor CTAs.

**Fix:** Wrap both rules (and all other base element styles) in `@layer base { ... }`. Single ~10-line change that restored proper cascade order.

---

## V20 Outstanding Issues (Deferred — require production env access, architectural changes, or repo-owner coordination)

1. **🔴 CRITICAL: Production auth 500 outage** — V20-4 adds the fail-fast validator, but the actual fix requires the repo owner to set `RESEND_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `BETTER_AUTH_URL` in Vercel. With V20-4, the next deploy will either work (if env vars are set) or fail fast with a clear error message (if they're not).
2. **PostHog `/_analytics/array/phc_.../config` 400s** — Requires verifying `NEXT_PUBLIC_POSTHOG_KEY` is a valid PostHog project API key in Vercel env vars.
3. **17 `as any` casts in workers** — Drizzle 0.45 RQB type-inference issue; needs Drizzle 1.0+ `defineRelations()`.
4. **0 `next/image` usage** — Major refactor; would fix scroll-time CLS.
5. **3 routes `force-dynamic`** — `/`, `/schedule`, `/pricing`; needs DB-hang investigation.
6. **neon-http not pooled** — Architecture change; defer.
7. **17 shadcn/ui primitives on `forwardRef`** — Consistency miss.
8. **CSP includes `'unsafe-inline'`** — V16-3 compromise for React hydration; document as canonical.
9. **No ESLint `no-restricted-imports`** — 5-layer architecture by convention only.
10. **MEP internal contradictions** — Header/footer version, test counts. Doc-only fixes.
11. **Cloudflare-managed robots.txt conflicts with app-level robots.ts** — Decide which is canonical.

---

## Historical: V19 Remediation (2026-07-24)

V19 remediates 22 issues identified by a comprehensive 6-axis audit. See `AUDIT_REMEDIATION.md` §V19 for full details. Key fixes: defined missing sand tokens, installed tw-animate-css, created PWA icons, eager-loaded user in 3 routers, fixed 6 page-level bugs, fixed EmailFooter fabricated address, fixed PaymentFailed payload mismatch.

---

## Historical: V18 Narrative (FICTIONAL — never committed)

⚠️ The previous "V18" section in this file described 13 fixes + 33 new tests + "20/20 quality gates" that were **never actually committed**. V19 implements all 13 V18 fixes (with proper TDD tests) plus 9 additional audit findings.
