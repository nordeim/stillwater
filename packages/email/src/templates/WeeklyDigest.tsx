/**
 * F8-25 — WeeklyDigest email template
 *
 * Trigger: Cron Sunday 09:00 PT (weekly-digest job)
 * Subject: "Your week at Stillwater ✦"
 *
 * Per MEP F8-25: Lists upcoming classes (next 3) + studio announcements.
 * Per PAD §16.1: Subject uses ✦ (U+2726 BLACK FOUR POINTED STAR).
 *
 * Source: MEP F8-25, PAD §16.1.
 */

import { Text, Heading, Hr, Section } from 'react-email';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';
import { SITE } from '@stillwater/config/site';

export interface WeeklyDigestProps {
  memberName: string;
  upcomingClasses: Array<{
    className: string;
    sessionDate: string;
  }>;
  announcements: Array<{
    title: string;
    body: string;
  }>;
}

export function WeeklyDigest({
  memberName,
  upcomingClasses,
  announcements,
}: WeeklyDigestProps) {
  const scheduleUrl = `${SITE.url}/schedule`;

  return (
    <EmailLayout previewText="Your week at Stillwater ✦">
      <Heading style={headingStyle}>Your week ahead.</Heading>
      <Text style={textStyle}>Hi {memberName},</Text>
      <Text style={textStyle}>
        Here's what's coming up at Stillwater this week.
      </Text>

      <Hr style={hrStyle} />

      <Text style={sectionHeadingStyle}>Upcoming classes</Text>
      <Section>
        {upcomingClasses.map((cls, index) => (
          <Text key={index} style={classItemStyle}>
            <strong>{cls.className}</strong>
            <br />
            <span style={dateStyle}>{cls.sessionDate}</span>
          </Text>
        ))}
      </Section>

      {announcements.length > 0 && (
        <>
          <Hr style={hrStyle} />
          <Text style={sectionHeadingStyle}>Studio announcements</Text>
          <Section>
            {announcements.map((ann, index) => (
              <Text key={index} style={announcementStyle}>
                <strong>{ann.title}</strong>
                <br />
                {ann.body}
              </Text>
            ))}
          </Section>
        </>
      )}

      <Hr style={hrStyle} />
      <Text style={textStyle}>
        <EmailButton href={scheduleUrl} variant="primary">
          View full schedule
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

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: '#8C7B6E',
  margin: '24px 0 8px 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.1em',
};

const classItemStyle: React.CSSProperties = {
  fontSize: '16px',
  lineHeight: '1.4',
  color: '#1C1915',
  margin: '0 0 12px 0',
  padding: '12px',
  backgroundColor: '#F7EDE8',
};

const dateStyle: React.CSSProperties = {
  color: '#8C7B6E',
  fontSize: '14px',
};

const announcementStyle: React.CSSProperties = {
  fontSize: '16px',
  lineHeight: '1.65',
  color: '#3D3832',
  margin: '0 0 12px 0',
};

const hrStyle: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid #D4CFC9',
  margin: '24px 0',
};
