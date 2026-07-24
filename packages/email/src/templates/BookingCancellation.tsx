/**
 * F8-14 — BookingCancellation email template
 *
 * Trigger: Enrollment cancelled by member (bookings.cancel mutation)
 * Subject: "Booking cancelled — {class}"
 *
 * Per MEP F8-14: Includes "Browse other classes" CTA.
 *
 * Source: MEP F8-14, PAD §16.1.
 */

import { Text, Heading, Hr } from 'react-email';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';
import { SITE } from '@stillwater/config/site';

export interface BookingCancellationProps {
  memberName: string;
  className: string;
  sessionDate: string;
}

export function BookingCancellation({
  memberName,
  className,
  sessionDate,
}: BookingCancellationProps) {
  const scheduleUrl = `${SITE.url}/schedule`;

  return (
    <EmailLayout previewText={`Booking cancelled — ${className}`}>
      <Heading style={headingStyle}>Booking cancelled.</Heading>
      <Text style={textStyle}>Hi {memberName},</Text>
      <Text style={textStyle}>
        Your booking for <strong>{className}</strong> on{' '}
        <strong>{sessionDate}</strong> has been cancelled.
      </Text>
      <Text style={textStyle}>
        We hope to see you again soon. Browse our schedule to find
        another class that works for you.
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
