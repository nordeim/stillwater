# E2E Test Seed Data

> **Run:** `pnpm db:seed && pnpm db:seed:e2e`
>
> **Prerequisites:** Database migrated (`pnpm db:migrate`), base seed applied (`pnpm db:seed`).

## Test Accounts

All accounts use **magic-link authentication** (no password). Enter the email at `/auth/sign-in` and check the server logs / Mailtrap / Resend dashboard for the magic link.

| Account | Email | Role | Pre-existing Data | Use Case |
|---|---|---|---|---|
| Primary | `e2e.member@stillwater.test` | member | None | Booking flow from scratch |
| Booker | `e2e.booker@stillwater.test` | member | 1 upcoming enrollment (tomorrow Vinyasa) | Dashboard with upcoming class |
| Waitlist | `e2e.waitlist@stillwater.test` | member | 1 waitlist entry (tomorrow Ashtanga — FULL) | Waitlist page |
| Cancel | `e2e.cancel@stillwater.test` | member | 1 cancellable enrollment (tomorrow Yin) | Cancel-flow testing |
| History | `e2e.history@stillwater.test` | member | 3 past attended sessions | History page |
| Owner | `alex.rivera@stillwater.test` | owner | Full admin access | Admin pages |

## Seed Data Summary

### Base Seed (`pnpm db:seed`)
- 5 members (1 per role: member, instructor×3, owner)
- 3 instructors (Mei Tanaka, James Harlow, Aiko Mori)
- 4 class styles (Vinyasa, Ashtanga, Yin, Restorative)
- 4 classes (Morning Vinyasa Flow, Ashtanga Primary Series, Yin & Meditation, Restorative Yoga)
- 2 rooms (Main Studio [14], Quiet Room [8])
- 7 sessions (1 per day for the next week)
- 3 membership plans (Pay As You Go, Unlimited, 10 Classes)

### E2E Seed (`pnpm db:seed:e2e`) — layers on top of base
- 5 additional E2E test members (regular members, no staff roles)
- ~30 sessions across 14 days (2-3 per day: morning 7am + evening 6pm/8pm, weekend afternoon 12pm)
- 5 pre-existing enrollments:
  - E2E Booker → tomorrow's Vinyasa (confirmed)
  - E2E Cancel → tomorrow's Yin (confirmed, cancellable)
  - E2E History → 3 past sessions (attended, with checkedInAt)
- 1 pre-existing waitlist entry:
  - E2E Waitlist → tomorrow's Ashtanga (position 1, waiting, expires in 24h)

## Session Schedule (E2E)

Sessions are generated relative to "now" so they're always current:

| Time | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday | Sunday |
|---|---|---|---|---|---|---|---|
| 7:00 AM | Vinyasa (Mei) | Vinyasa (Mei) | Vinyasa (Mei) | Vinyasa (Mei) | Vinyasa (Mei) | Vinyasa (Mei) | Vinyasa (Mei) |
| 9:00 AM | Yin (Aiko) | Yin (Aiko) | Yin (Aiko) | Yin (Aiko) | Yin (Aiko) | Yin (Aiko) | Yin (Aiko) |
| 12:00 PM | — | — | — | — | — | Vinyasa (Mei) | Vinyasa (Mei) |
| 6:00 PM | Ashtanga FULL (James) | Ashtanga FULL (James) | Ashtanga FULL (James) | Ashtanga FULL (James) | Ashtanga FULL (James) | Ashtanga FULL (James) | Ashtanga FULL (James) |
| 8:00 PM | Restorative (Aiko) | Restorative (Aiko) | Restorative (Aiko) | Restorative (Aiko) | Restorative (Aiko) | Restorative (Aiko) | Restorative (Aiko) |

**Note:** The 6:00 PM Ashtanga session has `overrideCapacity: 0` (FULL) — use this for waitlist-flow testing.

## E2E Test Scenarios

### 1. Booking Flow (Primary account)
1. Sign in as `e2e.member@stillwater.test`
2. Navigate to `/schedule`
3. Click "Book" on any available session
4. Verify booking confirmation appears
5. Verify `/dashboard` shows the new enrollment

### 2. Cancel Flow (Cancel account)
1. Sign in as `e2e.cancel@stillwater.test`
2. Navigate to `/dashboard`
3. Verify 1 upcoming enrollment (tomorrow Yin)
4. Click "Cancel"
5. Verify enrollment status changes to cancelled
6. Verify `/history` shows the cancelled enrollment

### 3. Waitlist Flow (Waitlist account)
1. Sign in as `e2e.waitlist@stillwater.test`
2. Navigate to `/dashboard`
3. Verify waitlist indicator shows 1 waiting entry
4. Navigate to the full Ashtanga session
5. Verify "Join Waitlist" button shows position
6. Verify waitlist page shows the entry

### 4. History Page (History account)
1. Sign in as `e2e.history@stillwater.test`
2. Navigate to `/history`
3. Verify 3 past attended sessions appear
4. Verify CSV export works

### 5. Admin Flow (Owner account)
1. Sign in as `alex.rivera@stillwater.test`
2. Navigate to `/admin`
3. Verify dashboard KPIs render
4. Navigate to `/admin/members` — verify member list
5. Navigate to `/admin/schedule` — verify calendar
6. Navigate to `/admin/revenue` — verify revenue chart
7. Navigate to `/admin/audit-log` — verify audit entries

## Resetting E2E Data

To reset and re-seed:
```bash
pnpm db:reset        # Drops all data, re-runs migrations
pnpm db:seed         # Base seed
pnpm db:seed:e2e     # E2E test data
```

## UUID Namespaces

| Namespace | Used For |
|---|---|
| `00000000-0000-4000-a000-*` | Base seed members + membership plans |
| `00000000-0000-4000-b000-*` | Base seed instructors |
| `00000000-0000-4000-c000-*` | Base seed class styles |
| `00000000-0000-4000-d000-*` | Base seed classes |
| `00000000-0000-4000-e000-*` | Base seed rooms |
| `00000000-0000-4000-f000-*` | Base seed sessions |
| `00000000-0000-4eee-a000-*` | E2E test members |
| `00000000-0000-4eee-e000-*` | E2E test enrollments |
| `00000000-0000-4eee-f000-*` | E2E test sessions |
| `00000000-0000-4eee-w000-*` | E2E test waitlist entries |
