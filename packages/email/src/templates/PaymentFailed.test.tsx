// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { PaymentFailed } from './PaymentFailed';

afterEach(() => {});

describe('PaymentFailed (EMAIL-017)', () => {
  const defaultProps = {
    memberName: 'Jane Doe',
    portalUrl: 'https://billing.stripe.com/p/session_456',
  };

  it('renders with EmailLayout wrapper', () => {
    const markup = renderToStaticMarkup(
      <PaymentFailed {...defaultProps} />,
    );
    expect(markup).toContain('Stillwater Yoga Studio');
    expect(markup).toContain('unsubscribe');
  });

  it('contains member name', () => {
    const markup = renderToStaticMarkup(
      <PaymentFailed {...defaultProps} />,
    );
    expect(markup).toContain('Jane Doe');
  });

  it('contains Update payment method CTA with portal link', () => {
    const markup = renderToStaticMarkup(
      <PaymentFailed {...defaultProps} />,
    );
    expect(markup).toContain('Update');
    expect(markup).toContain('payment');
    expect(markup).toContain('billing.stripe.com');
  });

  it('uses safe hex colors, not CSS variables', () => {
    const markup = renderToStaticMarkup(
      <PaymentFailed {...defaultProps} />,
    );
    expect(markup).not.toContain('var(');
  });
});
