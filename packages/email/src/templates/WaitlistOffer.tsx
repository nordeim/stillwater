/**
 * F8-18 — WaitlistOffer email template
 *
 * Trigger: Spot opens for waitlisted member (waitlist-promotion job)
 * Subject: "A spot opened! Claim your place in {class}"
 *
 * Per MEP F8-18: Bold call-out "Offer expires in 2 hours";
 * CTA: "Claim my spot" → /book/[sessionId]?claim=true
 *
 * Source: MEP F8-18, PAD §16.1.
 */

import { Text, Heading, Hr } from 'react-email';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface WaitlistOfferProps {
  memberName: string;
  className: string;
  sessionDate: string;
  expiresAt: string;
  claimUrl: string;
}

export function WaitlistOffer({
  memberName,
  className,
  sessionDate,
  expiresAt,
  claimUrl,
}: WaitlistOfferProps) {
  return (
    <EmailLayout
      previewText={`A spot opened! Claim your place in ${className}`}
    >
      <Heading style={headingStyle}>A spot opened.</Heading>
      <Text style={textStyle}>Hi {memberName},</Text>
      <Text style={textStyle}>
        Good news! A spot just opened up in:
      </Text>
      <Text style={detailStyle}>
        <strong>{className}</strong>
        <br />
        {sessionDate}
      </Text>
      <Text style={urgentStyle}>
        ⏰ Offer expires {expiresAt}. Claim your spot now or it will be
        offered to the next person on the waitlist.
      </Text>
      <Hr style={hrStyle} />
      <Text style={textStyle}>
        <EmailButton href={claimUrl} variant="primary">
          Claim my spot
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

const detailStyle: React.CSSProperties = {
  fontSize: '16px',
  lineHeight: '1.65',
  color: '#1C1915',
  margin: '0 0 24px 0',
  padding: '16px',
  backgroundColor: '#F7EDE8',
};

const urgentStyle: React.CSSProperties = {
  fontSize: '16px',
  lineHeight: '1.65',
  color: '#9E5E44',
  margin: '0 0 16px 0',
  fontWeight: 500,
};

const hrStyle: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid #D4CFC9',
  margin: '24px 0',
};
