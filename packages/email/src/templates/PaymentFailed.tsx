/**
 * F8-24 — PaymentFailed email template
 *
 * Trigger: invoice.payment_failed Stripe webhook (payment-failed-notify job)
 * Subject: "Action required: Payment failed"
 *
 * Per MEP F8-24: CTA: "Update payment method" → Stripe portal.
 *
 * Source: MEP F8-24, PAD §16.1.
 */

import { Text, Heading, Hr } from 'react-email';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface PaymentFailedProps {
  memberName: string;
  portalUrl: string;
}

export function PaymentFailed({
  memberName,
  portalUrl,
}: PaymentFailedProps) {
  return (
    <EmailLayout previewText="Action required: Payment failed">
      <Heading style={headingStyle}>Action required.</Heading>
      <Text style={textStyle}>Hi {memberName},</Text>
      <Text style={textStyle}>
        We were unable to process your most recent membership payment.
        This can happen when a card expires, has insufficient funds, or
        is declined by your bank.
      </Text>
      <Text style={urgentStyle}>
        Please update your payment method to avoid disruption to your
        membership.
      </Text>
      <Hr style={hrStyle} />
      <Text style={textStyle}>
        <EmailButton href={portalUrl} variant="primary">
          Update payment method
        </EmailButton>
      </Text>
      <Text style={textStyle}>
        If you have any questions, please contact the studio at{' '}
        <a href="mailto:hello@stillwater.studio" style={linkStyle}>
          hello@stillwater.studio
        </a>
        .
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

const linkStyle: React.CSSProperties = {
  color: '#9E5E44',
  textDecoration: 'underline',
};
