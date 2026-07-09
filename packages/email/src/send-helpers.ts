/**
 * Email wrapper functions for Trigger.dev workers
 *
 * Per ADR-010 (Accepted 2026-07-09): Workers MUST use Resend Native
 * Templates (sendEmailNative) — NOT local JSX rendering (sendEmail).
 * This avoids the 1.8MB React Email v6 bundle in worker cold starts.
 *
 * These wrapper functions provide type-safe signatures for each email
 * template. They:
 *   1. Accept typed props (matching the React Email template props)
 *   2. Format the subject line
 *   3. Call sendEmailNative() with the correct template ID + variables
 *
 * Workers import these functions from @stillwater/email — NO React Email
 * bundle is pulled into the worker.
 *
 * Source: ADR-010, PAD §16.1, MEP F8-29.
 */

import { sendEmailNative } from './send';
import { TEMPLATE_IDS } from './template-ids';

// ─── Booking emails ──────────────────────────────────────────────────────────

export async function sendBookingConfirmation(opts: {
  to: string;
  memberName: string;
  className: string;
  sessionDate: string;
  instructor: string;
  sessionId: string;
}): Promise<void | null> {
  return sendEmailNative(
    TEMPLATE_IDS.BOOKING_CONFIRMATION,
    {
      memberName: opts.memberName,
      className: opts.className,
      sessionDate: opts.sessionDate,
      instructor: opts.instructor,
      sessionId: opts.sessionId,
    },
    {
      to: opts.to,
      subject: `You're booked: ${opts.className} on ${opts.sessionDate}`,
    },
  );
}

export async function sendBookingCancellation(opts: {
  to: string;
  memberName: string;
  className: string;
  sessionDate: string;
}): Promise<void | null> {
  return sendEmailNative(
    TEMPLATE_IDS.BOOKING_CANCELLATION,
    {
      memberName: opts.memberName,
      className: opts.className,
      sessionDate: opts.sessionDate,
    },
    {
      to: opts.to,
      subject: `Booking cancelled — ${opts.className}`,
    },
  );
}

export async function sendClassCancellation(opts: {
  to: string;
  memberName: string;
  className: string;
  sessionDate: string;
  cancelReason: string;
}): Promise<void | null> {
  return sendEmailNative(
    TEMPLATE_IDS.CLASS_CANCELLATION,
    {
      memberName: opts.memberName,
      className: opts.className,
      sessionDate: opts.sessionDate,
      cancelReason: opts.cancelReason,
    },
    {
      to: opts.to,
      subject: `Class cancelled: ${opts.className} on ${opts.sessionDate}`,
    },
  );
}

// ─── Reminder emails ─────────────────────────────────────────────────────────

export async function sendClassReminder24h(opts: {
  to: string;
  memberName: string;
  className: string;
  sessionDate: string;
  instructor: string;
  studioAddress: string;
}): Promise<void | null> {
  return sendEmailNative(
    TEMPLATE_IDS.CLASS_REMINDER_24H,
    {
      memberName: opts.memberName,
      className: opts.className,
      sessionDate: opts.sessionDate,
      instructor: opts.instructor,
      studioAddress: opts.studioAddress,
    },
    {
      to: opts.to,
      subject: `Tomorrow: ${opts.className} at ${opts.sessionDate}`,
    },
  );
}

export async function sendClassReminder1h(opts: {
  to: string;
  memberName: string;
  className: string;
  sessionTime: string;
  instructor: string;
}): Promise<void | null> {
  return sendEmailNative(
    TEMPLATE_IDS.CLASS_REMINDER_1H,
    {
      memberName: opts.memberName,
      className: opts.className,
      sessionTime: opts.sessionTime,
      instructor: opts.instructor,
    },
    {
      to: opts.to,
      subject: `Starting soon: ${opts.className} at ${opts.sessionTime}`,
    },
  );
}

// ─── Waitlist emails ─────────────────────────────────────────────────────────

export async function sendWaitlistOffer(opts: {
  to: string;
  memberName: string;
  className: string;
  sessionDate: string;
  expiresAt: string;
  claimUrl: string;
}): Promise<void | null> {
  return sendEmailNative(
    TEMPLATE_IDS.WAITLIST_OFFER,
    {
      memberName: opts.memberName,
      className: opts.className,
      sessionDate: opts.sessionDate,
      expiresAt: opts.expiresAt,
      claimUrl: opts.claimUrl,
    },
    {
      to: opts.to,
      subject: `A spot opened! Claim your place in ${opts.className}`,
    },
  );
}

export async function sendWaitlistExpired(opts: {
  to: string;
  memberName: string;
  className: string;
}): Promise<void | null> {
  return sendEmailNative(
    TEMPLATE_IDS.WAITLIST_EXPIRED,
    {
      memberName: opts.memberName,
      className: opts.className,
    },
    {
      to: opts.to,
      subject: 'Your spot offer has expired',
    },
  );
}

// ─── Membership emails ───────────────────────────────────────────────────────

export async function sendWelcomeMember(opts: {
  to: string;
  memberName: string;
  studioAddress: string;
  studioHours: string;
}): Promise<void | null> {
  return sendEmailNative(
    TEMPLATE_IDS.WELCOME_MEMBER,
    {
      memberName: opts.memberName,
      studioAddress: opts.studioAddress,
      studioHours: opts.studioHours,
    },
    {
      to: opts.to,
      subject: `Welcome to Stillwater, ${opts.memberName}`,
    },
  );
}

export async function sendMembershipRenewal(opts: {
  to: string;
  memberName: string;
  renewalDate: string;
  planName: string;
  portalUrl: string;
}): Promise<void | null> {
  return sendEmailNative(
    TEMPLATE_IDS.MEMBERSHIP_RENEWAL,
    {
      memberName: opts.memberName,
      renewalDate: opts.renewalDate,
      planName: opts.planName,
      portalUrl: opts.portalUrl,
    },
    {
      to: opts.to,
      subject: `Your membership renews on ${opts.renewalDate}`,
    },
  );
}

export async function sendMembershipCancellation(opts: {
  to: string;
  memberName: string;
  accessUntilDate: string;
}): Promise<void | null> {
  return sendEmailNative(
    TEMPLATE_IDS.MEMBERSHIP_CANCELLATION,
    {
      memberName: opts.memberName,
      accessUntilDate: opts.accessUntilDate,
    },
    {
      to: opts.to,
      subject: 'Your membership has been cancelled',
    },
  );
}

export async function sendMembershipPaused(opts: {
  to: string;
  memberName: string;
  resumeDate: string;
}): Promise<void | null> {
  return sendEmailNative(
    TEMPLATE_IDS.MEMBERSHIP_PAUSED,
    {
      memberName: opts.memberName,
      resumeDate: opts.resumeDate,
    },
    {
      to: opts.to,
      subject: `Your membership is paused until ${opts.resumeDate}`,
    },
  );
}

// ─── Payment emails ──────────────────────────────────────────────────────────

export async function sendPaymentFailed(opts: {
  to: string;
  memberName: string;
  portalUrl: string;
}): Promise<void | null> {
  return sendEmailNative(
    TEMPLATE_IDS.PAYMENT_FAILED,
    {
      memberName: opts.memberName,
      portalUrl: opts.portalUrl,
    },
    {
      to: opts.to,
      subject: 'Action required: Payment failed',
    },
  );
}

// ─── Digest emails ───────────────────────────────────────────────────────────

export async function sendWeeklyDigest(opts: {
  to: string;
  memberName: string;
  upcomingClasses: Array<{ className: string; sessionDate: string }>;
  announcements: Array<{ title: string; body: string }>;
}): Promise<void | null> {
  return sendEmailNative(
    TEMPLATE_IDS.WEEKLY_DIGEST,
    {
      memberName: opts.memberName,
      upcomingClasses: opts.upcomingClasses,
      announcements: opts.announcements,
    },
    {
      to: opts.to,
      subject: 'Your week at Stillwater ✦',
    },
  );
}
