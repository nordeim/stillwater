/**
 * F1-19 (supplement) — Membership plan fixtures
 *
 * 3 demo plans matching the mockup pricing tiers:
 *   1. Pay As You Go ($28/class — drop-in, no credits)
 *   2. Unlimited ($149/month — unlimited classes)
 *   3. 10 Classes ($220/90 days — 10-credit pack)
 *
 * Source: static_landing_page_mockup.html pricing section.
 *
 * Note: Stripe price IDs are placeholders — real IDs are created in
 * Phase 7 (Stripe Integration) when products are configured.
 */

import type { InferInsertModel } from 'drizzle-orm';
import { membershipPlans } from '../../schema';

type NewPlan = InferInsertModel<typeof membershipPlans>;

export const demoMembershipPlans: NewPlan[] = [
  {
    id: '00000000-0000-4000-g000-000000000001',
    name: 'Pay As You Go',
    stripePriceId: 'price_placeholder_dropin_0001',
    interval: 'month', // Drop-in uses month interval but 1 credit per cycle
    classCreditsPerCycle: 1,
    guestPassesPerCycle: 0,
    allowsVirtual: true,
    allowsInPerson: true,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: '00000000-0000-4000-g000-000000000002',
    name: 'Unlimited',
    stripePriceId: 'price_placeholder_unlimited_0001',
    interval: 'month',
    classCreditsPerCycle: null, // null = unlimited
    guestPassesPerCycle: 2,
    allowsVirtual: true,
    allowsInPerson: true,
    isActive: true,
    sortOrder: 2,
  },
  {
    id: '00000000-0000-4000-g000-000000000003',
    name: '10 Classes',
    stripePriceId: 'price_placeholder_10pack_0001',
    interval: 'month',
    classCreditsPerCycle: 10,
    guestPassesPerCycle: 1,
    allowsVirtual: false,
    allowsInPerson: true,
    isActive: true,
    sortOrder: 3,
  },
];
