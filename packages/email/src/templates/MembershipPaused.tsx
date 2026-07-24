/**
 * F8-23 — MembershipPaused email template
 *
 * Trigger: Subscription paused (memberships.pause mutation)
 * Subject: "Your membership is paused until {date}"
 *
 * Per MEP F8-23: Includes "Resume now" CTA.
 * Per ADR-010: Sent synchronously from tRPC procedure via sendEmail().
 *
 * Source: MEP F8-23, PAD §16.1, ADR-010.
 */

import { Text, Heading, Hr } from 'react-email';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';
import { SITE } from '@stillwater/config/site';

export interface MembershipPausedProps {
  memberName: string;
  resumeDate: string;
}

export function MembershipPaused({
  memberName,
  resumeDate,
}: MembershipPausedProps) {
  const dashboardUrl = `${SITE.url}/dashboard`;

  return (
    <EmailLayout
      previewText={`Your membership is paused until ${resumeDate}`}
    >
      <Heading style={headingStyle}>Membership paused.</Heading>
      <Text style={textStyle}>Hi {memberName},</Text>
      <Text style={textStyle}>
        Your membership has been paused. It will automatically resume on{' '}
        <strong>{resumeDate}</strong>.
      </Text>
      <Text style={textStyle}>
        While your membership is paused, you won't be able to book classes
        or use your credits. You can resume at any time.
      </Text>
      <Hr style={hrStyle} />
      <Text style={textStyle}>
        <EmailButton href={dashboardUrl} variant="primary">
          Resume now
        </EmailButton>
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

const hrStyle: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid #D4CFC9',
  margin: '24px 0',
};
