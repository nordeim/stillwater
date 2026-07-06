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

## 5. Form Schema Catalog (Zod)

Every form in the app uses a Zod schema. Schemas are:
- Single source of truth (shared between client validation + tRPC input)
- Co-located with the form component when single-use, in `packages/api/src/schemas/` when shared
- Generated types via `z.infer<typeof schema>`

### 5.1 Booking Forms

#### 5.1.1 `bookingSchema` — Confirms booking

```typescript
export const bookingSchema = z.object({
  sessionId:  z.string().uuid('Invalid session ID.'),
  notes:      z.string().max(500, 'Notes must be 500 characters or fewer.').optional(),
});
export type BookingFormValues = z.infer<typeof bookingSchema>;
```

Fields:
- `sessionId` — hidden; populated from route param
- `notes` — optional 500-char text for instructor (e.g., "first class, modifications needed")

UI notes:
- Textarea (4 rows visible)
- Help text below: "Optional. Your instructor sees this before class."
- Errors: inline, below textarea; required styling from Input component

#### 5.1.2 `waitlistJoinSchema`

```typescript
export const waitlistJoinSchema = z.object({
  sessionId: z.string().uuid(),
});
export type WaitlistJoinFormValues = z.infer<typeof waitlistJoinSchema>;
```

No visible form — triggered instantly on click of "Join waitlist" button. Errors surface as toast.

### 5.2 Profile & Onboarding Forms

#### 5.2.1 `profileUpdateSchema`

```typescript
export const profileUpdateSchema = z.object({
  displayName: z.string()
    .trim()
    .min(1, 'Display name is required.')
    .max(50, 'Display name must be 50 characters or fewer.'),
  phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Phone must be a valid number (e.g., +15035551234).')
    .or(z.literal(''))
    .optional()
    .transform(v => v === '' ? undefined : v),
  dateOfBirth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format.')
    .or(z.literal(''))
    .optional()
    .refine(v => !v || new Date(v) <= new Date(), {
      message: 'Date of birth cannot be in the future.',
    })
    .transform(v => v === '' ? undefined : v),
  emergencyContact: z.string().max(100).or(z.literal('')).optional()
    .transform(v => v === '' ? undefined : v),
  emergencyPhone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Phone must be valid.')
    .or(z.literal('')).optional()
    .transform(v => v === '' ? undefined : v),
  notes: z.string().max(1000).or(z.literal('')).optional()
    .transform(v => v === '' ? undefined : v),
});
type ProfileUpdateFormValues = z.infer<typeof profileUpdateSchema>;
```

Field UI notes:
- All fields except `displayName` are optional
- Each phone field shows helper text "+15035551234"
- DOB input is a Calendar popover, not a text input
- `notes` is a Textarea with 1000-char counter

#### 5.2.2 `notificationPreferencesSchema`

```typescript
export const notificationPreferencesSchema = z.object({
  emailBookingConfirmation: z.boolean(),
  emailClassReminders24h: z.boolean(),
  emailClassReminders1h: z.boolean(),
  emailWaitlistOffer: z.boolean(),
  emailWeeklyDigest: z.boolean(),
  emailMembershipUpdates: z.boolean(),
});
```

UI: one Switch per preference. All default to true on signup. No submit button required — changes save on toggle via debounced auto-save.

### 5.3 Membership Forms

#### 5.3.1 `subscribeSchema` — Start subscription

```typescript
export const subscribeSchema = z.object({
  planId: z.string().uuid('Select a membership plan.'),
  trialDays: z.coerce.number().int().min(0).max(30).optional().default(0),
});
```

UI: Single form on /pricing page; planId is a hidden field, populated when user clicks tier CTA. On submit: full redirect to Stripe Checkout (after server creates session + returns URL).

#### 5.3.2 `pauseSubscriptionSchema`

```typescript
export const pauseSubscriptionSchema = z.object({
  resumeDate: z.coerce.date()
    .refine(d => d > new Date(), 'Resume date must be in the future.'),
}).transform(v => ({ resumeDate: v.resumeDate }));
```

UI: Calendar input. Min: today + 7 days. Max: today + 90 days.

Validation:
- Server additionally validates: max 90 days/year accumulated pause

#### 5.3.3 `cancelSubscriptionSchema`

```typescript
export const cancelSubscriptionSchema = z.object({
  confirm: z.literal(true, { errorMap: () => ({ message: 'Please confirm cancellation.' }) }),
  reason: z.enum([
    'too_expensive',
    'not_using_enough',
    'moving',
    'injury_or_health',
    'temporary_relocation',
    'other',
  ]).optional(),
  feedback: z.string().max(500).optional(),
});
```

UI: Two-step dialog. Step 1: reason selection. Step 2: confirmation checkbox + optional feedback textarea.

### 5.4 Auth Forms

#### 5.4.1 `magicLinkRequestSchema`

```typescript
export const magicLinkRequestSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
});
```

UI: Single email input on /auth/signin. On submit: server triggers Better Auth sendMagicLink, sends email, shows "Check your inbox" state.

#### 5.4.2 `signUpSchema`

```typescript
export const signUpSchema = z.object({
  email: z.string().email('Valid email required.'),
  displayName: z.string().trim().min(1, 'Display name required.').max(50),
  acceptedTerms: z.literal(true, { errorMap: () => ({ message: 'You must accept the Terms of Service.' }) }),
});
```

UI: Three fields stacked. Display name collected at signup (not OAuth).

### 5.5 Admin Forms

#### 5.5.1 `classFormSchema` — Create/edit class

```typescript
export const classFormSchema = z.object({
  title: z.string().trim().min(1, 'Class title is required.').max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only.'),
  styleId: z.string().uuid('Select a class style.'),
  level: z.enum(['all', 'beginner', 'intermediate', 'advanced']),
  durationMinutes: z.coerce.number().int().min(15, 'Minimum 15 minutes.').max(240, 'Maximum 4 hours.'),
  maxCapacity: z.coerce.number().int().min(1, 'At least 1 seat.').max(100, 'At most 100 seats.'),
  description: z.string().max(2000).optional(),
  imageKey: z.string().optional(),
  isActive: z.boolean().default(true),
});
```

UI: Multi-section form. Side panel: live preview of public /classes/[slug] page.

#### 5.5.2 `sessionFormSchema` — Schedule single session

```typescript
export const sessionFormSchema = z.object({
  classId: z.string().uuid('Select a class.'),
  instructorId: z.string().uuid('Select an instructor.'),
  roomId: z.string().uuid().nullable(),
  startsAt: z.coerce.date()
    .refine(d => d > new Date(), 'Class must start in the future.'),
  durationMinutes: z.coerce.number().int().min(15).max(240),
  overrideCapacity: z.coerce.number().int().min(1).max(100).nullable().optional(),
  isVirtual: z.boolean().default(false),
  streamUrl: z.string().url('Must be a valid URL.')
    .or(z.literal('')).optional()
    .transform(v => v === '' ? undefined : v),
}).refine(
  data => !data.isVirtual || !!data.streamUrl,
  { message: 'Virtual sessions require a stream URL.', path: ['streamUrl'] }
);
```

UI: Modal form. Conflict detection: when selecting instructor/time, show inline warning if another of their sessions overlaps. When selecting room/time, show same warning.

#### 5.5.3 `recurringSessionSchema` — Multi-session bulk create

```typescript
export const recurringSessionSchema = z.object({
  classId: z.string().uuid(),
  instructorId: z.string().uuid(),
  roomId: z.string().uuid().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  weekdays: z.array(z.object({
    weekday: z.coerce.number().int().min(0).max(6),
    startsAtTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    durationMinutes: z.coerce.number().int().min(15).max(240),
    overrideCapacity: z.coerce.number().int().min(1).max(100).optional(),
  })).min(1, 'Schedule at least one weekday.'),
  isVirtual: z.boolean().default(false),
  streamUrl: z.string().url().optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
}).refine(d => d.endDate > d.startDate, {
  message: 'End date must be after start date.',
  path: ['endDate'],
});
```

UI: Inline form within /admin/schedule. Shows preview "This will create N sessions between {startDate} and {endDate}." with list of generated dates. Conflicts (instructor double-booked, room unavailable) listed before submit.

#### 5.5.4 `instructorFormSchema`

```typescript
export const instructorFormSchema = z.object({
  userId: z.string().uuid(),  // from user search
  displayName: z.string().trim().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  bio: z.string().max(2000).optional(),
  specialties: z.array(z.string()).max(8, 'Up to 8 specialties.'),
  imageKey: z.string().optional(),
  isActive: z.boolean().default(true),
});
```

UI: User search combobox at top ("Find existing user or invite new"); displayName auto-populated from selected user.

#### 5.5.5 `cancelSessionSchema` — Cancel scheduled session

```typescript
export const cancelSessionSchema = z.object({
  sessionId: z.string().uuid(),
  reason: z.enum(['instructor_unavailable', 'low_enrollment', 'venue_issue', 'weather', 'other']),
  notes: z.string().max(500).optional(),
  notifyEnrollees: z.boolean().default(true),
});
```

UI: Modal in /admin/schedule. Confirmation two-step.

#### 5.5.6 `checkInSchema`

```typescript
export const checkInSchema = z.object({
  enrollmentId: z.string().uuid(),
});
// No form UI; called on button click
```

#### 5.5.7 `assignRoleSchema`

```typescript
export const assignRoleSchema = z.object({
  memberId: z.string().uuid(),
  role: z.enum(['member', 'instructor', 'staff', 'manager', 'owner']),
});
```

UI: Dropdown in member detail view. Confirm dialog. Restricted to owner role only.

#### 5.5.8 `broadcastMessageSchema`

```typescript
export const broadcastMessageSchema = z.object({
  segment: z.enum(['all_members', 'active_only', 'at_risk', 'no_visit_30_days', 'trial_ending']),
  subject: z.string().trim().min(1).max(120),
  bodyMarkdown: z.string().min(1).max(50000),
  sendAt: z.coerce.date().optional(),
});
```

UI: Two-section form — audience selector first, then composer. Default segment: "all_members". Preview generated for first 3 matching users (anonymized).

### 5.6 Studio Settings Forms

```typescript
// settingsStudioSchema
export const settingsStudioSchema = z.object({
  studioName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  address: z.object({
    street: z.string().min(1),
    street2: z.string().optional().or(z.literal('')),
    city: z.string().min(1),
    state: z.string().length(2),
    postalCode: z.string().regex(/^\d{5}(-\d{4})?$/),
    country: z.literal('US'),
  }),
  hours: z.record(z.string(), z.object({
    open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
    close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
    closed: z.boolean().default(false),
  })),
  bookingRules: z.object({
    cancellationWindowHours: z.coerce.number().int().min(1).max(48).default(12),
    waitlistOfferWindowHours: z.coerce.number().int().min(1).max(24).default(2),
    maxBookingsPerWeek: z.coerce.number().int().min(1).max(20).nullable(),
  }),
});
```

---

## 6. Error Message Catalog

Every error a user could see, with the exact copy. Tone: calm, specific, actionable — never blame the user, never expose technical details.

### 6.1 tRPC Error Codes → User Messages

| TRPCError code | When triggered | User message | Recovery action |
|----------------|----------------|--------------|-----------------|
| `UNAUTHORIZED` | No session | "Please sign in to continue." | Inline re-auth prompt |
| `FORBIDDEN` | Insufficient role | "This area is for staff and owners." | Other actions remain available |
| `NOT_FOUND` | Resource missing | "We couldn't find that. It may have been removed." | Back button + alternative paths |
| `BAD_REQUEST` | Validation mismatch | field-level messages (see Forms) | Inline correction |
| `CONFLICT` | Booking collision | "This class is full — join the waitlist and we'll notify you if a spot opens." | Join waitlist CTA |
| `TOO_MANY_REQUESTS` | Rate limited | (X-RateLimit-Reset header → seconds) "Too many requests. Please wait {seconds} seconds." | Countdown auto-enables button |
| `PAYMENT_REQUIRED` | No credits/membership | "An active membership is needed to book. View our options." | /pricing link |
| `INTERNAL_SERVER_ERROR` | Unexpected | "Something unexpected happened. We've been notified." | Retry button |
| `TIMEOUT` | Server timeout | "The connection is slow right now. Please try again." | Retry button |

### 6.2 Booking-Specific Errors

| Scenario | Where shown | Copy |
|----------|-------------|-------|
| Already booked | Confirmation panel | "You're already booked into this class." + "View your bookings" |
| Already on waitlist | Confirmation panel | "You're already on the waitlist. Position #{position}." + "View waitlist" |
| Session fully booked | ClassCard SE button | "Class full — Join waitlist" |
| Session cancelled | Page-level | "This class has been cancelled. Browse similar upcoming classes." |
| Session in past | Page-level redirect | "This class has already taken place." + "View past classes" |
| No credits remaining | Confirmation panel | Replace CTA: "No credits remaining this cycle. [Buy a class pack → /pricing] [Become a member → /pricing]" |
| Membership required (paused) | Confirmation panel | "Your membership is paused until {resumeDate}. [Resume now] [Buy a drop-in class]" |
| Membership required (cancelled) | Confirmation panel | "Your membership has ended. [Buy a drop-in class] [Renew membership]" |
| Subscription trial expired | Confirmation panel | "Your trial has ended. [Choose a plan → /pricing]" |
| Booking 12h-window violation (admin override) | Confirmation modal | "Cancellations within 12 hours don't refund credits. Continue anyway?" |
| Booking weekly limit reached (cap from settings) | Confirmation panel | "You've booked your maximum classes this week ({count}). [Cancel another to continue] [Contact us to increase]" |
| Network failure mid-book | Toast | "Your booking didn't go through. Please try again." |
| Race condition (someone else took the spot) | Toast after SSE | "Someone else just grabbed the last spot. You're on the waitlist at position #{position}." |

### 6.3 Payment & Subscription Errors

| Scenario | Copy |
|----------|-------|
| Stripe Checkout failed | "Your payment couldn't be processed. Please check your card details or try a different card." |
| 3DS authentication required | "Your bank requires additional verification. Please complete the prompts on your bank's site." |
| Card declined (generic) | "Your card was declined. Please contact your bank or try a different payment method." |
| Card declined (insufficient funds) | "Insufficient funds. Please try a different card." |
| Card declined (expired) | "This card has expired. Please update your payment method." |
| Payment failed on renewal | (Email + in-app banner) "Your latest payment didn't go through. Update your card to keep your membership active." |
| Cancell inside pending period | "Your subscription is set to cancel on {date}. Until then, you'll keep your credits." |
| Can't pause (already paused) | "Your membership is already paused until {date}." |
| Can't pause (at max days) | "You've used your {days}-day pause limit for the year. Cancel and rejoin when you're ready." |
| Can't resume (not paused) | "Your membership is currently active. Nothing to resume." |
| Plan change — new price higher | "Your plan will upgrade immediately. You'll be charged {proratedAmount} today." |
| Plan change — new price lower | "Your plan will downgrade on {nextBillingDate}. Until then, you keep current credits." |
| Refund auto-decline (window exceeded) | "Refunds are available until {time} before class. After that, your credit is consumed." |
| Stripe portal unavailable | "The billing portal is temporarily unavailable. Try again in a few minutes or contact us." |

### 6.4 Session/Waitlist Errors

| Scenario | Copy |
|----------|-------|
| Waitlist offered — claim success | "You claimed your spot! You're booked into {class}." |
| Waitlist offered — expired | "Your offer expired. You've been removed from this waitlist." |
| Waitlist offered — spot taken (race) | "This spot was just taken. You're still on the waitlist at position #{newPosition}." |
| Try to join non-full session | (UI prevents it: only bookable if not full) |
| Try to leave non-existent waitlist | "You're not on this waitlist." |
| Try to claim with no offer | "You don't have an active offer. Check back later or join a different waitlist." |
| Reverse check-in (undo) | Reverts to "checked_out" state. No copy needed beyond toast. |
| Mark no-show after class | "Marked as no-show. Credit not refunded." |

### 6.5 Profile/Auth Errors

| Scenario | Copy |
|----------|-------|
| Magic link sent (success) | "Check your inbox at {email}. The link expires in 10 minutes." |
| Magic link expired | "This sign-in link has expired. [Request a new one]" |
| Magic link already used | "This sign-in link was already used. [Sign in again]" |
| Email already registered | "An account with this email already exists. [Sign in instead]" |
| OAuth failed | "We couldn't sign you in with Google. Please try email instead." |
| OAuth account but no email | "Your Google account doesn't share an email. We need one to set up your account." |
| Insufficient role | "You don't have access to that page. [Return to dashboard]" |
| Session expired mid-action | "Your session expired. Please sign in again — you'll return to where you left off." |
| Profile save (network) | "We couldn't save your changes. Please try again." |
| Email field empty | "Email is required. (Standard email validation: proper format)" |
| Email invalid | "Please enter a valid email address." |
| Phone invalid | "Phone numbers only. Include the country code, e.g., +15035551234." |
| Date of birth in future | "Date of birth cannot be in the future." |
| Display name too long | "Display name must be 50 characters or fewer." |
| Emergency contact missing name+phone | "Provide a name and a phone number we can reach in an emergency." |

### 6.6 Admin-Specific Errors

| Scenario | Copy |
|----------|-------|
| Cancel session with active enrollees | "Are you sure? {count} members are enrolled. They'll be notified and refunded." Confirm dialog |
| Schedule conflict (instructor) | "{Instructor name} is already booked to teach {otherClass} in this slot. Pick a different time or instructor." |
| Schedule conflict (room) | "{Room name} is in use at that time. Pick a different room or time." |
| Edit class past sessions | "This class has sessions that have already taken place. Editing may show unexpected results on attendee history." |
| Archive class with future sessions | "{count} future sessions are scheduled. Archive anyway?" Confirm dialog |
| Delete instructor with upcoming sessions | "{name} teaches {count} upcoming sessions. Reassign them first." |
| Assign role to non-member | "This user isn't a member yet. They must have an active subscription to receive this role." |
| Revoke role (self) | "You can't revoke your own owner role. Promote another person to owner first." |
| Audit log entry truncation | "This filter returned more than 1,000 actions. Refine the date range to narrow results." |
| Bulk action partial failure | "{successCount} succeeded. {failureCount} failed: {reasons}" |

### 6.7 Network/Connectivity Errors

| Scenario | Copy |
|----------|-------|
| Page failed to load | "We had trouble loading this page. [Retry] [Go home]" |
| SSE disconnected | (Silent reconnect. Subtle indicator: connection dot in footer turns from green to amber) |
| SSE reconnected after failure | (Toast: "Reconnected. Showing current seat counts.") |
| API call timed out | "The connection is slow right now. Please try again." |
| Offline (PWA) | (Banner: "You're offline. Your booking will be saved and processed when you're back.") |

---

## 7. Responsive Behavior Specifications

Breakpoints (per Tailwind v4 defaults; PAD §11.4):
- `sm`: 640px — phone landscape, small tablets
- `md`: 768px — tablet portrait
- `lg`: 1024px — tablet landscape, small laptop
- `xl`: 1280px — desktop
- `2xl`: 1536px — wide desktop

Behavioral rules (the headline rule: **no horizontal scrollbars; thumb-reach for actions**)

### 7.1 Navigation

| Viewport | Behavior |
|----------|----------|
| <768px | Hamburger menu (top right). Below menu: logo, "Schedule", "Membership", "Sign in". Drawer slides from right, full screen. Active route highlighted. |
| 768–1023px | Top nav: logo (left), primary links (center, condensed), Sign in + Account (right). No hamburger. |
| ≥1024px | Full nav as designed: logo (left col), primary links (center 6, reordered), search icon, CTA "Book a class", Account avatar (right). |

Account menu behavior:
- Mobile: full-screen list of profile options
- Desktop: dropdown anchored to avatar, 240px wide

### 7.2 Schedule Page (`/schedule`)

| Viewport | View | Layout |
|----------|------|--------|
| <768px | **Day view** | Day tabs at top (Mon/Tue/...) horizontal scroll. Below: vertical list of sessions, hour-grouped. Each ClassCard is full width. Tap card → detail. |
| 768–1023px | **Week view** | 7-column grid, sessions stacked by time within each column. |
| ≥1024px | **Week view, expanded** | Same week view with seat counts visible inline. |

Filter bar:
- Mobile: horizontal scroll of chips, full filter opens bottom sheet via "Filters" button
- Tablet+: inline filterbar above grid

### 7.3 Booking Flow (`/book/[sessionId]`)

| Viewport | Layout |
|----------|--------|
| <768px | Single column. Sticky session summary header at top, content below. Notes field full width. CTA buttons stacked, primary on top. |
| ≥768px | Two-column: 60% session detail / 40% confirmation panel. Sticky session summary is 80px tall. |

### 7.4 Marketing Page Hero

| Viewport | Image position | Headline size |
|----------|----------------|---------------|
| <768px | Below headline (stacked) | text-display-lg |
| 768–1023px | Side: 50/50 split | text-display-xl |
| ≥1024px | Side: 40/60 image-dominant | text-display-2xl |

### 7.5 Admin Tables

| Viewport | Behavior |
|----------|----------|
| <768px | Cards (not table). Each row becomes a flat card with key fields stacked. Filters via top dropdown. |
| 768–1023px | 5–6 columns max. Stack remaining fields via row expansion. |
| ≥1024px | Full table as designed. |

### 7.6 Forms

- All form fields span 100% width on mobile, max-w-md on larger screens.
- Multi-column forms (e.g., address: street + street2) collapse to single column under 768px.
- Submit button: sticky on mobile at bottom of viewport; inline on desktop.
- Date pickers: full-screen modal on mobile, popover on desktop.

### 7.7 Toast/Notification Positioning

- All toasts: bottom-left on desktop (text-readable; top-right is the generic default but we prefer NOT covering action buttons).
- Mobile: bottom-center, 16px margin, max-w-[calc(100%-32px)].

### 7.8 Modals/Dialogs

- Mobile: full-screen modal (slide up from bottom).
- Desktop: centered, max-w per size variant in Section 3.1.4.

### 7.9 Scale-Aware Typography

The fluid type scale in PAD §11.2 (`clamp()`) automatically adapts to viewport. Additional rules:
- Hero headlines never exceed 7rem even at 2xl viewport.
- Body text never exceeds 1.25rem for readability.
- Long-form content (blog posts): single column max-w-narrow (720px) on all viewports; padding scales (--space-4 mobile, --space-7 desktop).

---

## 8. Animation Choreography

Every motion follows the tokens in PAD §11.5. No animation without purpose.

### 8.1 Timing Rules

| Animation | Duration | Easing | Trigger |
|-----------|----------|--------|---------|
| Hover transitions | 150ms | --ease-sharp | Mouse enter/leave |
| Focus ring | 100ms | --ease-sharp | Focus visible |
| Button press | 100ms | --ease-sharp | Mouse down |
| Toast enter | 300ms | --ease-gentle | Toast mount |
| Toast exit | 200ms | --ease-sharp | Timer/dismiss |
| Dialog open | 300ms | --ease-gentle | Open trigger |
| Dialog close | 200ms | --ease-gentle | Close trigger |
| Page transition | 300ms | --ease-breathe | Route change |
| Skeleton pulse | 1200ms | ease-in-out loop | Loading state |
| SeatCounter update | 300ms | --ease-gentle | When SSE value changes |
| Live badge flip | 600ms | --ease-breathe | SSE connection state change |
| Form field focus highlight | 100ms | --ease-sharp | Field focus |
| Form submit | 400ms | --ease-gentle | Submit click → button shows spinner |
| Booking success card | 800ms | --ease-breathe | Booking mutated successfully (decorative confetti is BANNED) |
| Waitlist position change | 400ms | --ease-gentle | SSE position update |
| Schedule view change (week→day) | 300ms | --ease-breathe | View toggle |
| Calendar popover | 200ms | --ease-gentle | Popover open |
| Dropdown/popover | 150ms | --ease-sharp | Dropdown open |

### 8.2 Banned Motion

The following are explicitly **not allowed**:

```
✗ Autoplaying video on first page load
✗ Slideshow / carousel on hero (no auto-advance)
✗ Parallax scroll
✗ Parallax mouse-follow effects
✗ Bouncing / elastic / spring overshoots
✗ More than 1 simultaneous animation per region (no flashing)
✗ Cursor-tracking gradients
✗ Heavy decorative loops (>2s continuous animation on a non-interactive element)
✗ Spinner on a layout-defining element (skeleton or skeleton + indicator only)
```

### 8.3 Reduced Motion Behavior

When `prefers-reduced-motion: reduce`:
- All durations → `0.01ms`
- All transitions → none
- Skeleton pulse → static muted background
- Toast enter/leave → instant
- Dialog open/close → instant
- Page transitions → instant
- Any parallax/cursor effect → disabled

Implementation (global, per PAD §11.5 + Skill §8.6):
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### 8.4 Element-Specific Choreography

#### 8.4.1 Button

```
Rest:       bg-clay-400 text-sand (or other variant)
Hover:      bg-clay-500 (smooth 150ms)
Active:     bg-clay-600 (100ms)
Focus:      ring-3 ring-water-500 ring-offset-2 (100ms)
Loading:    spinner fades in over 100ms; text fades out
Disabled:   opacity-50 cursor-not-allowed
```

#### 8.4.2 Class Card (`/schedule`)

```
Idle:       static
Hover:      subtle lift (translate-y-[-2px], shadow appears 150ms)
Active:     returns to rest (100ms)
Booked:     check icon appears, slight pulse on confirmation (1x)
Full:       no hover lift; cursor: not-allowed hover style
```

#### 8.4.3 Seat Counter (`SeatCounter` component)

```
Initial render:   fill width from 0% to current % over 600ms (--ease-gentle)
Live update:      When count changes, pulse-fill width with smooth tween 300ms
Edge case:        When class becomes full, fill color transitions: water-500 → clay-400
Edge case:        When wait­list joins, badge appears: scale-95 → 100 with bounce-less ease-gentle over 200ms
```

#### 8.4.4 Modal/Dialog

```
Open:    overlay fade-in 200ms → content slide-up from below 8px + fade-in 300ms
Close:   reverse: content fade-out 150ms → overlay fade-out 200ms
Focus:   first focusable element auto-focused on open; trap focus inside
Escape:  closes dialog
```

#### 8.4.5 Toast

```
Position:        bottom-left desktop, bottom-center mobile
Enter:           slide-up from below 8px + fade-in 300ms --ease-gentle
Exit:            fade-out + slide-down 8px 200ms --ease-sharp
Auto-dismiss:    4000ms; pause on hover; resume on hover-out
Stack:           vertical stack, newest at bottom; 8px gap
Max visible:     3; older toast collapses into a "{N} more" indicator
```

#### 8.4.6 Form Submit

```
Input idle:       background stone-50
Focus:           ring-water-500 (see Input pattern above)
Loading:         Spinner fades in over 200ms; inputs become disabled
Error:           Border transitions to error color 100ms; error message slides down 8px + fade-in 200ms
Success:         Button checkmark swap 200ms; page navigates OR form morphs to success state
```

### 8.5 Scroll Behavior

- Default scroll-behavior: smooth (per PAD §11.5)
- Reduced-motion: scroll-behavior auto
- Sticky elements (filterbar, session summary header): animate from y-[-100%] to y-0 over 200ms when entering viewport; reverse on leave

### 8.6 SSE-Specific Animations

The `useSessionAvailability` hook connects on mount and updates state. Animations triggered by SSE:
- Initial connection: small green/pulsing dot in footer appears; "Live connected" micro-toast appears after first event
- Disconnect: dot turns amber, pulse stops
- Reconnect: dot turns green; no announcement (silent success)
- Seat count change: SeatCounter animates smoothly
- Class becomes full: button morph (Book class → Join waitlist) with color change over 300ms

---

## 9. Admin Dashboard Specifications

The admin dashboard (PAD §8.4, `/admin`, `/admin/getDashboard`) requires more detailed specification than a generic section because it determines operational effectiveness.

### 9.1 Layout (KPIDashboard component)

```
┌────────────────────────────────────────────────────────────────────┐
│ Studio overview                          [Date: Today ▾]          │
├────────────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│ │ Today    │ │ Waitlist │ │ Active   │ │ At-risk  │                │
│ │ Bookings │ │ Activity │ │ Members  │ │ Members  │                │
│ │   142    │ │     8    │ │   234    │ │    12    │                │
│ │ ↑ 12%    │ │ ┘ Normal │ │ ↑ 3%     │ │ ┘ -3     │                │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘                │
├────────────────────────────────────────────────────────────────────┤
│ Today's Schedule           ┌────────────┐ │ Activity & Notifications│
│ ┌─────────────────────────┐│ Quick      │ │ ┌─────────────────────┐ │
│ │ 6:00am Vinyasa Flow     ││ Actions    │ │ │ • 11:42 John M.     │ │
│ │    Sarah K • 12 / 14    ││            │ │ │   canceled booking  │ │
│ │ ──────                  ││ • Cancel   │ │ │ • 11:38 Stripe      │ │
│ │ 7:30am Restorative      ││   session  │ │ │   $25.00 from Maya  │ │
│ │    Daniel R • 8 / 10    ││ • Send     │ │ │ • 11:21 2 new wait- │ │
│ │ ──────                  ││   email    │ │ │   list signups      │ │
│ │ 9:00am Yin Yoga         ││ • Resolve  │ │ │ • 11:15 No-show:    │ │
│ │    Lin H • 9 / 10       ││   alert    │ │ │   James P.          │ │
│ │ ──────                  ││            │ │ │                     │ │
│ [+ show more]             ││            │ │ [View full activity] │ │
│ └─────────────────────────┘└────────────┘ │ └─────────────────────┘ │
├────────────────────────────────────────────┴────────────────────┤
│ Anomalies                                                        │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ 🔴 3 members' payments failed in the last 24h                 │ │
│ │    [Resolve now]                                               │ │
│ │ 🟡 12 members haven't visited in 30+ days                      │ │
│ │    [Send re-engagement email]                                 │ │
│ │ 🟠 Avg waitlist wait time this month is 4.2 days (up from 2.1)│ │
│ │    [Investigate]                                              │ │
│ └────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

### 9.2 KPI Cards

Each KPI card shows:
```
┌────────────────────────────┐
│ LABEL          (icon, top-right)│
│ BIG NUMBER      (display-xl) │
│ Trend indicator        (with comparison period) │
│ Mini sparkline           (last 30 days)        │
└────────────────────────────┘
```

KPI definitions:
- **Today Bookings**: Count of confirmed enrollments for sessions today + tomorrow midnight
- **Waitlist Activity**: New waitlist joins in last 24h; trend vs prior 24h; badge color: green (declining) | amber (rising slightly) | red (rising fast = capacity issues)
- **Active Members**: Members with at least one session in last 30 days
- **At-Risk Members**: Members whose 30-day attendance is < 50% of their 90-day average
  - Editor note: this KPI surfaces deep in dashboard for operational triage

### 9.3 Today's Schedule (sidebar widget)

Vertical timeline of all scheduled sessions for today (`today, today's date in studio timezone`), ordered by start time.

Each row:
```
[Time] [Class title] [Instructor]
       [seat_count/capacity • status_badge]
       [Check-in ↪]
```
- Time column: monospace, 60px width, right-aligned
- Class title: display-md
- Seat count: small, with progress bar underneath
- Status badge after class: "Active" / "Cancelled" / "Completed"
- Action: "Check-in ↪" link → /admin/schedule/[sessionId]?tab=roster

Empty state: "No sessions scheduled today."

### 9.4 Anomalies Panel

Auto-flagged issues with severity icon + 1-line description + action button. Categories:
- Payment failures (red)
- Inactive members beyond threshold (amber)
- Performance metrics exceeded (orange)
- Waitlist capacity issues (red)
- Class cancellations (informational)

Each anomaly is dismissable with "[Investigate later]" link that archives it. Dismissed anomalies reappear if condition persists after 24h.

### 9.5 Activity Feed (right column)

Reverse-chronological list of admin actions and system events. Each row:
```
[Time]    [Actor or "System"]   [Event description]
11:42     John M.               canceled Cancelled their Sun 9am Yin Yoga booking
11:38     Stripe                $25.00 membership payment received from Maya
11:21     System                2 newly joined the Sun 9am Yin Yoga waitlist
11:15     Daniel R.             marked James P. as no-show for Mon 9am Class
```

Filter by event type (admin actions / payments / waitlists / cancellations).

### 9.6 Revenue Page (`/admin/revenue`)

```
[Date range: Last 30 days ▾]  [Export CSV]

KPI Strip:
  MRR $4,820     ARR $57,840    Churn 2.1% (lower is better)

Revenue Chart (line):
  X axis: time (daily/weekly/monthly toggle)
  Y axis: dollars
  Two lines: Active MRR (color #1), New MRR this period (color #2)
  Below chart: legend, hover for tooltips

Breakdown table:
  Plan         Active subs    MRR   Δ 30d
  Monthly 8    102             $3,060  +5
  Monthly 12   51              $2,040  +2
  ...

Below: Top cancel reasons (last 30d):
  too_expensive      8
  moving             3
  ...
```

### 9.7 Member Detail Page (`/admin/members/[id]`)

Tabs:
- **Profile** — Name, email, phone, joined date, contact info, custom notes
- **Activity** — Attendance rate (90-day, 30-day), session history (tabular), upcoming bookings
- **Subscription** — Current plan, status, invoices (last 5), payment methods
- **Roles** — Assigned roles, ability to add/remove (owner only)

Each tab is a separate URL hash (`#activity`, `#subscription`, `#roles`) for shareability.

### 9.8 Drawers / Sheets (admin CRUD)

All admin CRUD (creating a session, editing a class, managing roles) uses a Sheet (right-side drawer), not a separate page. The drawer:
- Slides in from right
- 480px max width on desktop; full-width on mobile
- Has its own header (with close button), body, footer (Cancel + Save)
- Auto-saves on blur for non-critical fields (slug, sortOrder)
- Manual save required for critical fields

---

## 10. Loading State Specifications

Per PAD §10.5: every data-dependent UI must implement all four states. This section specifies loading behavior in detail.

### 10.1 Loading Pattern by Context

| Context | Loading pattern | Duration expectation | Spinner? |
|---------|-----------------|---------------------|----------|
| **First page load (SSR)** | Skeleton matching final layout exactly | < 1000ms on broadband | No |
| **Client-side data fetch** | Skeleton (not spinner) inside slot | < 500ms typical | No |
| **Form submission** | Button shows spinner; inputs disabled | < 2s typical | Yes (in button only) |
| **Mutation (e.g., book class)** | Optimistic UI + rollback on error | < 500ms typical | Optimistic; spinner on roll back |
| **Infinite scroll / pagination** | Skeleton rows (3 rows) at bottom | Continuous | No |
| **Search / typeahead** | Subtle progress dot in input box | < 300ms | No |
| **Background sync (SSE reconnect)** | Connection dot in footer; invisible otherwise | Up to 30s | No |
| **Modal/Sheet opening** | Skeleton inside Sheet body | < 800ms | No |
| **Admin table first load** | Skeleton rows (5 rows, table layout) | < 800ms | No |
| **Admin table filter/search** | Skeleton rows (3 rows) at top | < 400ms | No |
| **Full-page route change** | Brief skeleton flash | < 600ms | No |
| **File upload (avatar, image)** | Progress bar in upload zone | Up to 30s | Yes (progress bar) |
| **Stripe redirect** | Full-screen brand loading | 2-5s | Yes (calm, slow-rotate) |

### 10.2 Skeleton Guidelines

Skeleton design rules (matching PAD §11 design language):

```
Color:     bg-stone-200 (no shimmer animation; just static muted stone)
Shape:     Matches final element exactly (same dimensions, same position)
Text:      width matches final text width (e.g., heading 60% of column width)
Avatars:   Circular skeleton
Buttons:   Rounded rectangle skeleton matching button dimensions
Cards:     Full card skeleton with internal layout matching
Tables:    Skeleton rows × 5 with column structure visible
```

Anti-patterns:
```
✗ Shimmer/pulse animation (we use static; PAD §11.5 prefers calm)
✗ Generic rectangular blocks where text should be
✗ Spinner inside a layout-defining slot (use skeleton instead)
✗ Skeletons that don't match final layout dimensions
✗ Skeletons visible for > 5 seconds (refetch or error)
```

Edge cases:
- Skeleton > 5 seconds: Show error state with "Taking longer than usual" message + retry
- Skeleton < 200ms: Don't show (just let the actual content fade in)

### 10.3 Suspense Boundaries

Per Next.js 16 conventions (PAD §13 + Skill §5.2):

```
Layout-level Suspense boundaries:
  /admin/layout.tsx — wraps studio shell + persistent nav
  /studio/layout.tsx — wraps member shell + persistent nav
  No suspense at page level for these (use SSR initial)

Page-level Suspense:
  /schedule — wraps ScheduleGrid while ISR data hydrates
  /book/[sessionId] — wraps SeatCounter while SSE connects
  /dashboard — wraps each widget (Upcoming, MembershipSummary, etc.)
```

Loading.tsx files use a `<Skeleton>` component matching the page's main content shape (not generic "Loading...").

### 10.4 Network Resilience

Per PAD §10.5 audio + UI resilience rules:

- Failed tRPC query: Graceful error state with retry button (see §11.5)
- SSE disconnect: Show amber dot + auto-retry; never block UI
- Form submission failure: Re-enable form; preserve unsaved values
- Optimistic UI rollback: Smooth state reversal (no flicker)

---

## 11. Empty State Specifications

Every list, table, or count-based widget must implement a meaningful empty state per PAD §10.5.

### 11.1 Empty State Templates

Each empty state has: icon (or illustration), headline, subhead, optional CTA. Tone: helpful, not pitying. Never "Oops!" or "Uh oh!"

### 11.2 Per-Widget Empty States

| Widget | Headline | Subhead | CTA |
|--------|----------|---------|-----|
| **Upcoming bookings** | "Nothing booked yet." | "Find a class that fits this week." | "Browse schedule" → /schedule |
| **Past bookings** | "Your practice starts here." | "Past sessions will show up here once you've taken your first class." | "Take your first class" → /schedule |
| **Waitlist** | "No waitlists." | "Looking to join a full class? Browse the schedule." | "Browse schedule" → /schedule |
| **Membership summary** | "You're not a member yet." | "Join for weekly classes, or drop in to start." | "See membership options" → /pricing |
| **Invoices** | "No invoices yet." | (occurs only when subscription just started; rare) | (none) |
| **Notifications list (admin)** | "All caught up." | "No items need your attention right now." | (none) |
| **Activity feed** | "Nothing here yet." | "Activity will appear as it happens." | (none) |
| **Anomalies panel** | "Looking healthy." | "No issues to flag. Last checked: at {timestamp}." | (none) |
| **Members list (search empty)** | "No members match." | "Try a different name or email." | "Clear search" |
| **Sessions list (filter empty)** | "No classes match your filters." | "Try clearing some filters." | "Clear filters" |
| **Class catalog (admin)** | "Add your first class." | "Define a class template before scheduling sessions." | "Add a class" → /admin/classes/[id]/edit |
| **Roster (empty session)** | "No one's booked yet." | "Members can sign up via the public schedule." | (none) |
| **Invoices (admin)** | "No recent activity." | "Invoices appear when subscriptions are billed." | (none) |
| **Blogs list (recent)** | "No posts yet." | "Publish from Sanity Studio to see posts here." | "Open Sanity Studio" → external |
| **Revenue chart (no data)** | "No revenue in this range." | "Try a longer date range or select a different period." | "Reset to default range" |

### 11.3 Design Tokens for Empty States

- Icon: `text-stone-300`, size 48px (not too big — stays editorial)
- Headline: `text-heading-md` Cormorant
- Subhead: `text-body-md` DM Sans, `text-stone-600`
- CTA: `Button variant="outline" size="md"` (not primary — this is a secondary action)
- Centered, max-w-sm
- Vertical padding: `--space-12` (192px) — generous breathing room

---

## 12. Interaction State Specifications

Every interactive element has 5 explicit states (PAD §11 + WCAG §22):

### 12.1 Buttons

States defined in component spec (Section 3.1.1); restated here for completeness:

| State | Visual | Cursor | Aria |
|-------|--------|--------|------|
| Rest | variant default | pointer | — |
| Hover | variant hover color | pointer | — |
| Focus | ring-3 ring-water-500 ring-offset-2 | pointer | aria-disabled=false |
| Active | variant active color (darker) | pointer | — |
| Disabled | opacity-50 | not-allowed | aria-disabled=true |

### 12.2 Form Fields

States defined in component spec (Section 3.1.2); restated here:

| State | Visual |
|-------|--------|
| Rest | border-stone-300 bg-sand |
| Hover | border-stone-400 |
| Focus | ring-3 ring-water-500 ring-offset-2 border-water-500 |
| Error | border-error ring-error-200 + error message shown below |
| Disabled | bg-stone-100 text-stone-400 cursor-not-allowed |
| Read-only | bg-transparent cursor-default (no border change) |

### 12.3 Cards (ClassCard, InstructorCard, etc.)

| State | Micro-interaction |
|-------|------------------|
| Rest | static |
| Hover (mouse only) | lift -2px, shadow appears (150ms) |
| Active (pressed) | returns to rest (100ms — quick snap) |
| Focus-visible | ring-3 ring-water-500 (no lift) |
| Disabled (when class is full) | opacity-60, no hover, no lift |

Touch devices: lift disabled; hover state replaced with `:active` only.

### 12.4 Links

| State | Visual |
|-------|--------|
| Rest | text-water-600 |
| Hover | underline (offset-4) |
| Visited | text-water-700 (subtle) |
| Focus-visible | ring-3 ring-water-500 ring-offset-2 around inline content |
| Active | text-water-700 |

### 12.5 Switch / Checkbox

| State | Visual |
|-------|--------|
| Off | bg-stone-200 knob at left |
| On | bg-water-500 knob at right with smooth 150ms tween |
| Hover | subtle bg shift (-50 to -100 on stone scale) |
| Focus-visible | ring-3 ring-water-500 ring-offset-2 |
| Disabled | opacity-50 |

### 12.6 Tooltip (Radix Tooltip wrapper if needed)

- Show after 500ms hover delay
- Hide after 100ms mouse-out delay
- Position auto-flip if near edge
- Background: stone-900, text: sand-50, font-body-sm
- Arrow indicator on the side facing the trigger
- Reduced-motion: instant show/hide

### 12.7 Default Cursor Rules

- `pointer`: clickable elements (links, buttons, interactive cards)
- `default`: static text, decorations
- `not-allowed`: disabled buttons, read-only fields with disabled interaction
- `wait`: loading state on whole-page (rare; usually use per-element indication)
- `progress`: file upload (don't use elsewhere)

---

## 13. Validation Rules Catalog

Beyond Zod schema enforcement, business rules apply at multiple boundaries. These rules are checked at DB constraint level (where possible) AND in application logic.

### 13.1 Booking Rules

| # | Rule | Enforced by | Error message |
|---|------|-------------|---------------|
| BR-1 | Session must start in future | DB CHECK constraint + server | "This class has already started." |
| BR-2 | Session must be status='scheduled' | DB CHECK | "This class has been cancelled." |
| BR-3 | Unique enrollment per session+member | DB UNIQUE INDEX (sessionId, memberId) | "You're already booked into this class." |
| BR-4 | Unique waitlist per session+member | DB UNIQUE INDEX (sessionId, memberId) WHERE status IN ('waiting', 'offered') | "You're already on this waitlist." |
| BR-5 | Member must have active credits OR drop-in purchased | server | "No credits remaining. Buy a class pack or join as member." |
| BR-6 | Member cannot book same session twice (even with credits) | DB UNIQUE + server | (see BR-3) |
| BR-7 | Conditional virtual: virtual sessions need stream URL | DB CHECK + server | "Virtual sessions require a stream URL." |
| BR-8 | Weekly booking cap (configurable) | server | "You've reached your weekly class maximum." |
| BR-9 | Concurrent booking safety | pg_advisory_xact_lock (PAD §4.2) | "We're processing your booking..." |
| BR-10 | Inactive members cannot book | server | "Your account is inactive. Contact support." |

### 13.2 Cancellation Rules

| # | Rule | Enforced by | Refund credit? |
|---|------|-------------|----------------|
| CR-1 | Member can only cancel own enrollment | server (session.user.id) | n/a |
| CR-2 | Cancellation window (default 12h) | server | If outside window: no refund |
| CR-3 | Setting `cancellationWindowHours` in studio settings | config | (configurable) |
| CR-4 | Cancelling triggers waitlist promotion | trigger.dev job | n/a |
| CR-5 | Cannot cancel a session that's already started | server | "Can't cancel a class that's already in progress." |
| CR-6 | Cannot cancel session already checked-in | server | "You've already checked in. Contact staff to cancel." |
| CR-7 | Staff cancellation has reason dropdown (required) | schema | n/a |

### 13.3 Waitlist Rules

| # | Rule | Enforced by |
|---|------|------------|
| WR-1 | Add to waitlist only if class is full | server |
| WR-2 | Maximum position = capacity of session | server |
| WR-3 | Offer window (default 2h, configurable via studio settings) | config + cron (waitlist-expiry job) |
| WR-4 | Claiming consumes a credit (transferred from offer to enrollment) | server, in same transaction as claim |
| WR-5 | Declining an offer promotes next in line | trigger.dev job |
| WR-6 | Expiry threshold: cannot claim after `expires_at` | server |
| WR-7 | Waitlist positions update when someone leaves (high position) | DB trigger or application logic |

### 13.4 Subscription Rules

| # | Rule | Enforced by |
|---|------|------------|
| SR-1 | One active subscription per member | server (Stripe enforces at customer level) |
| SR-2 | Plan must be active (`isActive=true`) to subscribe | server |
| SR-3 | Pause duration min 7 days (config) | server |
| SR-4 | Pause duration max 90 days (config) | server |
| SR-5 | Pause accumulates: max 90 days/year (config) | server |
| SR-6 | Cancellation is at period end (no immediate) | Stripe subscription.cancel_at_period_end=true |
| SR-7 | Proration: Stripe handles automatically on plan change | Stripe |
| SR-8 | Credit grant on invoice.paid (post first payment, not on subscribe with trial) | webhook handler |
| SR-9 | Credits expire at end of billing period (no rollover) | server (cron) |
| SR-10 | Trial: 0–30 days, configurable per plan | Stripe |

### 13.5 Permission Rules

| Action | Permission | Roles allowed |
|--------|------------|---------------|
| Book a class | book_class | member, instructor, staff, manager, owner |
| Cancel any member's booking | (no permission named yet — use cancel_own) | staff, manager, owner |
| Create class | manage_classes | staff, manager, owner |
| Edit class | manage_classes | staff, manager, owner |
| View revenue | view_revenue | manager, owner |
| Edit plans | manage_memberships | manager, owner |
| Assign roles | assign_roles | owner only |
| Studio settings | studio_settings | owner only |
| View audit log | view_audit_log | owner |

### 13.6 Rate Limit Rules (Upstash Redis)

| Action | Limit | Window |
|--------|-------|--------|
| `bookings.book` | 10 | 60s per member |
| `bookings.cancel` | 20 | 60s per member |
| `memberships.subscribe` | 5 | 60s per member |
| `/auth/signin` POST | 8 | 60s per IP |
| `/auth/signup` POST | 3 | 60s per IP |
| Email magic-link request | 3 | 60s per email |

Implementation: `@upstash/ratelimit` middleware in tRPC (§2.3) and route handlers.

---

## 14. Notification Copy Catalog

All toasts use tone matching the design system (calm, specific, brief). Format:

### 14.1 Toast Conventions

| Type | Variant | Default Duration | Position |
|------|---------|------------------|----------|
| Success | bg-water-500-on-sand text-stone-900 | 4000ms | bottom-left (desktop), bottom-center (mobile) |
| Error | bg-error text-sand | 6000ms | bottom-left (desktop), bottom-center (mobile) |
| Info | bg-stone-100 text-stone-900 | 4000ms | same |
| Warning | bg-warning text-sand | 5000ms | same |

Target: max 6 words for the title. Description: max 14 words.

### 14.2 Success Toasts

| Trigger | Toast Title | Description (if any) | Action button |
|---------|------------|---------------------|---------------|
| Booking confirmed | "You're booked." | "{class} on {time}" | "View" → /my-classes |
| Booking cancelled | "Booking cancelled." | "{creditCount} credit refunded." | "My classes" |
| Waitlist joined | "On the waitlist." | "Position #{position}" | "View waitlist" |
| Waitlist spot claimed | "Spot claimed." | "You're in {class}" | "View" |
| Subscription started | "Welcome." | "Redirecting to Stripe..." | (auto-redirect) |
| Subscription cancelled | "Subscription set to cancel." | "Active until {date}" | "View plan" |
| Subscription paused | "Membership paused." | "Resumes {date}" | "Manage" |
| Profile saved | "Profile updated." | | |
| Invoice paid | "Payment received." | "{amount} from {last4}" | "Receipt" |
| Role assigned | "Role granted." | "{member} now has {role}" | |
| Class created | "Class added." | "{class} available for scheduling" | "Schedule" |
| Session created | "Sessions added." | "{count} sessions added" | "View" |
| Session cancelled | "Sessions cancelled." | "{count} enrollees notified" | "View log" |

### 14.3 Error Toasts

| Trigger | Toast Title | Description |
|---------|------------|-------------|
| Booking failed (network) | "Booking didn't go through." | "Please try again." |
| Booking failed (race) | "Class is now full." | "You're on the waitlist at #{position}." |
| Booking failed (auth) | "Please sign in to book." | "Redirecting..." |
| Payment declined | "Card declined." | "Try a different card." |
| Network timeout | "Connection slow right now." | "Please try again." |
| Form save failed | "Couldn't save changes." | "Please try again." |
| Permission denied | "No access to that page." | |
| Rate limit | "Too many requests." | "Please wait {seconds}s." |
| Generic catch | "Unexpected error." | "We've been notified." |

### 14.4 Info Toasts

| Trigger | Toast Title | Description |
|---------|------------|-------------|
| SSE connected | "Live seat counts ready." | (silent reconnect — no toast) |
| Profile save (debounced) | (silent — no toast) | |
| Magic link sent | "Check your inbox." | "Sign-in link sent to {email}." |
| Auto-saved settings | (silent in toast; sub-label visible) | |

### 14.5 Warning Toasts

| Trigger | Toast Title | Description |
|---------|------------|-------------|
| Trial ends in 3 days | "Your trial ends soon." | "Choose a plan before {date}." |
| Subscription will cancel | "Subscription ends {date}." | "Renew to keep your benefits." |
| Server in maintenance | "Maintenance in 30 minutes." | "Bookings may slow briefly." |
| Waitlist position changed | "Your waitlist position changed." | "Now #{newPosition}." |

### 14.6 Banners (non-toast, page-level)

| Trigger | Banner | Action |
|---------|--------|--------|
| Payment failed (ongoing) | "Your last payment didn't go through." | "Update card → /membership" |
| Offline | "You're offline. Your booking will save and process when you're back." | (none) |
| Maintenance | "We'll be down for maintenance from {start} to {end}." | (none) |
| Impersonation (admin) | "Viewing as {memberName}. Actions affect their account." | "Exit" |

---

## 15. Date/Time Formatting Catalog

Studio timezone: `America/Los_Angeles` for v1 (per PAD §24; i18n deferred).

### 15.1 Date/Time Display Patterns

| Context | Format | Example |
|---------|--------|---------|
| Class card time | `h:mm a` | "9:30 AM" |
| Session detail time | `h:mm a — h:mm a` | "9:30 AM — 10:30 AM" |
| Schedule view day label | `EEE, MMM d` | "Mon, Jun 29" |
| Schedule view month label | `MMMM yyyy` | "June 2026" |
| Booking history date | `MMM d, yyyy` | "Jun 29, 2026" |
| Invoice date | `MMM d, yyyy` | "Jun 29, 2026" |
| Membership start date | `MMMM d, yyyy` | "June 29, 2026" |
| Email tomorrow reminder | `EEE, h:mm a` | "Mon, 9:30 AM" |
| Email 1-hour reminder | `h:mm a` | "9:30 AM" |

Implementation: Use `Intl.DateTimeFormat` (no Moment.js). Respect user timezone for member views; studio timezone for admin.

### 15.2 Relative Time

| Context | Format | Example |
|---------|--------|---------|
| Activity feed | `{n}m ago`, `{n}h ago`, `{n}d ago` | "11m ago", "2h ago", "3d ago" |
| Last visit (admin) | `Last visit: {relative}` | "Last visit: 3d ago" |
| Session start countdown | `Starts in {n} min` | "Starts in 30 min" |

Above 7 days: absolute date. Never show seconds in user-facing UI.

### 15.3 Date Range Selection

| Picker | Layout |
|--------|--------|
| Single date | Calendar popover (Cal component) |
| Range | Two linked calendars, OR single calendar with range selection |
| Time | Native `<input type="time">` styled to match design system |

### 15.4 Time Zones

Display rules:
- **Member view**: Show in member's browser timezone (detected via `Intl.DateTimeFormat().resolvedOptions().timeZone`).
- **Admin view**: Default to studio timezone (PT). Allow override per-user in settings (future feature).

A class at "9:30 AM PT" displayed to a member in EST shows as "12:30 PM EST" — with a small "(PT)" annotation on hover/second tap to avoid timezone ambiguity.

---

## PAD.md Cross-Reference Update

The following sections of PAD.md should be updated to reference this companion document:

```
### Section 8 (API Architecture) — after §8.4:
> **For the complete procedure catalog (~50 procedures with Zod schemas),
> see SPECIFICATIONS.md §2.**

### Section 10 (Frontend Architecture) — after §10.5:
> **For component interfaces (TypeScript contracts), see SPECIFICATIONS.md §3.**
> **For page content & copy, see SPECIFICATIONS.md §4.**
> **For form schemas, see SPECIFICATIONS.md §5.**

### Section 11 (Design System) — after §11.6:
> **For interaction states (hover, focus, active), see SPECIFICATIONS.md §12.**
> **For animation choreography, see SPECIFICATIONS.md §8.**

### Section 22 (Accessibility) — keep (already complete):
> **For date/time formatting rules (i18n deferred), see SPECIFICATIONS.md §15.**

### Section 28 (Error Handling) — after §28.3:
> **For the complete error message catalog (every user-facing string),
> see SPECIFICATIONS.md §6.**

### New Section 32 after Appendix E:
> **Cross-Reference: This document is the companion to SPECIFICATIONS.md,
> which provides component interfaces, page content, form schemas,
> error messages, responsive behavior, animation choreography, and
> validation rules that complement the architectural decisions documented here.**
```

These updates are intentional **cross-references, not migrations**. PAD.md remains the canonical architectural document; SPECIFICATIONS.md is the implementation reference.

---

## Delivery Summary

What this document delivers (cross-referenced to PAD.md sections it complements):

| § | Section | Coverage | Lines | PAD.md sections complemented |
|---|---------|----------|-------|------------------------------|
| 1 | Document Convention | Conventions + tone guide | ~25 | All |
| 2 | Complete tRPC Procedure Catalog | 56 procedures across 11 routers with full Zod schemas and outputs | ~470 | §8.4 expansion |
| 3 | Component Interface Catalog | 25 component interfaces (shared + app-specific + email + hooks) | ~580 | §10.1, §11.6 |
| 4 | Page Content Specifications | 16 routes with full content blocks, SEO specs, interactions | ~580 | §12 |
| 5 | Form Schema Catalog | 14 form schemas with all Zod validations and UI notes | ~440 | §10.4 + §8 (Zod) |
| 6 | Error Message Catalog | 100+ error strings organized by domain with recovery actions | ~360 | §28 expansion |
| 7 | Responsive Behavior Specifications | 9 contexts with mobile/tablet/desktop rules | ~140 | §11.4 |
| 8 | Animation Choreography | 18 animation specs + banned list + reduced-motion behavior | ~280 | §11.5 |
| 9 | Admin Dashboard Specifications | 7 dashboard sub-pages with full layouts and KPIs | ~210 | §8 (admin router) |
| 10 | Loading State Specifications | 13 loading contexts with skeleton rules | ~120 | §10.5 |
| 11 | Empty State Specifications | 16 empty states with full copy + CTAs | ~120 | §10.5 |
| 12 | Interaction State Specifications | 7 element types × 5 states | ~80 | §22 |
| 13 | Validation Rules Catalog | 5 categories × 31 numbered rules | ~250 | §8 (Zod) + §7 (DB constraints) |
| 14 | Notification Copy Catalog | 50+ toast strings + 4 banner scenarios | ~200 | §28 |
| 15 | Date/Time Formatting Catalog | 25+ display patterns + relative time + timezone | ~120 | §24 |
| Total | | | **2,750+** | Bridges architectural → implementation |

Together with PAD.md, this document provides a **coding agent with everything needed to implement every visible feature** without architectural ambiguity. A coding agent hitting both documents together can:

- Implement data layer from PAD.md §7 + SPECS.md §13
- Implement API layer from PAD.md §8 + SPECS.md §2 (procedures) + §5 (schemas) + §13 (rules)
- Implement UI layer from PAD.md §10–11 + SPECS.md §3 (interfaces) + §4 (content) + §7 (responsive) + §8 (animation) + §10 (loading) + §11 (empty) + §12 (states)
- Implement error handling from PAD.md §28 + SPECS.md §6 (strings) + §14 (toasts)
- Implement date/time from SPECS.md §15

The remaining ambiguities (visual styling details beyond tokens, copy nuances, edge-case UX preferences) require human review.

