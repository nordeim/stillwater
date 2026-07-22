Please check whether you have committed the following changes. Then meticulously plan to continue from there.

I'll systematically continue the work. Let me start by setting up my task list, re-cloning the repo (it was wiped between sessions), and verifying the V17 deployment.
Repo was wiped. Let me re-clone it.
All 11 V17 commits are present. Now let me set up the SSH key + verify the wrapper works, and install pnpm + dependencies.
SSH wrapper works. Now let me install pnpm + dependencies.
Dependencies installed. Now let me read the AUDIT_REMEDIATION.md v17 section to review the outstanding issues list, and in parallel run agent-browser on the live site.
Now let me dispatch the agent-browser E2E in parallel while I review the V17 outstanding issues list and codebase.
**Excellent news — V17 fixes are fully deployed and verified!** Key results:
- **CLS dropped from 0.465 → 0.000** (target was < 0.05) — V17-3 fix works perfectly
- All instructor titles properly capitalized — V17-5 ✅
- JSON-LD + Footer addresses both show "2847 SE Division Street" — V17-8 ✅
- CSP has `'unsafe-inline'` and NO `'strict-dynamic'` — V17-2 ✅
- No new regressions found

Now let me review the V17 Outstanding Issues list (12 deferred items) and scan the codebase for any new issues.
Now I have the V17 outstanding issues list. Let me analyze each to determine which are actionable in this V18 cycle:

**Analysis of the 12 V17 Outstanding Issues:**
1. **Rotate leaked secrets** — Repo owner task (cannot do remotely) — but I should verify whether they were rotated
2. **Scrub git history** — Repo owner task (cannot do safely without coordination)
3. **15 `as any` casts in workers** — Drizzle 0.45 RQB type-inference issue; can be partially mitigated with a typed wrapper
4. **No `next/image` usage** — Major refactor; can tackle a high-impact subset (instructor portraits, hero images)
5. **No Redis caching layer** — Architecture change; defer
6. **13/16 shadcn/ui primitives on `forwardRef`** — Consistency miss; can migrate in a focused pass
7. **proxy.ts CSP no-op** — Intentional, documented — leave alone
8. **SSE rate limit per-instance** — Architecture change; defer
9. **3 routes `force-dynamic`** — Worth attempting to revert now that V16-3 fixed the actual root cause
10. **neon-http not pooled** — Architecture change; defer
11. **PAD.md / MEP.md / Brief.md stale** — Doc-only, can do
12. **SKILL.md 4 stale locations** — Doc-only, can do

Let me also scan the codebase proactively for any NEW issues I haven't seen yet — let me dispatch an Explore agent in parallel with my own analysis.
Excellent — the scan revealed **6 Critical issues + many Important issues**. Most importantly, the scan found that **V17-5 and V17-8 were INCOMPLETE** — there are 4 more slug-replace locations and the EmailFooter still has the fabricated address.

Let me now validate the critical findings myself before planning.
Let me validate each critical finding in parallel batches.
All 5 critical findings confirmed. Let me also validate Critical #6 (EmailFooter still has fabricated address) and the V17-5 incomplete findings:
All findings confirmed. Let me check a few more important findings — the dashboard profile type, the admin schedule page structure, the booking-confirmation worker, and the home page InstructorSection component:
Confirmed — `getProfile` only fetches from `members` table, doesn't eager-load `user`. So the dashboard doesn't have access to `user.email`. The fix is to eager-load `user` in `getProfile` and pass `profile.user.email` to the card.

Let me also check the admin schedule page and the home page InstructorSection to understand the full scope:
Confirmed: `schedule.getWeek` does `with: { class: true, instructor: true, room: true }` — but `instructor: true` does NOT nested-eager-load `user`, so `instructor.name` is undefined (instructors table only has `slug`, not `name`). And `class: true` gives `class.title` (not `class.name`). The admin schedule page casts to `{ name: string }` which is wrong.

Let me check the remaining critical files quickly:
Confirmed — `instructors.list` doesn't eager-load `user`, so `ins.name` is undefined. The fix is to add `with: { user: true }` to the query and update consumers to use `user.name`.

Let me also check the admin member detail page payment history:
Confirmed — `paymentEvents` has no `amountCents` column. The amount lives in `payload` jsonb. Let me check the booking-confirmation worker and the EmailFooter:
Confirmed all findings. Let me also check the email templates' hardcoded URLs and the existing tests for these files:
I have all the validation I need. Now let me also verify the home page instructors query (to understand what fields it currently returns):
Confirmed — the home page `instructors` query doesn't `with: { user: true }`, so `i.name` is undefined. This means the live site's home page Instructors section is showing blank names. But the V17 verification showed the home page renders fine — let me check if maybe the `InstructorRow` component handles undefined name gracefully:
Confirmed — `InstructorRow` renders `{instructor.name}` directly. If `name` is undefined, React renders nothing (empty). So the home page Instructors section shows blank `<h3>` elements. Let me verify this on the live site:
**CONFIRMED — there are 3 empty h3 elements on the live home page** — exactly the 3 instructor names in the Instructors section that are blank because `i.name` is undefined. This is a real production-visible bug.

Let me close the browser and now I have enough validation to plan the V18 remediation.
## V18 Remediation Plan

Based on my validation, here is the comprehensive plan. Let me update my todos and present the plan.

### V18 Plan Summary (Validated Against Codebase)

**Critical Fixes (must-fix, user-visible on live site):**
1. **V18-1:** Home page instructor names blank (3 empty `<h3>` on live site) — eager-load `user` in instructors query, pass `user.name`
2. **V18-2:** Dashboard shows phone as email — eager-load `user` in `members.getProfile`, pass `profile.user.email`
3. **V18-3:** Admin schedule page shows "Untitled class" + blank instructor — fix casts to use `class.title` + eager-load `instructor.user.name`
4. **V18-4:** Admin instructors page shows blank names — eager-load `user` in `instructors.list`, use `user.name`
5. **V18-5:** Admin member detail shows "$NaN" for payments — extract amount from `payload` jsonb instead of nonexistent `amountCents` column
6. **V18-6:** EmailFooter still has fabricated "123 SE Division Street" (V17-8 incomplete) — import `SITE.address.full`

**Important Fixes (V17 incompletes + high-value):**
7. **V18-7:** Complete V17-5 — fix 4 remaining `slug.replace` locations (book page, admin dashboard, instructors list page, ScheduleGrid, booking-confirmation worker)
8. **V18-8:** Replace 7 hardcoded `https://stillwater.studio` URLs in email templates with `process.env.NEXT_PUBLIC_APP_URL` (or a shared constant)
9. **V18-9:** Fix `members.getProfile` to eager-load `user` (supports V18-2)
10. **V18-10:** Fix `instructors.list` + `instructors.getBySlug` to eager-load `user` (supports V18-1, V18-4)
11. **V18-11:** Fix `schedule.getWeek` + `schedule.getSession` to nested-eager-load `instructor.user` (supports V18-3 + book page + ScheduleGrid)

**Minor Fixes (low-risk, high-value):**
12. **V18-12:** Fix HeroNextClass misleading spots indicator (hardcoded `spotsTaken = 0` → either remove indicator or fetch live count)
13. **V18-13:** Apply V17-8 SITE constant to admin settings page (hardcoded studio name/location)

**Defer (architectural — separate epic):**
- Schema fixes (FK on `packageCreditId`, partial unique index on waitlist, audit-log retention, unique constraint on `members.userId`)
- Missing audit log writes across routers (large scope — 5+ routers)
- Missing state checks in `memberships`/`sessions` mutations
- Missing `loading.tsx`/`error.tsx` boundaries (13 routes)
- Missing e2e tests for auth-gated routes
- Worker idempotency gaps (`waitlist-expiry`, `class-cancellation-notify`)
- `as any` casts in workers (needs Drizzle 1.0)
- `force-dynamic` routes (needs DB-hang investigation)
- 156 inline `style={{ fontFamily }}` (mechanical refactor)
Now let me execute the plan. I'll start with the foundational router fixes (V18-9, V18-10, V18-11) since they unblock the page fixes. Let me begin with the `instructors.list` + `instructors.getBySlug` eager-load `user` fix.

## V18-10: Eager-load `user` in instructors router
Let me add TDD tests for V18-10 (eager-load `user` in instructors router):
Now let me also add a test for `getBySlug` eager-loading user:
Now run the tests to confirm TDD RED phase:
TDD RED confirmed (2 new tests failing). Now apply the fix (GREEN phase):
All 9 tests pass. Now let me also fix `members.getProfile` to eager-load `user` (V18-9 — needed for V18-2 dashboard fix):
Let me add a TDD test for V18-9 (getProfile eager-loads user):
Now apply the fix to `members.getProfile`:
Now let me also fix `schedule.getWeek` + `schedule.getSession` to nested-eager-load `instructor.user` (V18-11). Let me check the existing schedule test:
I need to update the schedule test to reflect the new `with: { class: true, instructor: { with: { user: true } }, room: true }` shape:
Let me also check the getSession test to see if it asserts the `with` shape:
The getSession tests don't assert the `with` shape, so they won't break. Now let me apply the fix to `schedule.ts`:
All 24 tests pass. Now let me commit these foundational router fixes, then proceed to the page-level fixes.
Now let me proceed with the page-level fixes. Let me start with V18-1 (home page instructor names) and V18-2 (dashboard email=phone) since they're the most user-visible.
## V18-1: Fix home page instructor names

The home page now gets instructors with `user` eager-loaded (via V18-10). I need to update the page to pass `user.name` instead of the nonexistent `i.name`.
Now let me write a TDD test for the home page. Since the page is a server component with DB queries, I'll write a structural test that verifies the page source uses `user?.name`. Let me check the existing test patterns for similar pages:
Good — there's an existing structural test pattern. Let me write a V18-1 test that verifies the home page uses `user?.name`:
All 3 tests pass. Now let me also fix V18-2 (dashboard email=phone) and write a test:
Now I need to check if there's a `profile` type cast that needs updating. Let me look at the full page to see if there's a typed interface for profile:
The `profile` variable isn't typed via a custom interface — it's inferred from `caller.members.getProfile()`. Since I added `with: { user: true }` to the procedure, the inferred type now includes `user`. The `profile.user?.email` access should type-check correctly. Let me verify:
Type-check passes. Now let me write a TDD test for V18-2:
All 5 tests pass. Let me commit V18-1 + V18-2 and move on to V18-3 (admin schedule page):
## V18-3: Fix admin schedule page (class.title + instructor.user.name)
Now update the rendering — change `session.class?.name` → `session.class?.title` and `session.instructor?.name` → `session.instructor?.user?.name`:
Now let me also check if the `ScheduleCalendar` component (which receives `typedSessions`) needs updating:
Now let me write the V18-3 test and verify everything passes:
All 7 V18-3 tests pass + type-check passes. Now let me handle V18-4 (admin instructors page) and V18-5 (admin member detail $NaN) — let me do them together since they're both admin pages.

## V18-4: Fix admin instructors page
Now update the rendering — `{ins.name}` → `{ins.user?.name ?? ins.slug}`:
## V18-5: Fix admin member detail $NaN

Let me look at the member detail page to understand how to extract the amount from `payload`:
Let me check how `getRevenueDetails` (already fixed in V17-4) extracts the amount from `payload` jsonb — I should use the same pattern:
The amount is in `payload->>'amount_received'`. For the member detail page, the `paymentHistory` comes from somewhere — let me check the procedure:
The `paymentHistory` returns raw `paymentEvents` rows which have `payload` (jsonb) but no `amountCents` column. The fix is to extract the amount from `payload.amount_received` on the client side. Let me update the page:
Now let me write TDD tests for V18-4 + V18-5 and verify everything:
The test for "fallback to 0" failed because my regex `:\s*0\s*\)` didn't match the actual code. Let me look at the actual code and fix the test:
The local variable is `amountCents` (not `payment.amountCents`). Let me fix the test regex:
All 7 tests pass. Let me commit V18-3 + V18-4 + V18-5:
Now let me handle V18-6 (EmailFooter fabricated address — V17-8 incomplete) and V18-7 (4 remaining slug.replace locations) together since they're both "complete the V17 fix" items.

## V18-6: Fix EmailFooter fabricated address
Now I need to check if `@stillwater/email` has `@stillwater/config` as a dependency:
Good — `@stillwater/config` is already a dependency. Let me also check the EmailFooter test to see if it needs updating:
The existing test checks for "Portland" + "OR" which still pass with the new SITE constant. Let me add a V18-6 test that asserts the correct address:
I removed the `STUDIO_NAME` constant but it's still referenced elsewhere in the file (the copyright line). Let me check:
All 5 tests pass. Now let me handle V18-7 (4 remaining slug.replace locations). Let me look at each:

## V18-7: Complete V17-5 — fix 4 remaining slug.replace locations
Let me check each location. The `(marketing)/page.tsx:135` + `instructors/[slug]/page.tsx:110,142` are the V18-1 + V17-5 fixes (they use `user.name ?? slug.replace` as fallback — that's correct). The remaining unfixed locations are:
1. `(marketing)/instructors/page.tsx:82` — instructors list page
2. `(admin)/admin/page.tsx:132` — admin dashboard
3. `components/marketing/ScheduleGrid.tsx:44` — schedule grid (used by home + schedule pages)
4. `services/workers/src/booking-confirmation.ts:70` — worker (passes slug as instructor name to email)

Let me check what data each has available:
Now let me check the instructors list page to see if it uses the tRPC procedure (which now eager-loads user) or queries DB directly:
The instructors list page queries the DB directly (not via tRPC). I need to add `with: { user: true }` to this query too. Let me fix it:
Now update the rendering:
Now let me fix the admin dashboard (line 132). Let me check its data source:
The admin dashboard uses `caller.schedule.getWeek` which now (V18-11) eager-loads `instructor.user`. Let me update the cast + rendering:
Now update the rendering (line 132):
Now let me fix the ScheduleGrid component (line 44). Let me check its props interface:
Now let me fix the booking-confirmation worker:
Now update the query to nested-eager-load `instructor.user` and the `sendBookingConfirmation` call to use `user.name`:
Now let me write a TDD test for V18-7 and verify everything:
The path to the worker file is wrong. Let me fix it:
Let me count the directory depth: `apps/web/src/app/api/auth/[...all]/` is 7 levels deep from the repo root. So from the test file, `../../../../../../` goes up to the repo root, then `services/workers/src/`. Let me fix:
Let me count more carefully. The test file is at:
`/home/z/my-project/stillwater/apps/web/src/app/api/auth/[...all]/v18-7-slug-replace-locations.test.ts`

From `[...all]/` to repo root:
- `[...all]/` → `auth/` (1)
- `auth/` → `api/` (2)
- `api/` → `app/` (3)
- `app/` → `src/` (4)
- `src/` → `web/` (5)
- `web/` → `apps/` (6)
- `apps/` → repo root (7)

So I need `../../../../../../../` (7 levels up) to reach the repo root. Let me fix:
All 8 V18-7 tests pass. Let me verify type-check + workers tests still pass:
All green. Let me commit V18-6 + V18-7:
Now let me handle V18-8 (email template hardcoded URLs), V18-12 (HeroNextClass spots indicator), and V18-13 (admin settings SITE constant).

## V18-8: Replace hardcoded stillwater.studio URLs in email templates
I need a shared constant for the app URL. Let me check what's already available in `@stillwater/config`:
The env var is `NEXT_PUBLIC_APP_URL`. But email templates run in Node.js (not browser), so `NEXT_PUBLIC_APP_URL` is accessible via `process.env`. However, the email package shouldn't depend on Next.js env vars directly. Let me add an `APP_URL` to the SITE constant in `@stillwater/config/site`:
Now let me update the site.test.ts to cover the new `url` field, then update all 7 email templates:
All 11 site tests pass. Now let me update all 7 email templates. I'll do them in a batch:
Let me update each template. I'll use `sed` for the simple URL replacements and add the import:
Now I need to handle the URL replacements carefully — the `sed` replaced the string literals with template literals, but the surrounding quotes need to change from `'` to backtick. Let me check each file:
The `const scheduleUrl = '${SITE.url}/schedule'` is wrong — it's a string literal, not a template literal. I need to change the quotes to backticks. Let me fix each:
Now fix the WelcomeMember href (it's in JSX, needs `{` braces):
Now fix the PaymentFailed template (mailto + email):
 let me verify no more hardcoded stillwater.studio URLs remain (excluding tests):
No more hardcoded URLs. Let me run the email tests to verify:
All 72 email tests pass (was 71 — the new V18-6 EmailFooter test added 1). Let me also verify type-check:
All green. Now let me handle V18-12 (HeroNextClass spots indicator) and V18-13 (admin settings SITE constant) quickly.

## V18-12: Fix HeroNextClass misleading spots indicator
The spots indicator shows 12 bars all in `bg-stone-200` (none filled) and says "12 spots available" — which is misleading because it implies we know the live count. The cleanest fix is to remove the spots indicator entirely and replace with a simple "Reserve Spot →" CTA (which already exists). This is also more honest — we don't have the live count without an extra query.
Now I need to clean up the unused constants (`DEFAULT_CAPACITY`, `SPOTS_BAR_COUNT`) and update the test. Let me check:
The constants are no longer used. Let me remove them:
Now let me run the HeroNextClass tests to verify they still pass (the V17-3 tests checked for min-h-[280px] which is still present):
All 3 HeroNextClass tests pass. Now let me handle V18-13 (admin settings SITE constant) quickly.

## V18-13: Apply SITE constant to admin settings page
Now let me run the full quality gates to verify everything passes:
Tests + check-types pass (18/20 successful), but lint has 10 errors. Let me see what they are:
I have lint errors in 3 files:
1. `admin/members/[id]/page.tsx` — dot notation + unnecessary type assertions (V18-5)
2. `admin/settings/page.tsx` — import order (V18-13)
3. Some file with unnecessary conditional (let me find it)
 files with errors. Let me fix them:

1. `admin/members/[id]/page.tsx` — use dot notation + remove unnecessary type assertions
2. `admin/settings/page.tsx` — fix import order
3. `dashboard/page.tsx` — the `profile.user?.email` is flagged because `user` is now always defined (non-nullable) per the V18-9 eager-load. Let me fix:
Wait — `Record<string, unknown>` doesn't allow dot notation access for arbitrary keys. The lint error is because `amount_received` is a valid identifier. But TypeScript with `Record<string, unknown>` should allow `payment.payload?.amount_received`. Let me check if the type-check still passes:
Type-check passes. Now fix the settings page import order:
Now fix the dashboard `profile.user?.email` — since V18-9 eager-loads `user` with `with: { user: true }`, the type is non-nullable. But the cast in the dashboard might still mark it as optional. Let me check:
The lint says `profile.user?.email` has an unnecessary conditional because `user` is now always defined (non-nullable) per the V18-9 eager-load. Let me simplify to `profile.user.email`:
Now I need to update the V18-2 test since it expected `profile.user?.email` but now it's `profile.user.email`:
Now let me re-run lint + the affected tests:
2 remaining lint errors + 1 test failure. Let me check the settings page import order and the dashboard unnecessary conditional:
The settings page needs an empty line between import groups, and the dashboard `profile.user.email ?? ''` has an unnecessary `?? ''` because `email` is non-nullable. Let me fix:
Now update the V18-2 test to match (no `?? ''`):
Now fix the V18-5 test — the dot notation change broke the regex. Let me check:
The V18-5 test regex was `payload\??\?\.\[?['"]amount_received` which expected bracket notation. Now it's dot notation. Let me fix:
Tests pass but lint still fails. Let me check what's left:
The settings page still has import order issues — I removed the empty line but the rule wants an empty line BETWEEN groups. `@stillwater/config/site` is one group, `next` type import is another, `@/lib/trpc/server` is another. Let me check the import order rule:
I see — the convention is: external imports first (next, react-email, etc.), then a blank line, then internal `@/` imports. `@stillwater/config/site` is a workspace package (external-like). Let me look at how the email package does it:
So the pattern is: external imports, blank line, `@stillwater/*` imports. Let me fix the settings page:
The rule wants `@stillwater/config/site` BEFORE `next` type import. Let me reorder:
The issue is `@stillwater/config/site` (value import) and `next` (type import) are in different groups but no empty line between them. Let me add the empty line:
Lint passes (0 errors). Now let me run the full quality gates one final time:
**ALL 20 TASKS SUCCESSFUL** — check-types + lint + test all pass across all packages. Let me get the final test count:
**848 tests passing** total (was 815 after V17 — added 33 new tests in V18). Let me commit the V18-8 + V18-12 + V18-13 batch:
All V18 code fixes are committed. Now let me update the documentation.
## Phase: Documentation Sync

Let me append the v18 section to AUDIT_REMEDIATION.md and update Project_Brief.md:
Now let me update Project_Brief.md with the V18 status:
Now let me update the "Things worth flagging" section + the test counts. Let me find the test count section:
Now let me add a V18 note to the "Things worth flagging" section. Let me find it:
