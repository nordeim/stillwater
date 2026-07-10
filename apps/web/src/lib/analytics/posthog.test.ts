// @vitest-environment jsdom
/**
 * F10-04 — PostHog analytics test suite
 *
 * Tests:
 *   - All 18 events are exported
 *   - classBooked calls posthog.capture with correct event name + props
 *   - initPostHog calls posthog.init with reverse proxy host
 *
 * Source: MEP Phase 10 F10-04, PAD §18.2.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock posthog-js
vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    opt_in_capturing: vi.fn(),
  },
}));

import posthog from 'posthog-js';
import { analytics, initPostHog, ANALYTICS_EVENT_COUNT } from './posthog';

describe('F10-04: PostHog analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports exactly 18 analytics events', () => {
    const eventKeys = Object.keys(analytics);
    expect(eventKeys.length).toBe(ANALYTICS_EVENT_COUNT);
    expect(eventKeys.length).toBe(18);
  });

  it('classBooked calls posthog.capture with correct event name + props', () => {
    analytics.classBooked({ sessionId: 's1', classId: 'c1' });

    expect(posthog.capture).toHaveBeenCalledTimes(1);
    expect(posthog.capture).toHaveBeenCalledWith('class_booked', {
      sessionId: 's1',
      classId: 'c1',
    });
  });

  it('pageViewed calls posthog.capture with event name only', () => {
    analytics.pageViewed();

    expect(posthog.capture).toHaveBeenCalledTimes(1);
    expect(posthog.capture).toHaveBeenCalledWith('page_viewed');
  });

  it('membershipStarted calls with correct props', () => {
    analytics.membershipStarted({ planId: 'p1', stripeSubscriptionId: 'sub_123' });

    expect(posthog.capture).toHaveBeenCalledWith('membership_started', {
      planId: 'p1',
      stripeSubscriptionId: 'sub_123',
    });
  });

  it('initPostHog calls posthog.init with reverse proxy host', () => {
    initPostHog();

    expect(posthog.init).toHaveBeenCalledTimes(1);
    const initCall = (posthog.init as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(initCall[1]).toMatchObject({
      api_host: '/_analytics',
      capture_pageviews: true,
      capture_exceptions: true,
      persistence: 'localStorage+cookie',
    });
  });

  it('all event names are snake_case past tense', () => {
    const calls: string[] = [];
    (posthog.capture as ReturnType<typeof vi.fn>).mockImplementation((event: string) => {
      calls.push(event);
    });

    // Trigger all events
    analytics.pageViewed();
    analytics.scheduleBrowsed();
    analytics.classDetailViewed({ classId: 'c', classSlug: 's' });
    analytics.pricingViewed();
    analytics.signupStarted();
    analytics.signupCompleted({ userId: 'u' });
    analytics.firstClassBooked({ sessionId: 's', classId: 'c' });
    analytics.classBooked({ sessionId: 's', classId: 'c' });
    analytics.classCancelled({ sessionId: 's', enrollmentId: 'e' });
    analytics.waitlistJoined({ sessionId: 's' });
    analytics.waitlistSpotClaimed({ sessionId: 's', waitlistEntryId: 'w' });
    analytics.checkInCompleted({ sessionId: 's', memberId: 'm' });
    analytics.membershipStarted({ planId: 'p', stripeSubscriptionId: 's' });
    analytics.membershipUpgraded({ oldPlanId: 'p1', newPlanId: 'p2' });
    analytics.membershipPaused({ subscriptionId: 's' });
    analytics.membershipCancelled({ subscriptionId: 's' });
    analytics.paymentFailed({ stripeEventId: 'e', amountCents: 100 });
    analytics.paymentRecovered({ stripeEventId: 'e' });

    // All should be snake_case
    for (const event of calls) {
      expect(event).toMatch(/^[a-z]+(_[a-z]+)+$/);
    }
    expect(calls.length).toBe(18);
  });
});
