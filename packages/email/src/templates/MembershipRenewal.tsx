/**
 * F8-21 — MembershipRenewal email template
 *
 * Trigger: 3 days before subscription renews (membership-expiry-warn job)
 * Subject: "Your membership renews on {date}"
 *
 * Per MEP F8-21: Includes "Pause or cancel" link to customer portal.
 *
 * Source: MEP F8-21, PAD §16.1.
 */

import { Text, Heading, Hr } from 'react-email';
import { EmailLayout } from '../components/EmailLayout';

export interface MembershipRenewalProps {
  memberName: string;
  renewalDate: string;
  planName: string;
  portalUrl: string;
}

export function MembershipRenewal({
  memberName,
  renewalDate,
  planName,
  portalUrl,
}: MembershipRenewalProps) {
  return (
    <EmailLayout previewText={`Your membership renews on ${renewalDate}`}>
      <Heading style={headingStyle}>Membership renewal.</Heading>
      <Text style={textStyle}>Hi {memberName},</Text>
      <Text style={textStyle}>
        Your <strong>{planName}</strong> membership will automatically renew
        on <strong>{renewalDate}</strong>.
      </Text>
      <Text style={textStyle}>
        No action is needed — your membership will continue uninterrupted.
      </Text>
      <Hr style={hrStyle} />
      <Text style={textStyle}>
        Need to make changes? You can pause or cancel your membership at
        any time:
      </Text>
      <Text style={textStyle}>
        <a href={portalUrl} style={linkStyle}>
          Manage membership →
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

const hrStyle: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid #D4CFC9',
  margin: '24px 0',
};

const linkStyle: React.CSSProperties = {
  color: '#9E5E44',
  textDecoration: 'underline',
};
