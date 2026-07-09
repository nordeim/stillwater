/**
 * Template ID constants for Resend Native Templates (ADR-010)
 *
 * Per ADR-010 acceptance rationale: "Type safety is preserved by exporting
 * templateId string constants from packages/email/src/index.ts."
 *
 * These IDs correspond to templates deployed to the Resend dashboard.
 * Workers use these constants with sendEmailNative() to avoid importing
 * the 1.8MB React Email v6 bundle.
 *
 * Source: ADR-010, PAD §16.1 (13 templates).
 */

export const TEMPLATE_IDS = {
  BOOKING_CONFIRMATION: 'booking-confirmation',
  BOOKING_CANCELLATION: 'booking-cancellation',
  CLASS_CANCELLATION: 'class-cancellation',
  CLASS_REMINDER_24H: 'class-reminder-24h',
  CLASS_REMINDER_1H: 'class-reminder-1h',
  WAITLIST_OFFER: 'waitlist-offer',
  WAITLIST_EXPIRED: 'waitlist-expired',
  WELCOME_MEMBER: 'welcome-member',
  MEMBERSHIP_RENEWAL: 'membership-renewal',
  MEMBERSHIP_CANCELLATION: 'membership-cancellation',
  MEMBERSHIP_PAUSED: 'membership-paused',
  PAYMENT_FAILED: 'payment-failed',
  WEEKLY_DIGEST: 'weekly-digest',
} as const;

export type TemplateId = (typeof TEMPLATE_IDS)[keyof typeof TEMPLATE_IDS];
