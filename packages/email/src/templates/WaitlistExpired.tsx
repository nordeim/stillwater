/**
 * F8-19 — WaitlistExpired email template
 *
 * Trigger: Waitlist offer window expires (waitlist-expiry job)
 * Subject: "Your spot offer has expired"
 *
 * Per MEP F8-19: CTA: "Browse other classes".
 *
 * Source: MEP F8-19, PAD §16.1.
 */

import { Text, Heading, Hr } from 'react-email';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface WaitlistExpiredProps {
  memberName: string;
  className: string;
}

export function WaitlistExpired({
  memberName,
  className,
}: WaitlistExpiredProps) {
  const scheduleUrl = 'https://stillwater.studio/schedule';

  return (
    <EmailLayout previewText="Your spot offer has expired">
      <Heading style={headingStyle}>Spot offer expired.</Heading>
      <Text style={textStyle}>Hi {memberName},</Text>
      <Text style={textStyle}>
        Your waitlist spot for <strong>{className}</strong> has expired.
        The offer was held for 2 hours, but it has now been passed to the
        next person on the waitlist.
      </Text>
      <Text style={textStyle}>
        Don't worry — there are plenty more classes on our schedule.
        Browse and book your next class today.
      </Text>
      <Hr style={hrStyle} />
      <Text style={textStyle}>
        <EmailButton href={scheduleUrl} variant="primary">
          Browse other classes
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
