/**
 * F8-22 — MembershipCancellation email template
 *
 * Trigger: Subscription cancelled (memberships.cancel mutation)
 * Subject: "Your membership has been cancelled"
 *
 * Per MEP F8-22: Explains access continues until period end.
 * Per ADR-010: Sent synchronously from tRPC procedure via sendEmail().
 *
 * Source: MEP F8-22, PAD §16.1, ADR-010.
 */

import { Text, Heading } from 'react-email';
import { EmailLayout } from '../components/EmailLayout';

export interface MembershipCancellationProps {
  memberName: string;
  accessUntilDate: string;
}

export function MembershipCancellation({
  memberName,
  accessUntilDate,
}: MembershipCancellationProps) {
  return (
    <EmailLayout previewText="Your membership has been cancelled">
      <Heading style={headingStyle}>Membership cancelled.</Heading>
      <Text style={textStyle}>Hi {memberName},</Text>
      <Text style={textStyle}>
        Your membership has been cancelled. We're sorry to see you go.
      </Text>
      <Text style={textStyle}>
        Your access will continue until{' '}
        <strong>{accessUntilDate}</strong>. You can still book and attend
        classes until then.
      </Text>
      <Text style={textStyle}>
        We hope to welcome you back to Stillwater in the future. Until
        then, take care and keep breathing.
      </Text>
    </EmailLayout>
  );
}

const headingStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 300,
  color: '#1C1915',
  margin: '0 0 24px 0',
  fontFamily: 'Georgia, "Times New Roman", serif',
};

const textStyle: React.CSSProperties = {
  fontSize: '16px',
  lineHeight: '1.65',
  color: '#3D3832',
  margin: '0 0 16px 0',
};
