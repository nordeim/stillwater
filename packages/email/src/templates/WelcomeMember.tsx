/**
 * F8-20 — WelcomeMember email template
 *
 * Trigger: User account created (sent synchronously from Server Component)
 * Subject: "Welcome to Stillwater, {name}"
 *
 * Per MEP F8-20: Includes studio address, hours, what to expect.
 * Per ADR-010: Sent via sendEmail() (local JSX render) since it's
 * a Server Component — not a Trigger.dev worker.
 *
 * Source: MEP F8-20, PAD §16.1, ADR-010.
 */

import { Text, Heading, Hr } from 'react-email';
import { EmailLayout } from '../components/EmailLayout';

export interface WelcomeMemberProps {
  memberName: string;
  studioAddress: string;
  studioHours: string;
}

export function WelcomeMember({
  memberName,
  studioAddress,
  studioHours,
}: WelcomeMemberProps) {
  return (
    <EmailLayout previewText={`Welcome to Stillwater, ${memberName}`}>
      <Heading style={headingStyle}>Welcome to Stillwater.</Heading>
      <Text style={textStyle}>Hi {memberName},</Text>
      <Text style={textStyle}>
        We're so glad you're here. Stillwater is a space for mindful
        movement — a place to slow down, breathe, and return to yourself.
      </Text>
      <Hr style={hrStyle} />
      <Text style={sectionHeadingStyle}>Visit us</Text>
      <Text style={textStyle}>
        {studioAddress}
        <br />
        {studioHours}
      </Text>
      <Text style={sectionHeadingStyle}>What to expect</Text>
      <Text style={textStyle}>
        • Arrive 10 minutes before your first class
        <br />
        • We provide mats ($2 rental) and all props
        <br />
        • Wear comfortable clothing you can move in
        <br />
        • Our instructors will help you find the right class for your level
      </Text>
      <Hr style={hrStyle} />
      <Text style={textStyle}>
        Browse our schedule and book your first class:
      </Text>
      <Text style={textStyle}>
        <a href="https://stillwater.studio/schedule" style={linkStyle}>
          View schedule →
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

const linkStyle: React.CSSProperties = {
  color: '#9E5E44',
  textDecoration: 'underline',
};
