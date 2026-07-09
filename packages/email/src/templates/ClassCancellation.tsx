/**
 * F8-15 — ClassCancellation email template
 *
 * Trigger: Session cancelled by staff (class-cancellation-notify job)
 * Subject: "Class cancelled: {class} on {date}"
 *
 * Per MEP F8-15: Explains credit was returned; offers alternative classes.
 *
 * Source: MEP F8-15, PAD §16.1.
 */

import { Text, Heading, Hr } from 'react-email';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface ClassCancellationProps {
  memberName: string;
  className: string;
  sessionDate: string;
  cancelReason: string;
}

export function ClassCancellation({
  memberName,
  className,
  sessionDate,
  cancelReason,
}: ClassCancellationProps) {
  const scheduleUrl = 'https://stillwater.studio/schedule';

  return (
    <EmailLayout previewText={`Class cancelled: ${className} on ${sessionDate}`}>
      <Heading style={headingStyle}>Class cancelled.</Heading>
      <Text style={textStyle}>Hi {memberName},</Text>
      <Text style={textStyle}>
        We're sorry to let you know that <strong>{className}</strong> on{' '}
        <strong>{sessionDate}</strong> has been cancelled.
      </Text>
      <Text style={textStyle}>
        <strong>Reason:</strong> {cancelReason}
      </Text>
      <Text style={textStyle}>
        Your class credit has been returned to your account — no action
        needed on your part. You can use it to book another class at any time.
      </Text>
      <Hr style={hrStyle} />
      <Text style={textStyle}>
        We apologise for the inconvenience. Browse our schedule to find
        an alternative class:
      </Text>
      <Text style={textStyle}>
        <EmailButton href={scheduleUrl} variant="primary">
          Browse schedule
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
