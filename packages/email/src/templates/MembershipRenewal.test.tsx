// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { MembershipRenewal } from './MembershipRenewal';

afterEach(() => {});

describe('MembershipRenewal (EMAIL-014)', () => {
  const defaultProps = {
    memberName: 'Jane Doe',
    renewalDate: 'July 13, 2026',
    planName: 'Unlimited Monthly',
    portalUrl: 'https://billing.stripe.com/p/session_123',
  };

  it('renders with EmailLayout wrapper', () => {
    const markup = renderToStaticMarkup(
      <MembershipRenewal {...defaultProps} />,
    );
    expect(markup).toContain('Stillwater Yoga Studio');
    expect(markup).toContain('unsubscribe');
  });

  it('contains renewal date and plan name', () => {
    const markup = renderToStaticMarkup(
      <MembershipRenewal {...defaultProps} />,
    );
    expect(markup).toContain('Jane Doe');
    expect(markup).toContain('July 13, 2026');
    expect(markup).toContain('Unlimited Monthly');
  });

  it('contains pause or cancel link', () => {
    const markup = renderToStaticMarkup(
      <MembershipRenewal {...defaultProps} />,
    );
    expect(markup.toLowerCase()).toContain('pause');
    expect(markup.toLowerCase()).toContain('cancel');
    expect(markup).toContain('billing.stripe.com');
  });

  it('uses safe hex colors, not CSS variables', () => {
    const markup = renderToStaticMarkup(
      <MembershipRenewal {...defaultProps} />,
    );
    expect(markup).not.toContain('var(');
  });
});
