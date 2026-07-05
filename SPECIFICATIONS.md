# 📐 Stillwater Implementation Specifications

> **Document Status:** `ACTIVE — v1.0.0`
> **Classification:** Implementation Reference (Companion to PAD.md)
> **Audience:** Coding agents, frontend engineers, content authors
> **Owner:** Engineering Lead
> **Companion:** This document is the companion to `PAD.md`. Every section is cross-referenced.

---

## Document Control

| Version | Date       | Author           | Status   | Summary of Changes            |
|---------|------------|------------------|----------|-------------------------------|
| 1.0.0   | 2026-07-05 | Claw Code / Spec | Active   | Initial specification companion to PAD.md v1.1.0 |

---

## Purpose & Relationship to PAD.md

`PAD.md` defines the **architecture** — what technologies, data shapes, and high-level patterns.
This document defines the **specifications** — what every component, route, form, error message, and interaction looks like.

```
PAD.md                              SPECIFICATIONS.md (this)
────────                            ─────────────────────────
What is built                       How it's built
What data exists                    What the UI shows
What technologies are used           What each component does
What rules exist (RBAC, design)     What strings the user sees
What flows happen                   What happens in each state
   ↓                                   ↓
ARCHITECTURE                        IMPLEMENTATION
```

**Rule of thumb:** If you're answering "what" or "why", check PAD.md. If you're answering "how" or "what does it look like", check here.

### Cross-Reference Index

| This document | → PAD.md section |
|---------------|-------------------|
| §2 Procedure Catalog | §8 (API Architecture) |
| §3 Component Interfaces | §10 (Frontend), §11 (Design System), §13 (SSE) |
| §4 Page Content | §12 (Rendering Strategy), §14 (Sanity) |
| §5 Form Schemas | §8 (tRPC), §10 (Forms), §15 (Payments) |
| §6 Error Messages | §28 (Error Handling) |
| §7 Responsive Behavior | §11.4 (Spacing), §10.1 (Hierarchy) |
| §8 Animation Choreography | §11.5 (Motion) |
| §9 Admin Dashboard | §8 (admin router), §18 (Observability) |
| §10 Loading States | §10.5 (UI State Completeness) |
| §11 Empty States | §10.5 (UI State Completeness) |
| §12 Interaction States | §22 (Accessibility), §11 (Design System) |
| §13 Validation Rules | §8 (Zod), §15 (Stripe), §7 (DB constraints) |
| §14 Notification Copy | §28 (Error Handling), §16 (Email) |
| §15 Date/Time Formatting | §24 (i18n Intl) |

---

## 1. Document Convention

- Every **`Member`** reference = authenticated user with at least one membership or trial
- Every **`Guest`** reference = unauthenticated visitor
- Every **`Staff`** reference = `staff`, `manager`, or `owner` role
- Every **`Owner`** reference = `owner` role only
- Page content uses **real copy** (no lorem ipsum). Tone: warm, precise, unhurried — matches the "Editorial Calm" aesthetic.
- All strings assume the studio is in **Pacific Time** for v1 (i18n deferred per PAD §24).

---

## 2. Complete tRPC Procedure Catalog

This section expands PAD §8.4 (which lists "Selected Critical Paths") into the **complete** production procedure catalog. Every procedure below is required for v1.

### 2.1 Naming & Structure Conventions

```typescript
// All procedure names follow verb-first convention:
//   get, list, create, update, delete, check, trigger, cancel, claim, leave, pause, resume
// No abbreviations. No hungarian notation.

// All inputs are Zod-validated at the procedure boundary (PAD §8.1, Rule 3).
// All procedures return discriminated unions where status matters:
//   type BookingResult = { status: 'confirmed'; enrollmentId: string }
//                       | { status: 'waitlisted'; position: number };
```

### 2.2 Schedule Router (`schedule.*`) — Public

| Procedure | Type | Access | Purpose |
|-----------|------|--------|---------|
| `schedule.getWeek` | query | public | All sessions for an ISO week + live count |
| `schedule.getDay` | query | public | Sessions for a calendar day |
| `schedule.getMonth` | query | public | All sessions in a month (paginated) |
| `schedule.getSession` | query | public | Single session with full detail |
| `schedule.getFilters` | query | public | Filter dimensions (styles, levels, instructors) |

```typescript
// schedule.getWeek
input: {
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // ISO date (Monday)
  classId?: z.string().uuid(),
  instructorId?: z.string().uuid(),
  level?: z.enum(['all', 'beginner', 'intermediate', 'advanced']),
  styleId?: z.string().uuid(),
}
output: {
  weekStart: string;
  sessions: Array<{
    id: string;
    classId: string;
    classTitle: string;
    classSlug: string;
    classLevel: ClassLevel;
    styleName: string;
    styleColor: string;
    instructorId: string;
    instructorName: string;
    instructorSlug: string;
    roomName: string;
    startsAt: string;     // ISO
    endsAt: string;
    durationMinutes: number;
    capacity: number;
    enrolled: number;
    available: number;
    isFull: boolean;
    isVirtual: boolean;
    status: SessionStatus;
  }>;
}
```

```typescript
// schedule.getSession
input: { sessionId: z.string().uuid() }
output: {
  id: string;
  classTitle: string;
  classDescription: string;
  classLevel: ClassLevel;
  instructor: { id, name, slug, bio, imageKey };
  room: { name, capacity };
  startsAt: string;
  endsAt: string;
  enrolled: number;
  capacity: number;
  available: number;
  isFull: boolean;
  isVirtual: boolean;
  streamUrl: string | null;
  currentUserEnrollment: { status: EnrollmentStatus; id: string } | null;
  currentUserWaitlistPosition: number | null;
}
```

### 2.3 Bookings Router (`bookings.*`) — Protected/Staff

| Procedure | Type | Access | Purpose |
|-----------|------|--------|---------|
| `bookings.book` | mutation | protected | Book session; auto-waitlist if full |
| `bookings.cancel` | mutation | protected | Cancel booking; triggers waitlist promotion |
| `bookings.checkIn` | mutation | staff | Staff check-in for attendance |
| `bookings.undoCheckIn` | mutation | staff | Reverse a check-in (mistakes, etc.) |
| `bookings.markNoShow` | mutation | staff | Mark member as no-show after session |
| `bookings.getUpcoming` | query | protected | Member's upcoming bookings |
| `bookings.getPast` | query | protected | Member's past bookings (paginated) |
| `bookings.getForSession` | query | staff | Roster for a specific session |

```typescript
// bookings.book — the critical-path procedure
input: {
  sessionId: z.string().uuid(),
  notes: z.string().max(500).optional(),
}
output: { status: 'confirmed'; enrollmentId: string; sessionId: string }
       | { status: 'waitlisted'; position: number; sessionId: string }
       | { status: 'already_enrolled' }
       | { status: 'already_waitlisted'; position: number }
       | { status: 'session_cancelled' }
       | { status: 'session_in_past' }
       | { status: 'no_credits' }
       | { status: 'membership_required' }
throws: TRPCError(BAD_REQUEST | NOT_FOUND | CONFLICT | PAYMENT_REQUIRED)
```

```typescript
// bookings.cancel
input: {
  enrollmentId: z.string().uuid(),
  reason: z.string().max(500).optional(),
}
output: { status: 'cancelled'; refundedCredit: boolean }
throws: TRPCError(NOT_FOUND | FORBIDDEN if not own)
// Side effect: triggers Trigger.dev 'waitlist-promotion' job
```

```typescript
// bookings.checkIn
input: {
  enrollmentId: z.string().uuid(),
}
output: { status: 'checked_in'; checkedInAt: string }
throws: TRPCError(NOT_FOUND | FORBIDDEN)
```

### 2.4 Waitlist Router (`waitlist.*`) — Protected

| Procedure | Type | Access | Purpose |
|-----------|------|--------|---------|
| `waitlist.join` | mutation | protected | Add to waitlist (called from bookings.book automatically when full, but also available standalone) |
| `waitlist.leave` | mutation | protected | Remove from waitlist |
| `waitlist.claimOffer` | mutation | protected | Accept promoted waitlist spot within expiry window |
| `waitlist.declineOffer` | mutation | protected | Decline promoted spot (promotes next in line sooner) |
| `waitlist.getMine` | query | protected | All current waitlist entries for the member |

```typescript
// waitlist.claimOffer — invoked when member taps "Claim Spot" in email
input: {
  waitlistEntryId: z.string().uuid(),
}
output: { status: 'claimed'; enrollmentId: string }
       | { status: 'expired' }
       | { status: 'already_claimed_by_other' }  // race: another member took it
       | { status: 'spot_no_longer_open' }
```

### 2.5 Members Router (`members.*`) — Protected (Self)/Staff

| Procedure | Type | Access | Purpose |
|-----------|------|--------|---------|
| `members.getProfile` | query | protected (self) | Own member profile |
| `members.updateProfile` | mutation | protected (self) | Update own profile fields |
| `members.getHistory` | query | protected (self) | Attendance + booking history |
| `members.getStats` | query | protected (self) | Lifetime stats (classes attended, streak, etc.) |
| `members.list` | query | staff | All members (paginated, filterable) |
| `members.getById` | query | staff | Single member detail with full history |
| `members.getAttendanceRate` | query | staff | Attendance % for a member |

```typescript
// members.updateProfile
input: {
  displayName: z.string().min(1).max(100).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional().or(z.literal('')),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  emergencyContact: z.string().max(100).optional().or(z.literal('')),
  emergencyPhone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
}
output: { member: Member; updatedAt: string }
```

### 2.6 Instructors Router (`instructors.*`) — Public/Staff

| Procedure | Type | Access | Purpose |
|-----------|------|--------|---------|
| `instructors.list` | query | public | Active instructors (for marketing + filters) |
| `instructors.getBySlug` | query | public | Single instructor (public bio) |
| `instructors.getMySchedule` | query | instructor | Instructor's upcoming sessions |
| `instructors.getAvailability` | query | instructor | Slots when not booked to teach |
| `instructors.updateAvailability` | mutation | instructor | Toggle availability slots |
| `instructors.create` | mutation | staff | Add new instructor profile |
| `instructors.update` | mutation | staff | Edit instructor record |
| `instructors.deactivate` | mutation | owner | Soft-delete instructor |

### 2.7 Classes Router (`classes.*`) — Public/Staff

| Procedure | Type | Access | Purpose |
|-----------|------|--------|---------|
| `classes.list` | query | public | Class catalog (active classes) |
| `classes.getBySlug` | query | public | Single class detail (public marketing) |
| `classes.listStyles` | query | public | Distinct class styles (for filters) |
| `classes.create` | mutation | staff | Add new class to catalog |
| `classes.update` | mutation | staff | Edit class attributes |
| `classes.archive` | mutation | staff | Soft-delete (isActive = false) |
| `classes.reorder` | mutation | staff | Update sortOrder for catalog ordering |

### 2.8 Sessions Router (`sessions.*`) — Staff

Note: `sessions.*` routes are for **class sessions** (specific scheduled occurrences), not web sessions.

| Procedure | Type | Access | Purpose |
|-----------|------|--------|---------|
| `sessions.list` | query | staff | All sessions in a date range (admin calendar) |
| `sessions.getById` | query | staff | Full session detail for admin |
| `sessions.create` | mutation | staff | Schedule a new session |
| `sessions.createBulk` | mutation | staff | Schedule a recurring session (e.g., weekly) |
| `sessions.update` | mutation | staff | Edit session (room, instructor, time) |
| `sessions.cancel` | mutation | staff | Cancel session (triggers class-cancellation-notify job) |
| `sessions.cloneWeek` | mutation | staff | Duplicate a week's sessions to another week |
| `sessions.duplicate` | mutation | staff | Single-session clone to a new date |

```typescript
// sessions.createBulk — recurring schedule creation
input: {
  classId: z.string().uuid(),
  instructorId: z.string().uuid(),
  roomId: z.string().uuid().or(z.null()),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // For each weekday, what time?
  weekdays: z.array(z.object({
    weekday: z.number().int().min(0).max(6), // 0=Sunday
    startsAtTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), // "09:30"
    durationMinutes: z.number().int().min(15).max(240),
    overrideCapacity: z.number().int().min(1).max(100).optional(),
  })).min(1),
  isVirtual: z.boolean().default(false),
  streamUrl: z.string().url().optional(),
}
output: { createdSessions: string[]; skippedConflicts: Array<{ date: string; reason: string }> }
```

### 2.9 Memberships Router (`memberships.*`) — Public/Protected

| Procedure | Type | Access | Purpose |
|-----------|------|--------|---------|
| `memberships.getPlans` | query | public | All active membership plans |
| `memberships.getPlanById` | query | public | Single plan detail |
| `memberships.subscribe` | mutation | protected | Start subscription via Stripe Checkout |
| `memberships.cancel` | mutation | protected | Cancel at period end |
| `memberships.resume` | mutation | protected | Undo cancellation (if period not yet ended) |
| `memberships.pause` | mutation | protected | Pause subscription (max 90 days/year) |
| `memberships.unpause` | mutation | protected | Resume from pause |
| `memberships.changePlan` | mutation | protected | Upgrade/downgrade (Stripe proration) |
| `memberships.getMySubscription` | query | protected | Current member subscription + status |
| `memberships.getMyCreditLedger` | query | protected | Credit grants + consumption history |
| `memberships.purchasePackage` | mutation | protected | Buy one-time class package via Stripe |
| `memberships.createPlan` | mutation | owner | Add new membership plan |
| `memberships.updatePlan` | mutation | owner | Edit plan (price, credits, etc.) |
| `memberships.archivePlan` | mutation | owner | Soft-delete plan |

```typescript
// memberships.subscribe
input: {
  planId: z.string().uuid(),
  trialDays: z.number().int().min(0).max(30).optional().default(0),
}
output: { checkoutUrl: string; sessionId: string }
throws: TRPCError(BAD_REQUEST if no customer record yet)
```

```typescript
// memberships.purchasePackage
input: {
  packageType: z.enum(['drop_in', '5_pack', '10_pack', '20_pack']),
}
output: { checkoutUrl: string; sessionId: string }
```

### 2.10 Payments Router (`payments.*`) — Protected

| Procedure | Type | Access | Purpose |
|-----------|------|--------|---------|
| `payments.getPortalUrl` | mutation | protected | Stripe customer portal URL |
| `payments.getInvoices` | query | protected | Invoice history |
| `payments.getUpcomingInvoice` | query | protected | Next invoice preview |
| `payments.getPaymentMethods` | query | protected | Saved cards |
| `payments.removePaymentMethod` | mutation | protected | Remove a saved card |
| `payments.setDefaultPaymentMethod` | mutation | protected | Set default card |

### 2.11 Admin Router (`admin.*`) — Staff/Owner

| Procedure | Type | Access | Purpose |
|-----------|------|--------|---------|
| `admin.getDashboard` | query | staff | KPIs for admin home (today, week, month) |
| `admin.getRevenue` | query | manager | Revenue breakdown (by plan, by month) |
| `admin.getAttendance` | query | staff | Attendance rates by class, instructor, time |
| `admin.getClassRoster` | query | staff | Session roster with check-in status |
| `admin.getWaitlists` | query | staff | All active waitlists across sessions |
| `admin.getNoShows` | query | staff | Recent no-shows for follow-up |
| `admin.getMembersAtRisk` | query | manager | Members with declining attendance |
| `admin.sendBroadcast` | mutation | owner | Send broadcast email to member segment |
| `admin.assignRole` | mutation | owner | Assign studio role to member |
| `admin.revokeRole` | mutation | owner | Remove studio role |
| `admin.getRoles` | query | owner | All role assignments |
| `admin.getSettings` | query | owner | Studio settings |
| `admin.updateSettings` | mutation | owner | Edit studio settings |
| `admin.getAuditLog` | query | owner | Recent admin/staff actions |

```typescript
// admin.getDashboard
input: { date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() } // defaults today
output: {
  today: {
    sessionsCount: number;
    bookedCount: number;
    waitlistCount: number;
    checkedInCount: number;
    noShowCount: number;
  };
  thisWeek: { /* same shape */ };
  thisMonth: { /* same shape */ };
  anomalies: Array<{
    type: 'declining_attendance' | 'payment_failures' | 'inactive_members';
    count: number;
  }>;
}
```

```typescript
// admin.getRevenue
input: {
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  groupBy: z.enum(['day', 'week', 'month']).default('month'),
}
output: {
  mrr: number;
  arr: number;
  churnRate: number;
  breakdown: Array<{
    period: string;
    revenue: number;
    newSubscriptions: number;
    cancellations: number;
    net: number;
  }>;
  byPlan: Array<{ planId: string; planName: string; revenue: number; count: number }>;
}
```

### 2.12 Realtime Router (`realtime.*`) — SSE Bridge (Internal)

SSE subscriptions are handled at the route handler level (PAD §13.2), not as tRPC procedures. However, an internal helper router exists for client-side state management:

| Procedure | Type | Access | Purpose |
|-----------|------|--------|---------|
| `realtime.ping` | query | public | Health check for SSE connection stability |
| `realtime.getSeatSnapshot` | query | public | One-shot current seat state (no SSE subscription) |

### 2.13 Procedures NOT Included in v1 (Deferred)

The following are intentionally **not implemented** in v1 (documented non-goals):

- ✗ Native mobile push (web push only via Resend → device tokens deferred)
- ✗ Friend/social features (referral system, follow other members)
- ✗ Self-service class package gifting (admin-managed only in v1)
- ✗ In-app messaging between members
- ✗ Video streaming (uses external Zoom/Meet URLs per PAD §2.3)
- ✗ POS integration per PAD §2.3

---

## 3. Component Interface Catalog

This section defines the **TypeScript interface contract** for every component listed in PAD §10.1, §11.6, and the directory tree. A coding agent can lift these directly into `packages/ui/src/components/*` without ambiguity.

### 3.1 packages/ui/src/components — Shared Design System

#### 3.1.1 `Button`

```typescript
import { type VariantProps } from 'class-variance-authority';

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;          // Radix Slot pattern
  loading?: boolean;         // Shows spinner, disables button
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-body font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary:    'bg-clay-400 text-sand hover:bg-clay-500 active:bg-clay-600',
        secondary:  'bg-water-500 text-sand hover:bg-water-600',
        outline:    'border border-stone-300 bg-transparent text-stone-900 hover:bg-sand-warm',
        ghost:      'text-stone-700 hover:bg-sand-warm',
        destructive: 'bg-error text-sand hover:bg-red-700',
        link:       'text-water-600 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3 text-sm',         // 36px min - text-dense contexts only
        md: 'h-11 px-5 text-base',      // 44px - default (WCAG AAA)
        lg: 'h-13 px-7 text-lg',        // 52px - hero CTAs
        xl: 'h-15 px-9 text-xl',        // 60px - dramatic moments
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);
```

#### 3.1.2 `Input`

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;                       // Required - label/aria pairing
  description?: string;                // Hint text below field
  error?: string;                      // Error message; shows in red, replaces description
  leadingIcon?: React.ReactNode;
  trailingAddon?: React.ReactNode;
  required?: boolean;                  // Adds * to label + required attribute
  hideLabel?: boolean;                 // Visually hide label (still present for screen readers)
}

// Validation states:
// default:    border-stone-300
// hover:      border-stone-400
// focus:      ring-3 ring-water-500 ring-offset-2 border-water-500
// error:      border-error, ring-error, error message shown
// disabled:   bg-stone-100 text-stone-400 cursor-not-allowed
```

#### 3.1.3 `Select` (wraps Radix Select)

```typescript
interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface SelectProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  label: string;
  description?: string;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  // Radix-specific grouping:
  groups?: Array<{ label: string; options: SelectOption[] }>;
}
```

#### 3.1.4 `Dialog` (wraps Radix Dialog)

```typescript
interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  
  // Content:
  title: string;                         // Required - Radix requires for a11y
  description?: string;                  // Optional but recommended
  children: React.ReactNode;             // Body content
  
  // Layout:
  size?: 'sm' | 'md' | 'lg' | 'xl';    // max-w: 384 | 512 | 640 | 768
  showCloseButton?: boolean;
  
  // Footer:
  footer?: React.ReactNode;              // Typically action buttons
  primaryAction?: { label: string; onClick: () => void; loading?: boolean };
  secondaryAction?: { label: string; onClick: () => void };
  destructive?: boolean;                 // Styles primaryAction as destructive variant
}

// Trigger as child:
<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>...</DialogContent>
</Dialog>
```

#### 3.1.5 `Badge`

```typescript
type BadgeVariant =
  | 'neutral' | 'success' | 'warning' | 'error' | 'info'
  | 'class-level-beginner' | 'class-level-intermediate' | 'class-level-advanced'
  | 'enrollment-confirmed' | 'enrollment-waitlisted' | 'enrollment-cancelled'
  | 'membership-active' | 'membership-paused' | 'membership-cancelled'
  | 'virtual' | 'in-person';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant: BadgeVariant;
  size?: 'sm' | 'md';
  leadingIcon?: React.ReactNode;
}
```

#### 3.1.6 `Calendar` (wraps react-day-picker)

```typescript
interface CalendarProps {
  mode: 'single' | 'range';
  selected?: Date | { from: Date; to: Date };
  onSelect?: (date: Date | { from: Date; to: Date } | undefined) => void;
  disabled?: (date: Date) => boolean;        // e.g., blackout dates
  fromDate?: Date;
  toDate?: Date;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6; // default 1 (Monday)
  modifiers?: Record<string, (date: Date) => boolean>;
  modifiersClassNames?: Record<string, string>;
}
```

#### 3.1.7 `Toast` / `Sonner` wrappers

```typescript
interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  duration?: number;           // ms; default 4000
  action?: { label: string; onClick: () => void };
}

// Convenience functions (re-exported from design §10.5):
toast.success(message, description?);
toast.error(message, description?);
toast.warning(message, description?);
toast.info(message, description?);
toast.promise(promiseFn, { loading, success, error });
```

#### 3.1.8 `Avatar`

```typescript
interface AvatarProps {
  src?: string;                   // R2 image key; resolved via Cloudflare Images
  name: string;                   // Used for initials fallback + aria-label
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';  // 24 | 32 | 40 | 56 | 80 px
  alt?: string;                   // Defaults to name
}

// Renders initials in circles when src missing or fails
```

#### 3.1.9 `DataTable` (wraps @tanstack/react-table)

```typescript
interface DataTableProps<TData> {
  data: TData[];
  columns: Array<{
    id: string;
    header: string | (() => React.ReactNode);
    accessorKey?: keyof TData;
    cell?: (ctx: { row: TData; value: unknown }) => React.ReactNode;
    enableSorting?: boolean;
    enableHiding?: boolean;
    width?: number;
  }>;
  
  // Features:
  enablePagination?: boolean;     // default true; uses paginated tRPC
  enableSorting?: boolean;       // default true
  enableFilters?: boolean;
  enableRowSelection?: boolean;
  enableColumnVisibility?: boolean;
  
  // UI:
  pageSize?: number;              // default 20
  emptyState?: React.ReactNode;
  loadingState?: React.ReactNode; // shown while paginated query is loading
  onRowClick?: (row: TData) => void;
  
  // Selections:
  bulkActions?: (selected: TData[]) => React.ReactNode;
}
```

#### 3.1.10 `Skeleton`

```typescript
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;        // "100%" | "40px"
  height?: string | number;       // "1rem"
  lines?: number;                 // For variant="text", renders N lines
}

// Built-in patterns:
<Skeleton className="h-12 w-12 rounded-full" />  // avatar
<Skeleton variant="text" lines={3} />            // paragraph
<Skeleton variant="rectangular" className="h-40 w-full" />  // card body
```

#### 3.1.11 `ProgressBar`

```typescript
interface ProgressBarProps {
  value: number;                  // 0-100
  max?: number;                   // default 100
  label?: string;                 // Visible label / aria-label
  showValue?: boolean;            // Show percentage
  size?: 'sm' | 'md';            // 4px | 8px bar height
  variant?: 'neutral' | 'success' | 'warning';
}

// Used for: seat availability, credit consumption, etc.
```

### 3.2 apps/web/components — App-Specific Components

#### 3.2.1 Booking Components

```typescript
// apps/web/components/booking/BookingFlow.tsx
interface BookingFlowProps {
  sessionId: string;
  // The flow is step-based; nothing extra needed
}

type BookingStep = 'confirm' | 'credit-check' | 'success' | 'waitlisted';
interface BookingFlowState {
  step: BookingStep;
  enrollmentId?: string;        // if 'success'
  waitlistPosition?: number;    // if 'waitlisted'
  error?: string;
}
```

```typescript
// apps/web/components/booking/SeatCounter.tsx
// SSE-connected; updates live
interface SeatCounterProps {
  sessionId: string;
  capacity: number;              // initial value from SSR
  enrolled: number;             // initial value from SSR
  size?: 'sm' | 'md' | 'lg';
  showNumbers?: boolean;        // "2 spots left" vs progress bar only
  onFull?: () => void;          // Called when SSE reports isFull = true
}
```

```typescript
// apps/web/components/booking/WaitlistButton.tsx
interface WaitlistButtonProps {
  sessionId: string;
  isLoggedIn: boolean;
  currentPosition?: number;     // If member is already on waitlist
  onJoin?: () => void;
  onLeave?: () => void;
  // Renders different variants based on state
  // - Not logged in → "Sign in to join waitlist"
  // - Not on waitlist → "Join waitlist"
  // - On waitlist (position not 0) → "On waitlist (position #X)"
  // - Position offered → "Claim your spot" (highlighted)
}
```

```typescript
// apps/web/components/booking/BookingConfirmation.tsx
interface BookingConfirmationProps {
  variant: 'enrolled' | 'waitlisted';
  sessionId: string;
  classTitle: string;
  startsAt: string;
  instructorName: string;
  roomName?: string;
  isVirtual?: boolean;
  streamUrl?: string;
  waitlistPosition?: number;    // if variant='waitlisted'
}

// Shows succeed state with calendar add links + invite friend link
```

#### 3.2.2 Schedule Components

```typescript
// apps/web/components/schedule/ScheduleGrid.tsx
interface ScheduleGridProps {
  weekStart: string;             // ISO date (Monday)
  sessions: SessionViewModel[];  // From schedule.getWeek
  currentUserEnrollments?: Map<string, EnrollmentSummary>;
  currentUserWaitlists?: Map<string, number>;  // sessionId → position
  // Renders by weekday with sessions stacked
  // Default view: week
  // Mobile: day list view with horizontal nav
}
```

```typescript
// apps/web/components/schedule/ClassCard.tsx
interface ClassCardProps {
  session: SessionViewModel;
  userState?: 'not-enrolled' | 'enrolled' | 'waitlisted' | 'instructor';
  waitlistPosition?: number;
  // Layout: time column | class info | seat indicator | action button
  // Action button shape varies by userState
}
```

```typescript
// apps/Web/components/schedule/ScheduleFilters.tsx
interface ScheduleFiltersProps {
  defaultValues?: Partial<ScheduleFiltersValue>;
  onChange: (filters: ScheduleFiltersValue) => void;
  // Updates URL search params (nuqs) for shareable filtered views
}

interface ScheduleFiltersValue {
  classId?: string;
  instructorId?: string;
  level?: ClassLevel;
  styleId?: string;
}
```

#### 3.2.3 Dashboard Components

```typescript
// apps/web/components/dashboard/UpcomingBookings.tsx
interface UpcomingBookingsProps {
  limit?: number;                // default 5
  showEmptyState?: boolean;
}
// Uses bookings.getUpcoming

// apps/web/components/dashboard/MembershipSummary.tsx
interface MembershipSummaryProps {
  subscription: MemberSubscriptionSummary;
  // Shows plan name, status, next billing date, credits remaining
  // CTAs: Manage, Upgrade, Cancel
}

// apps/web/components/dashboard/RecentActivity.tsx
interface RecentActivityProps {
  limit?: number;                // default 10
}
```

#### 3.2.4 Marketing Components

```typescript
// apps/web/components/marketing/HeroBlock.tsx
interface HeroBlockProps {
  eyebrow?: string;              // Small text above headline
  headline: string;              // Display-large
  subheading?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  image?: { src: string; alt: string };  // next/image
  alignment?: 'left' | 'center'; // default left (editorial)
}

// apps/web/components/marketing/FeaturedClassCard.tsx
interface FeaturedClassCardProps {
  slug: string;
  title: string;
  description: string;
  level: ClassLevel;
  styleColor: string;
  href: string;
  // Asymmetric layout; no drop shadow
}

// apps/web/components/marketing/TestimonialCard.tsx
interface TestimonialCardProps {
  quote: string;
  memberName: string;
  className?: string;
  rating?: number;               // 1-5 stars
}

// apps/web/components/marketing/InstructorSpotlight.tsx
interface InstructorSpotlightProps {
  slug: string;
  name: string;
  specialties: string[];
  imageKey: string;
  href: string;
}
```

#### 3.2.5 Admin Components

```typescript
// apps/web/components/admin/SessionCalendar.tsx
interface SessionCalendarAdminProps {
  initialWeekStart: string;
  // Read-write calendar; click slot to create session
  // Drag to reschedule; click session to edit
}

// apps/web/components/admin/KPIDashboard.tsx
interface KPIDashboardProps {
  range: 'today' | 'week' | 'month' | 'custom';
  customRange?: { start: string; end: string };
}

// apps/web/components/admin/MembersTable.tsx
interface MembersTableProps {
  defaultSort?: 'name' | 'joinedAt' | 'lastVisit' | 'attendance';
  filter?: 'all' | 'active' | 'at-risk' | 'lapsed';
}

// apps/web/components/admin/ClassRosterView.tsx
interface ClassRosterViewProps {
  sessionId: string;
  // Member list with check-in buttons
  // Bulk check-in via "all present" button
}
```

### 3.3 packages/email/src/components — Email Components

```typescript
// packages/email/src/components/EmailLayout.tsx
interface EmailLayoutProps {
  previewText?: string;          // Shown in inbox preview (max 90 chars)
  children: React.ReactNode;
}

interface EmailButtonProps {
  href: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  // Renders as styled <a> with full email-safe inline styles
}

interface EmailFooterProps {
  unsubscribeUrl: string;
  studioName: string;
  studioAddress: string;
}
```

### 3.4 Custom Hooks (apps/web/lib/hooks/)

```typescript
// apps/web/lib/hooks/useSessionAvailability.ts
interface UseSessionAvailabilityOptions {
  sessionId: string;
  initialEnrolled: number;
  initialCapacity: number;
}
interface UseSessionAvailabilityResult {
  enrolled: number;
  available: number;
  isFull: boolean;
  isConnected: boolean;
  lastUpdatedAt: Date | null;
}
```

```typescript
// apps/web/lib/hooks/useDebounce.ts
function useDebounce<T>(value: T, delay?: number): T;

// apps/web/lib/hooks/useMediaQuery.ts
function useMediaQuery(query: string): boolean;
// Convenient pre-typed queries:
const useIsMobile = () => useMediaQuery('(max-width: 767px)');
const useIsTablet = () => useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');
const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');
```

```typescript
// apps/web/lib/hooks/useUrlFilters.ts
// Wraps nuqs to provide typed filter state from URL search params
function useUrlFilters<T extends Record<string, unknown>>(
  schema: T,
  defaults: Partial<T>
): [Partial<T>, (next: Partial<T>) => void];
```

---

## 4. Page Content Specifications

Every route from PAD §6.1 has its content, copy, and key UI elements specified here. All copy follows the "Editorial Calm" tone from PAD §11.1 — warm, precise, unhurried, never breathless.

### 4.1 Marketing Pages

#### 4.1.1 `/` — Home

```
Purpose:            Establish atmosphere; communicate what Stillwater is; primary CTA to schedule or pricing
Rendering:          ISR, 3600s (PAD §12)
Auth Required:      No
```

```
HERO BLOCK (above fold, left-aligned editorial split):
  Eyebrow:    "Yoga & Meditation in Southeast Portland"
  Headline:   "An unhurried practice, in a room that holds you."
  Subhead:    "We're a small studio offering drop-in classes, weekly memberships,
              and a workshop series for deepening. Come as you are."
  Primary CTA:    "See this week's schedule"     → /schedule
  Secondary CTA:  "View membership options"     → /pricing
  Image:          Portrait of instructor or studio space (asymmetric, right side, 60% width)

  [Editorial note: No "Welcome to" opener. No "Our Story" introduction.
   The headline reads like an opening line in a Kinfolk feature.]

SECTION 2 — THIS WEEK'S SCHEDULE (3 session cards, most-popular selection):
  Heading:    "This week, in the studio."
  Subhead:    "A glimpse of the coming days. The full calendar lives below."
  Cards:      3 upcoming sessions (most-booked first), each with time + instructor + 1 CTA
  CTA:        "See the full schedule"  → /schedule

SECTION 3 — INSTRUCTOR ROSTER (horizontal scroll-triggered grid):
  Heading:    "The teachers."
  Subhead:    "A small team. Years of practice. No celebrity instructors."
  Cards:      4-6 instructors, image + name + 1-line bio
  CTA:        "Meet the full roster"  → /instructors

SECTION 4 — MEMBERSHIP PHILOSOPHY (typography-heavy section):
  Heading:    "Membership, without urgency."
  Subhead:    Three pricing tiers (drop-in / 5-pack / monthly) shown as
               editorial pull-quotes, not as a 3-column card grid
  Body:       Brief explanation of credit system, no rollover, optional pause
  CTA:        "View all options"  → /pricing

SECTION 5 — TESTIMONIALS (1 large, magazine-style):
  Heading:    (none — just one large pull quote)
  Quote:      A single, specific member quote (not generic "love this place!")
  Attribution: "— Maya K., member since 2024"

SECTION 6 — FOOTER CTA:
  Heading:    "Come sit with us."
  Body:       Studio address + hours + 1 phone number
  CTA:        "Find us on the map"  → external Google Maps link
```

SEO requirements:
- `<title>`: "Stillwater Yoga — Mindful movement in Southeast Portland"
- `description`: "A small yoga studio in Southeast Portland offering drop-in classes, memberships, and a workshop series. Book online or visit the studio."
- JSON-LD: `YogaStudio` schema with address, hours, phone
- OG image: studio interior with overlaid "Stillwater" wordmark

#### 4.1.2 `/about` — About

```
Purpose:            Studio story; values; team narrative (Sanity-driven)
Rendering:          ISR, 86400s
Auth Required:      No

Content blocks (Sanity content; padded editorial layout):
  1. Eyebrow + heading:    "Stillwater."
  2. Opening prose:        ~200 words on why the studio exists
  3. Values section:       3 values, each with a short paragraph + pull-quote
  4. Founder story:        ~300 words, with optional portrait
  5. Space section:        Photo grid of the studio rooms (asymmetric)
  6. Closing line:         "We hope to see you."
```

#### 4.1.3 `/instructors` — Instructor Roster

```
Purpose:            Show all active instructors
Rendering:          ISR, 86400s
Auth Required:      No

Layout:
  - Page heading: "The people you'd be practicing with."
  - Filter chips: Specialties (multi-select)
  - Grid: 2 columns desktop, 1 mobile
    Each card: portrait (4:5 ratio), name, short bio (1-2 sentences), specialties as tags

Interactions:
  Hover card: name's hover underline reveals (color -> water-500)
  Click card: navigate to /instructors/[slug]
  Filter: live update via nuqs URL state
```

#### 4.1.4 `/instructors/[slug]` — Instructor Bio

```
Purpose:            Long-form bio + upcoming classes they teach
Rendering:          ISR, 86400s
Auth Required:      No

Content blocks:
  1. Portrait (full bleed, 50% width on desktop)
  2. Name (display-xl), title under (text-body-lg muted)
  3. Long bio (Sanity-driven, max 800 words)
  4. "Up-coming classes" section (uses schedule.getWeek filtered by instructor)
  5. "Specialties" section (badges)

SEO: Person schema (JSON-LD)
```

#### 4.1.5 `/schedule` — Schedule (Also accessible as guest)

```
Purpose:            Browse all upcoming sessions; primary entry to booking
Rendering:          ISR, 300s (PAD §12)
Auth Required:      No (members sign in inline via /auth/signin redirect)

Layout:
  - Week navigation: [Previous week] [This week] [Next week]
  - Date display: "Week of Mon, Jun 29 — Sun, Jul 5, 2026"
  - Filters bar (sticky on scroll):
      [Class style] [Level] [Instructor]
  - ScheduleGrid component (Section 3.2.2):
      - Desktop: 7-column grid, sessions stacked by time
      - Mobile: single-day view with day-nav at top
  - Each ClassCard shows:
      - Time (text-display-lg, serif)
      - Class title
      - Instructor name (linked to /instructors/[slug])
      - Level badge
      - Live seat indicator (if available)
      - Action button:
          - Member enrolled → "Booked" (disabled)
          - Member waitlisted → "On waitlist (position #X)" (with leave button)
          - Not logged in → "Sign in to book"
          - Logged in and not enrolled → "Book class"
          - Full → "Join waitlist"

Interactions:
  Click card: navigate to /sessions/[id] for full detail
  Click "Book class" on full session: directly join waitlist (with confirmation)
  SSE updates: SeatCounter and waitlist status update in real-time via SSE
```

#### 4.1.6 `/classes/[slug]` — Class Detail

```
Purpose:            Public marketing for a reusable class definition
Rendering:          ISR, 3600s
Auth Required:      No

Content blocks:
  1. Class title (display-2xl)
  2. Level badge + style name + duration
  3. Long description (markdown, from Sanity)
  4. "What to expect" (3 bullets)
  5. "Upcoming sessions" (uses schedule.getScheduleFilteredByClass)
  6. CTA: "See all classes" → /classes

SEO: Course schema (JSON-LD) + OG image with class title overlayed
```

#### 4.1.7 `/pricing` — Membership Plans

```
Purpose:            Show membership options; primary conversion point
Rendering:          ISR, 3600s
Auth Required:      No

Layout (deliberately NOT a 3-column card grid):
  - Heading: "Membership, made simple."
  - Subhead: "No initiation fees. No long contracts. Pause anytime."
  - 3 plan tiers shown as editorial sections, not cards:
      Tier 1: "Drop-in" — single class pricing
      Tier 2: "Class packs" — 5/10/20-class bundles
      Tier 3: "Monthly membership" — recurring with credits
  - Each tier shows:
      - Plan name (display-lg)
      - Price (display-xl, serif)
      - What's included (4-5 line items)
      - 1 CTA: "Get started"
  - FAQ section below (Sanity-driven)
  - Final CTA strip: "Questions? Email us at hello@stillwater.studio"
```

#### 4.1.8 `/blog` — Blog Index

```
Purpose:            List published posts (Sanity-driven)
Rendering:          ISG + ODR
Auth Required:      No

Layout:
  - Heading: "Notes from the studio."
  - Featured post (1 large hero image + title + excerpt)
  - Recent posts (chronological list, 1 per row on desktop)
  - Pagination

Interactions:
  Click post: navigate to /blog/[slug]
```

#### 4.1.9 `/blog/[slug]` — Blog Post

```
Purpose:            Single article
Rendering:          SSG + ODR
Auth Required:      No

Layout:
  - Author + publish date (small, muted)
  - Featured image (full width)
  - Portable Text body (Sanity)
  - "Related posts" footer (3 posts)

SEO: Article schema (JSON-LD) + dynamic OG image
```

### 4.2 Auth Pages

#### 4.2.1 `/auth/signin` — Sign In

```
Purpose:            Email or Google sign-in
Rendering:          SSR
Auth Required:      No

Layout:
  - Centered card (max-w-md)
  - Heading: "Welcome back."
  - Subhead: "Sign in to manage your classes."
  - Two buttons stacked:
      [Continue with Google]   (full width, outline style)
      [Continue with email]    (full width, primary style — expands to magic link flow)
  - Footer: "Don't have an account? Sign up" → /auth/signup

Magic link sub-flow:
  - Input: email
  - On submit: Show "Check your inbox" state with email sent indicator
  - Auto-redirect to dashboard when session cookie set (poll every 1s)
```

#### 4.2.2 `/auth/signup` — Sign Up

Same as signin with heading "Create your account." and footer link to /auth/signin

### 4.3 Member Pages (Auth-gated)

#### 4.3.1 `/dashboard` — Member Home

```
Purpose:            At-a-glance view of upcoming + membership
Rendering:          SSR (PAD §12)
Auth Required:      Yes (any role)

Layout:
  - Greeting (time-of-day aware): "Good morning, {displayName}."
  - "Your next class" card (large, primary)
      If upcoming booking exists within 24h, show prominent CTA
  - UpcomingBookings list (component, Section 3.2.3)
  - MembershipSummary card (component)
      If no active subscription, show "Try a class for $X" CTA → /pricing
  - "This week" section with quick schedule access
  - Empty states:
      No upcoming bookings: "Nothing booked yet. Browse the schedule."
      No membership: "No active membership. Become a member."
```

#### 4.3.2 `/book/[sessionId]` — Booking Flow

```
Purpose:            Confirm and book a class session
Rendering:          CSR (SSE) + SSR initial
Auth Required:      Yes (member+)

Layout (multi-step, but condensed to single page):
  - Sticky session summary header:
      - Class title, instructor, time, room, level, badge
      - SeatCounter component (live, SSE)
  - Member credit display:
      - Shows: "Credits remaining this cycle: 4"
      - Or: "No credits remaining. [Buy a class pack] [Become a member]"
  - Confirmation panel:
      - Note field (optional, max 500 chars)
      - Cancellation policy reminder: "Cancel up to 12h before for a credit refund."
      - Two buttons: [Cancel] [Confirm booking]
  - Success state:
      - BookingConfirmation component (Section 3.2.1)
      - Replaces bottom panel with CTA: "Add to calendar" "View my bookings"
  - Waitlisted state:
      - Calm, non-alarming copy: "This class is full."
      - WaitlistButton component renders as "On waitlist (position #X)"

Edge cases:
  Session cancelled: Show calm message + link to similar upcoming classes
  Session in past: Auto-redirect to /sessions/[id] (read-only)
  No active membership: Show membership required message with /pricing link
  Session requires different level (admin override): Allow with warning
```

#### 4.3.3 `/my-classes` — Booking History

```
Purpose:            All bookings (upcoming + past, tabbed)
Rendering:          SSR
Auth Required:      Yes

Layout:
  - Heading: "Your classes."
  - Tabs: [Upcoming] [Waitlist] [Past] [No-shows]
  - For each booking card:
      - Class + time + instructor
      - Status badge
      - Actions: [Cancel] [View session] [Get directions]
  - Empty states per tab
```

#### 4.3.4 `/membership` — Membership Management

```
Purpose:            View current plan; action: change/cancel/pause
Rendering:          SSR
Auth Required:      Yes

Layout:
  - Heading: "Your membership."
  - Current plan card (shows status, next billing date, credits remaining)
  - Quick actions (3 buttons):
      [Manage billing]  → Stripe customer portal
      [Change plan]     → /pricing
      [Pause membership] → confirmation dialog
  - Recent charges list (5 most recent invoices)
  - If no subscription: Show "Become a member" CTA → /pricing

Pause flow:
  - Dialog: "Pause for how long?"
  - Date picker (today + 7 to 90 days)
  - Confirmation: "Your membership will pause on {date} and resume on {date}. You won't be charged during this time."

Cancel flow:
  - Two-step confirmation
  - Step 1: Warning with calendar of upcoming bookings
  - Step 2: Final confirm; show "Active until {nextBillingDate}"
```

#### 4.3.5 `/profile` — Profile

```
Purpose:            Edit personal info
Rendering:          SSR
Auth Required:      Yes

Layout:
  - Heading: "Your profile."
  - Form with fields: displayName, phone, dateOfBirth, emergencyContact, emergencyPhone, notes
  - Save button (bottom right, sticky)
  - Avatar upload (managed separately, via modal)
  - Section: Connected accounts (Google, email)
  - Section: Notifications (email opt-ins for reminders, weekly digest)
```

#### 4.3.6 `/waitlist` — My Waitlists

```
Purpose:            All current waitlist entries
Rendering:          SSR
Auth Required:      Yes

Layout:
  - Heading: "Your waitlists."
  - Subhead: "We'll email you when a spot opens."
  - List of current waitlist entries:
      - Class + time + instructor
      - Position badge (large, prominent when offered)
      - Action: [Leave waitlist] or [Claim spot] (when offered)
  - Empty state: "No waitlists. Browse the schedule."
```

### 4.4 Admin Pages (Staff/Owner)

#### 4.4.1 `/admin` — Admin Dashboard

```
Purpose:            Operational overview for the studio
Rendering:          SSR
Auth Required:      Yes (staff+)

Layout:
  - Heading: "Studio overview."
  - KPI strip (4 cards):
      - Today's bookings (count + % vs last week)
      - Waitlist activity (count + trend)
      - Active members (#)
      - At-risk members (declining attendance)
  - TodaySchedule: vertical timeline of today's sessions with check-in CTAs
  - Recent activity feed (last 10 admin actions + system events)
  - Anomalies panel (auto-flagged: payment failures, etc.)
```

See §9 for full dashboard spec.

#### 4.4.2 `/admin/classes` — Class Catalog Management

```
Purpose:            CRUD over Class entities
Rendering:          SSR
Auth Required:      Yes (staff+)

Layout:
  - Heading: "Class catalog."
  - Search bar
  - DataTable (Section 3.1.9) with columns:
      Class title, Style, Level, Duration, Default capacity, Active, Actions
  - Row action menu: Edit, Archive, Duplicate
  - Top right: [+ New class] button → /admin/classes/[id]/edit

Class editor (slides in as Sheet):
  Form fields:
    - title (required)
    - slug (auto-generated from title; editable)
    - style (select)
    - level (select)
    - durationMinutes (number, 15-240)
    - maxCapacity (number, 1-100)
    - description (markdown editor, Sanity-synced for public page)
    - imageKey (R2 uploader)
    - isActive (toggle)
```

#### 4.4.3 `/admin/schedule` — Session Scheduling Calendar

```
Purpose:            Manage class sessions (create, edit, cancel)
Rendering:          SSR
Auth Required:      Yes (staff+)

Layout:
  - Heading: "Schedule."
  - View toggle: [Week] [Month] [List]
  - Filter: by class, instructor, room
  - SessionCalendar component:
      - Week view (7 columns)
      - Each session as a card (drag to reschedule; click to edit)
      - Time-based vertical layout
  - Action bar: [+ New session] [Clone this week] [Print]

Session editor (modal):
  - Fields: class, instructor, room, start time, duration, override capacity, virtual toggle, stream URL
  - Recurring toggle → "Create weekly sessions until X date"

Cancel session flow:
  - Confirm dialog: warning + reason selection
  - Side effect: all enrollees notified (email via class-cancellation-notify job)
```

#### 4.4.4 `/admin/instructors` — Instructor Management

```
Purpose:            CRUD over Instructor records
Rendering:          SSR
Auth Required:      Yes (staff+)

Layout:
  - Heading: "Instructors."
  - DataTable: name, specialties, active sessions, status, actions
  - [+ Add instructor] → form

Instructor editor:
  - userId (search existing users or create new)
  - displayName, slug, bio markdown, specialties (multi-select tokens), image
  - isActive toggle
```

#### 4.4.5 `/admin/members` — Member Management

```
Purpose:            View/manage all members
Rendering:          SSR
Auth Required:      Yes (staff+)

Layout:
  - Heading: "Members."
  - Filter tabs: [All] [Active] [At-risk] [Lapsed] [New (30 days)]
  - Search by name/email
  - DataTable columns:
      Name, Email, Joined, Membership status, Last visit, Attendance rate, Actions
  - Row action: View detail → /admin/members/[id]

Member detail:
  - Profile info
  - Active subscription
  - Bookings history (tabular)
  - Attendance stats
  - Role assignments
  - Admin actions: Send email, Assign role, Cancel booking (with reason), View invoices
```

#### 4.4.6 `/admin/revenue` — Revenue Reports

```
Purpose:            Revenue KPIs and breakdowns (manager+)
Rendering:          SSR
Auth Required:      Yes (manager+)

Layout:
  - Date range picker (default "last 30 days")
  - KPI strip: MRR, ARR, Churn rate (30-day)
  - Revenue chart (line, daily/weekly/monthly toggle)
  - Breakdown table (by plan)
  - Export CSV button

Charts use Recharts or similar (no client-side libs beyond what's lightweight).
See §9 for full spec.
```

#### 4.4.7 `/admin/settings` — Studio Settings

```
Purpose:            Studio-wide configuration (owner only)
Rendering:          SSR
Auth Required:      Yes (owner)

Sections:
  - Studio profile: name, address, hours, contact
  - Booking rules: cancellation window (hours), waitlist offer window (hours), max bookings per member per week
  - Notifications: toggleable weeks-day digest, etc.
  - Integrations: Stripe connect status, Sanity project info, Resend domain verified
  - Roles & permissions: assign/revoke roles for staff
```

### 4.5 System Pages

#### 4.5.1 `/not-found` — 404

```
Heading:    "This page is unhurried."
Body:       "Which is to say: it doesn't exist."
CTA:        "Return home" → /
```

#### 4.5.2 `/error` — Generic Error

```
Heading:    "Something paused."
Body:       "We've been notified and are looking into it."
Actions:    [Try again] [Go to dashboard]
```

---
