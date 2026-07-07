/**
 * F2-04 — Shared auth types test suite (RED phase)
 *
 * Tests for the shared auth type definitions.
 * Per MEP Phase 2 F2-04 (resolves D10) + PAD §9.3.
 */

import { describe, it, expect } from 'vitest';
import type { ActiveSubscriptionSummary, StillwaterSession } from './types';

describe('F2-04: ActiveSubscriptionSummary interface', () => {
  it('has all 4 required fields', () => {
    const summary: ActiveSubscriptionSummary = {
      planName: 'Unlimited',
      status: 'active',
      currentPeriodEnd: new Date('2026-08-01'),
      creditsRemaining: 0,
    };
    expect(summary.planName).toBe('Unlimited');
    expect(summary.status).toBe('active');
    expect(summary.currentPeriodEnd).toBeInstanceOf(Date);
    expect(summary.creditsRemaining).toBe(0);
  });

  it('status accepts all 4 valid values', () => {
    const statuses: ActiveSubscriptionSummary['status'][] = [
      'active',
      'trialing',
      'past_due',
      'paused',
    ];
    expect(statuses).toHaveLength(4);
  });
});

describe('F2-04: StillwaterSession interface (matches PAD §9.3)', () => {
  it('has user object with all required fields', () => {
    const session: StillwaterSession = {
      user: {
        id: '00000000-0000-4000-a000-000000000001',
        email: 'test@stillwater.test',
        name: 'Test User',
        image: null,
        memberId: '00000000-0000-4000-a000-000000000011',
        roles: ['member'],
        activeSubscription: null,
      },
      expires: '2026-08-01T00:00:00.000Z',
    };
    expect(session.user.id).toBeDefined();
    expect(session.user.email).toBeDefined();
    expect(session.user.name).toBe('Test User');
    expect(session.user.image).toBeNull();
    expect(session.user.memberId).toBeDefined();
    expect(session.user.roles).toEqual(['member']);
    expect(session.user.activeSubscription).toBeNull();
    expect(session.expires).toBeDefined();
  });

  it('roles is an array of StudioRole values (member, instructor, staff, manager, owner)', () => {
    const session: StillwaterSession = {
      user: {
        id: 'test-id',
        email: 'test@test.test',
        name: null,
        image: null,
        memberId: null,
        roles: ['member', 'instructor', 'staff', 'manager', 'owner'],
        activeSubscription: null,
      },
      expires: '2026-08-01T00:00:00.000Z',
    };
    expect(session.user.roles).toHaveLength(5);
    expect(session.user.roles).toContain('owner');
  });
});
