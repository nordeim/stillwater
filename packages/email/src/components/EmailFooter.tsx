/**
 * F8-28 — EmailFooter: CAN-SPAM compliant footer
 *
 * Per PAD §16.2:
 * - Studio physical address (CAN-SPAM requirement)
 * - Unsubscribe link (powered by Resend suppression list)
 * - Copyright notice
 * - Safe hex colors, NOT CSS variables
 *
 * Source: MEP F8-28, PAD §16.2, CAN-SPAM Act §7703.
 */

import { Section, Text, Link } from 'react-email';

const COLORS = {
  stone400: '#8C7B6E',
  stone700: '#3D3832',
  sandWarm: '#EDE5D8',
} as const;

const STUDIO_ADDRESS = {
  line1: '123 SE Division Street',
  city: 'Portland',
  state: 'OR',
  zip: '97202',
} as const;

const STUDIO_NAME = 'Stillwater Yoga Studio';

export function EmailFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <Section style={footerStyle}>
      <Text style={addressStyle}>
        {STUDIO_NAME}
        <br />
        {STUDIO_ADDRESS.line1}
        <br />
        {STUDIO_ADDRESS.city}, {STUDIO_ADDRESS.state} {STUDIO_ADDRESS.zip}
      </Text>
      <Text style={unsubscribeStyle}>
        <Link
          href="{{{unsubscribe_url}}}"
          style={linkStyle}
          data-unsubscribe="true"
        >
          Unsubscribe
        </Link>{' '}
        from Stillwater emails.
      </Text>
      <Text style={copyrightStyle}>
        © {currentYear} {STUDIO_NAME} LLC. All rights reserved.
      </Text>
    </Section>
  );
}

const footerStyle: React.CSSProperties = {
  backgroundColor: COLORS.sandWarm,
  borderTop: `1px solid ${COLORS.stone400}`,
  marginTop: '32px',
  padding: '24px 0 0 0',
  fontSize: '13px',
  lineHeight: '1.4',
  color: COLORS.stone400,
};

const addressStyle: React.CSSProperties = {
  margin: '0 0 12px 0',
  color: COLORS.stone700,
};

const unsubscribeStyle: React.CSSProperties = {
  margin: '0 0 12px 0',
};

const linkStyle: React.CSSProperties = {
  color: COLORS.stone700,
  textDecoration: 'underline',
};

const copyrightStyle: React.CSSProperties = {
  margin: '0',
  fontSize: '12px',
  color: COLORS.stone400,
};
