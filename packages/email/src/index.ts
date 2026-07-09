/**
 * F8-30 — @stillwater/email barrel export
 *
 * Re-exports all public APIs from the email package.
 * Replaces the Phase 0 placeholder.
 *
 * Per ADR-010: Workers import sendEmailNative + TEMPLATE_IDS only (no
 * React Email bundle). Server Components import sendEmail + template
 * components for local JSX rendering.
 *
 * Source: MEP F8-30, PAD §16.1, ADR-010.
 */

// Send helpers (dual-path per ADR-010)
export { sendEmail, sendEmailNative } from './send';

// Worker wrapper functions (use Resend Native Templates per ADR-010)
export {
  sendBookingConfirmation,
  sendBookingCancellation,
  sendClassCancellation,
  sendClassReminder24h,
  sendClassReminder1h,
  sendWaitlistOffer,
  sendWaitlistExpired,
  sendWelcomeMember,
  sendMembershipRenewal,
  sendMembershipCancellation,
  sendMembershipPaused,
  sendPaymentFailed,
  sendWeeklyDigest,
} from './send-helpers';

// Template ID constants (for Resend Native Templates)
export { TEMPLATE_IDS } from './template-ids';
export type { TemplateId } from './template-ids';

// Shared email components (for local JSX rendering in Server Components)
export { EmailLayout } from './components/EmailLayout';
export type { EmailLayoutProps } from './components/EmailLayout';
export { EmailButton } from './components/EmailButton';
export type { EmailButtonProps } from './components/EmailButton';
export { EmailFooter } from './components/EmailFooter';

// Email templates (for local JSX rendering in Server Components)
// Workers do NOT import these — they use TEMPLATE_IDS + sendEmailNative
export { BookingConfirmation } from './templates/BookingConfirmation';
export type { BookingConfirmationProps } from './templates/BookingConfirmation';
export { BookingCancellation } from './templates/BookingCancellation';
export type { BookingCancellationProps } from './templates/BookingCancellation';
export { ClassCancellation } from './templates/ClassCancellation';
export type { ClassCancellationProps } from './templates/ClassCancellation';
export { ClassReminder24h } from './templates/ClassReminder24h';
export type { ClassReminder24hProps } from './templates/ClassReminder24h';
export { ClassReminder1h } from './templates/ClassReminder1h';
export type { ClassReminder1hProps } from './templates/ClassReminder1h';
export { WaitlistOffer } from './templates/WaitlistOffer';
export type { WaitlistOfferProps } from './templates/WaitlistOffer';
export { WaitlistExpired } from './templates/WaitlistExpired';
export type { WaitlistExpiredProps } from './templates/WaitlistExpired';
export { WelcomeMember } from './templates/WelcomeMember';
export type { WelcomeMemberProps } from './templates/WelcomeMember';
export { MembershipRenewal } from './templates/MembershipRenewal';
export type { MembershipRenewalProps } from './templates/MembershipRenewal';
export { MembershipCancellation } from './templates/MembershipCancellation';
export type { MembershipCancellationProps } from './templates/MembershipCancellation';
export { MembershipPaused } from './templates/MembershipPaused';
export type { MembershipPausedProps } from './templates/MembershipPaused';
export { PaymentFailed } from './templates/PaymentFailed';
export type { PaymentFailedProps } from './templates/PaymentFailed';
export { WeeklyDigest } from './templates/WeeklyDigest';
export type { WeeklyDigestProps } from './templates/WeeklyDigest';
