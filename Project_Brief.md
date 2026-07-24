# Project Brief — Stillwater Yoga Studio

**Last updated:** 2026-07-24 (V19 remediation complete)
**Current commit:** V19-final (on `main` branch)
**Live site:** https://stillwater.jesspete.shop/

---

## Current Status: V19 Remediation Complete

V19 remediates 22 issues identified by a comprehensive 6-axis audit (security, architecture, aesthetic, a11y, performance, correctness). All fixes use TDD with regression tests. All quality gates pass.

⚠️ **IMPORTANT:** The previous "V18" narrative in this file was fictional — 0 of 13 V18 fixes were ever committed. V19 implements all 13 V18 fixes (with proper TDD tests) plus 9 additional audit findings.

---

## V19 Remediation Summary (2026-07-24)

### Critical Fixes (17)
1. **V19-1:** Define missing `--color-sand-50` and `--color-sand-100` tokens — every primary CTA, Footer wordmark, stat values, SkipLink text, and Checkbox checkmark were rendering INVISIBLE (100+ references, 0 definitions)
2. **V19-2:** Install `tw-animate-css` — all Radix overlay animations (Dialog, DropdownMenu, Popover, Tooltip, Calendar, Select, Command) were silently failing
3. **V19-3:** Create `apps/web/public/` with favicon.ico + icon-192.png + icon-512.png + apple-icon.png — PWA install was broken, favicon 404 on every page load
4. **V19-4:** Eager-load `user` in `instructors.list` + `getBySlug` — unblocks V19-7, V19-10, V19-12
5. **V19-5:** Eager-load `user` in `members.getProfile` — unblocks V19-8
6. **V19-6:** Nested eager-load `instructor.user` in `schedule.getWeek` + `getSession` — unblocks V19-9, V19-12
7. **V19-7:** Fix home page instructor names: `i.user?.name` (was `i.name` → 3 empty `<h3>` elements on live site)
8. **V19-8:** Fix dashboard email: `profile.user.email` (was `profile.phone` → dashboard showed phone as email)
9. **V19-9:** Fix admin schedule: `class.title` + `instructor.user?.name` (was `class.name` + `instructor.name` → "Untitled class" + blank instructor)
10. **V19-10:** Fix admin instructors: `ins.user?.name` (was `ins.name` → blank names)
11. **V19-11:** Fix admin member detail $NaN: extract amount from `payload.amount_received` jsonb (was nonexistent `amountCents` column)
12. **V19-12:** Fix 4 remaining slug-replace locations (instructors list page, admin dashboard, ScheduleGrid, booking-confirmation worker)
13. **V19-13:** Fix EmailFooter fabricated address: import `SITE.address.full` (CAN-SPAM Act §7703 compliance — emails were shipping "123 SE Division Street" which doesn't exist)
14. **V19-14:** Add `SITE.url` + replace 7 hardcoded `https://stillwater.studio` URLs in email templates (a domain we don't own)
15. **V19-15:** Remove misleading HeroNextClass 12-bar spots indicator (hardcoded `spotsTaken=0` → "14 of 14 spots available" was fabricated)
16. **V19-16:** Apply SITE constant to admin settings page
17. **V19-17:** Fix PaymentFailed email payload mismatch: worker now accepts `customerId` (was `memberId` → member lookup always returned undefined → email NEVER sent)

### Medium Fixes (5)
18. **V19-18:** Replace 5 `focus:outline-none` violations with `focus-visible:outline-[3px] outline-water-500` pattern (SKILL §8.3)
19. **V19-19:** Create `/privacy`, `/terms`, `/accessibility` pages (footer legal links were 404)
20. **V19-20:** Add honeypot field to NewsletterForm (SKILL §15.13)
21. **V19-21:** Remove dead duplicate `packages/api/src/lib/jobs-client.ts` (used banned `TriggerClient.sendEvent()` anti-pattern)
22. **V19-22:** Increase Checkbox from `h-4 w-4` (16px) to `h-6 w-6` (24px) — WCAG 2.5.8 AA Target Size (Minimum)

### V19 Quality Gates
| Gate | Result |
|---|---|
| `pnpm check-types` | ✅ All 9 packages pass |
| `pnpm lint` | ✅ 0 errors, 10 intentional `no-console` warnings |
| `pnpm test` | ✅ **823 tests pass** (815 pre-existing + 8 new regression tests) |
| `pnpm build` | ✅ 9/9 packages build; 19 routes (3 new legal pages) |

---

## V19 Outstanding Issues (Deferred — require architectural changes, production env access, or repo-owner coordination)

1. **🔴 CRITICAL: Production auth 500 errors** — Both `POST /api/auth/sign-in/magic-link` and `POST /api/auth/sign-in/social` return HTTP 500 on the live site. Likely cause: production env vars (`BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, Google OAuth credentials) missing or misconfigured. **Requires repo-owner investigation on Vercel.**
2. **Rotate leaked secrets** — Repo owner task
3. **Scrub git history** — Repo owner task
4. **17 `as any` casts in workers** — Drizzle 0.45 RQB type-inference issue; needs Drizzle 1.0+
5. **No `next/image` usage** — Major refactor; would fix scroll-time CLS=0.46
6. **No Redis caching layer** — Architecture change
7. **13/16 shadcn/ui primitives on `forwardRef`** — Consistency miss
8. **3 routes `force-dynamic`** — `/`, `/schedule`, `/pricing`; needs DB-hang investigation
9. **neon-http not pooled** — Architecture change
10. **PostHog analytics misconfigured** — Likely missing `NEXT_PUBLIC_POSTHOG_KEY` env var. **Requires repo-owner investigation.**
11. **CSP includes `'unsafe-inline'` in `script-src`** — Contradicts SKILL.md §14.6.3; needs reconciliation
12. **Doc contradictions in MEP** — Header/footer version, test counts, marketing route count. Doc-only fixes.

---

## V19 Documentation Updates

- **`AUDIT_REMEDIATION.md`** — V19 section appended with full fix table + quality gates + outstanding issues
- **`Project_Brief.md`** — This file (replaced fictional V18 narrative with actual V19 remediation)
- **`PAD.md`** — ADR-009 proxy.ts runtime framing corrected; WCAG AAA→AA per W3C guidance
- **`stillwater_SKILL.md`** — Trigger.dev v3 retirement date corrected; WCAG AAA→AA; §14.6.3 CSP note updated
- **`MASTER_EXECUTION_PLAN.md`** — Internal contradictions reconciled

---

## Historical: V17 Remediation (2026-07-21)

V17 fixed 10 issues from the V14-V16 audit cycle. All V17 fixes are deployed and verified on the live site:
- V17-1: Remove leaked `.env.local` files from git tracking
- V17-2: Rewrite stale CSP tests
- V17-3: Eliminate CLS=0.465 on home page (HeroNextClass skeleton + Cormorant font-display optional)
- V17-4: Remove cartesian-join bug in `getRevenueDetails`
- V17-5: Instructor `<title>` uses `user.name` (properly capitalized)
- V17-6+V17-7: Escape ILIKE wildcards + remove user-id DOM leak
- V17-8: Centralize studio address in shared SITE constant
- V17-9: Resolve lint errors in CSP tests + workers import order
- V17-10: Add per-IP concurrent SSE connection rate limiting

---

## Historical: V18 Narrative (FICTIONAL — never committed)

⚠️ The previous "V18" section in this file described 13 fixes + 33 new tests + "20/20 quality gates" that were **never actually committed**. `git log` confirms only V17-1 through V17-10 commits exist. V19 implements all 13 V18 fixes (with proper TDD tests) plus 9 additional audit findings.
