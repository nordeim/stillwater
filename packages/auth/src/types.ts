/**
 * F2-04 — Shared auth types (resolves D10)
 *
 * Defines the session shape enriched by the customSession plugin.
 * `StillwaterSession` matches PAD §9.3 verbatim.
 *
 * Source: MEP Phase 2 F2-04, PAD.md §9.3 Session Token Shape.
 */

import { studioRoleEnum } from '@stillwater/db';

// StudioRole — derived from the Drizzle pgEnum values (matches PAD §7.2)
export type StudioRole = (typeof studioRoleEnum.enumValues)[number];

export interface ActiveSubscriptionSummary {
  planName: string;
  status: 'active' | 'trialing' | 'past_due' | 'paused';
  currentPeriodEnd: Date;
  creditsRemaining: number;
}

export interface StillwaterSession {
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    memberId: string | null;
    roles: StudioRole[];
    activeSubscription: ActiveSubscriptionSummary | null;
  };
  expires: string;
}
