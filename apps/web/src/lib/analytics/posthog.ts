/**
 * F10-04 — PostHog client init + event tracker
 *
 * Initializes PostHog on the client with privacy-friendly reverse proxy.
 * Exports an `analytics` object with all 18 events from PAD §18.2.
 *
 * Source: MEP Phase 10 F10-04, PAD §18.2 (event taxonomy).
 */

import posthog from 'posthog-js';

/**
 * Initialize PostHog on the client.
 * Called from PostHogProvider (client component).
 */
export function initPostHog() {
  if (typeof window !== 'undefined') {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '', {
      api_host: '/_analytics', // reverse proxy for privacy (next.config.ts rewrites)
      capture_pageview: true,
      capture_exceptions: true,
      persistence: 'localStorage+cookie',
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') {
          ph.opt_in_capturing();
        }
      },
    });
  }
}

/**
 * All 18 analytics events from PAD §18.2.
 * Event names are snake_case, past tense.
 */
export const analytics = {
  // Acquisition
  pageViewed: () => posthog.capture('page_viewed'),
  scheduleBrowsed: () => posthog.capture('schedule_browsed'),
  classDetailViewed: (props: { classId: string; classSlug: string }) =>
    posthog.capture('class_detail_viewed', props),
  pricingViewed: () => posthog.capture('pricing_viewed'),

  // Activation
  signupStarted: () => posthog.capture('signup_started'),
  signupCompleted: (props: { userId: string }) =>
    posthog.capture('signup_completed', props),
  firstClassBooked: (props: { sessionId: string; classId: string }) =>
    posthog.capture('first_class_booked', props),

  // Engagement
  classBooked: (props: { sessionId: string; classId: string }) =>
    posthog.capture('class_booked', props),
  classCancelled: (props: { sessionId: string; enrollmentId: string }) =>
    posthog.capture('class_cancelled', props),
  waitlistJoined: (props: { sessionId: string }) =>
    posthog.capture('waitlist_joined', props),
  waitlistSpotClaimed: (props: { sessionId: string; waitlistEntryId: string }) =>
    posthog.capture('waitlist_spot_claimed', props),
  checkInCompleted: (props: { sessionId: string; memberId: string }) =>
    posthog.capture('check_in_completed', props),

  // Revenue
  membershipStarted: (props: { planId: string; stripeSubscriptionId: string }) =>
    posthog.capture('membership_started', props),
  membershipUpgraded: (props: { oldPlanId: string; newPlanId: string }) =>
    posthog.capture('membership_upgraded', props),
  membershipPaused: (props: { subscriptionId: string }) =>
    posthog.capture('membership_paused', props),
  membershipCancelled: (props: { subscriptionId: string }) =>
    posthog.capture('membership_cancelled', props),
  paymentFailed: (props: { stripeEventId: string; amountCents: number }) =>
    posthog.capture('payment_failed', props),
  paymentRecovered: (props: { stripeEventId: string }) =>
    posthog.capture('payment_recovered', props),
} as const;

/**
 * Total event count (should be 18 per PAD §18.2).
 */
export const ANALYTICS_EVENT_COUNT = 18;
