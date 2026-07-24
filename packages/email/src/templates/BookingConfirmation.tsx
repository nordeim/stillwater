/**
 * F8-13 — BookingConfirmation email template
 *
 * Trigger: Enrollment created (bookings.book mutation)
 * Subject: "You're booked: {class} on {date}"
 *
 * Per MEP F8-13: Contains "Cancel booking" link.
 * Per PAD §16.2: Uses safe hex colors, EmailLayout wrapper, 600px max width.
 *
 * Source: MEP F8-13, PAD §16.1.
 */

import { Text, Heading, Hr } from 'react-email';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';
import { SITE } from '@stillwater/config/site';

export interface BookingConfirmationProps {
  memberName: string;
  className: string;
  sessionDate: string;
  instructor: string;
  sessionId: string;
}

export function BookingConfirmation({
  memberName,
  className,
  sessionDate,
  instructor,
  sessionId,
}: BookingConfirmationProps) {
  const cancelUrl = `${SITE.url}/book/${sessionId}?cancel=true`;
  const calendarUrl = `${SITE.url}/book/${sessionId}?calendar=true`;

  return (
    <EmailLayout previewText={`You're booked: ${className} on ${sessionDate}`}>
      <Heading style={headingStyle}>You're booked.</Heading>
      <Text style={textStyle}>Hi {memberName},</Text>
      <Text style={textStyle}>
        Your spot is confirmed for:
      </Text>
      <Text style={detailStyle}>
        <strong>{className}</strong>
        <br />
        {sessionDate}
        <br />
        with {instructor}
      </Text>
      <Hr style={hrStyle} />
      <Text style={textStyle}>
        <EmailButton href={calendarUrl} variant="ghost">
          Add to calendar
        </EmailButton>
      </Text>
      <Text style={textStyle}>
        Need to cancel?{' '}
        <a href={cancelUrl} style={linkStyle}>
          Cancel booking
        </a>
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

const detailStyle: React.CSSProperties = {
  fontSize: '16px',
  lineHeight: '1.65',
  color: '#1C1915',
  margin: '0 0 24px 0',
  padding: '16px',
  backgroundColor: '#F7EDE8',
};

const hrStyle: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid #D4CFC9',
  margin: '24px 0',
};

const linkStyle: React.CSSProperties = {
  color: '#9E5E44',
  textDecoration: 'underline',
};
