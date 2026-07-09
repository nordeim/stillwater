/**
 * F8-12 — @stillwater/workers barrel export
 *
 * Re-exports all 11 Trigger.dev tasks. Trigger.dev auto-discovers tasks via
 * `dirs: ['./src']` in trigger.config.ts, so this barrel is for programmatic
 * imports only (e.g., tRPC procedures invoking tasks via tasks.trigger()).
 *
 * Note: Relative imports use `.js` extensions per NodeNext moduleResolution
 * (workers tsconfig sets module/moduleResolution: NodeNext + package.json
 * "type": "module"). TypeScript resolves these to the .ts source at build time.
 *
 * Source: MEP F8-12, PAD §17.1, ADR-010.
 */

export { bookingConfirmation } from './booking-confirmation.js';
export { classReminder24h } from './class-reminder-24h.js';
export { classReminder1h } from './class-reminder-1h.js';
export { classCancellationNotify } from './class-cancellation-notify.js';
export { waitlistPromotion } from './waitlist-promotion.js';
export { waitlistExpiry } from './waitlist-expiry.js';
export { membershipCreditGrant } from './membership-credit-grant.js';
export { membershipExpiryWarn } from './membership-expiry-warn.js';
export { paymentFailedNotify } from './payment-failed-notify.js';
export { weeklyDigest } from './weekly-digest.js';
export { attendanceSummary } from './attendance-summary.js';
