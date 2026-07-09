/**
 * F8-16 — ClassReminder24h email template
 *
 * Trigger: 24 hours before session start (scheduled via triggerAfter)
 * Subject: "Tomorrow: {class} at {time}"
 *
 * Per MEP F8-16: Includes studio address + what to bring.
 *
 * Source: MEP F8-16, PAD §16.1.
 */

import { Text, Heading, Hr } from 'react-email';
import { EmailLayout } from '../components/EmailLayout';

export interface ClassReminder24hProps {
  memberName: string;
  className: string;
  sessionDate: string;
  instructor: string;
  studioAddress: string;
}

export function ClassReminder24h({
  memberName,
  className,
  sessionDate,
  instructor,
  studioAddress,
}: ClassReminder24hProps) {
  return (
    <EmailLayout previewText={`Tomorrow: ${className} at ${sessionDate}`}>
      <Heading style={headingStyle}>See you tomorrow.</Heading>
      <Text style={textStyle}>Hi {memberName},</Text>
      <Text style={textStyle}>
        This is a friendly reminder for your upcoming class:
      </Text>
      <Text style={detailStyle}>
        <strong>{className}</strong>
        <br />
        {sessionDate}
        <br />
        with {instructor}
      </Text>
      <Hr style={hrStyle} />
      <Text style={sectionHeadingStyle}>Where</Text>
      <Text style={textStyle}>{studioAddress}</Text>
      <Text style={sectionHeadingStyle}>What to bring</Text>
      <Text style={textStyle}>
        • A yoga mat (or rent one for $2)
        <br />
        • Water bottle
        <br />
        • Comfortable clothing you can move in
        <br />
        • Arrive 10 minutes early to settle in
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

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: '#8C7B6E',
  margin: '24px 0 8px 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.1em',
};

const hrStyle: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid #D4CFC9',
  margin: '24px 0',
};
