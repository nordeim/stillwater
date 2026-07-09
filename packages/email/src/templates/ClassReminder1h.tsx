/**
 * F8-17 — ClassReminder1h email template
 *
 * Trigger: 1 hour before session start (scheduled via triggerAfter)
 * Subject: "Starting soon: {class} at {time}"
 *
 * Per MEP F8-17: Shorter, focused on logistics (no "what to bring" section).
 *
 * Source: MEP F8-17, PAD §16.1.
 */

import { Text, Heading } from 'react-email';
import { EmailLayout } from '../components/EmailLayout';

export interface ClassReminder1hProps {
  memberName: string;
  className: string;
  sessionTime: string;
  instructor: string;
}

export function ClassReminder1h({
  memberName,
  className,
  sessionTime,
  instructor,
}: ClassReminder1hProps) {
  return (
    <EmailLayout previewText={`Starting soon: ${className} at ${sessionTime}`}>
      <Heading style={headingStyle}>Starting soon.</Heading>
      <Text style={textStyle}>Hi {memberName},</Text>
      <Text style={textStyle}>
        Your class <strong>{className}</strong> with {instructor} starts{' '}
        <strong>{sessionTime}</strong>.
      </Text>
      <Text style={textStyle}>
        Please arrive a few minutes early to settle in. We'll see you on
        the mat.
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
