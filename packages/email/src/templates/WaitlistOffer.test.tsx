// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { WaitlistOffer } from './WaitlistOffer';

afterEach(() => {});

describe('WaitlistOffer (EMAIL-011)', () => {
  const defaultProps = {
    memberName: 'Jane Doe',
    className: 'Vinyasa Flow',
    sessionDate: 'July 10, 2026 at 10:00 AM',
    expiresAt: 'in 2 hours',
    claimUrl: 'https://stillwater.studio/book/session-123?claim=true',
  };

  it('renders with EmailLayout wrapper', () => {
    const markup = renderToStaticMarkup(
      <WaitlistOffer {...defaultProps} />,
    );
    expect(markup).toContain('Stillwater Yoga Studio');
    expect(markup).toContain('unsubscribe');
  });

  it('contains class details and expiry', () => {
    const markup = renderToStaticMarkup(
      <WaitlistOffer {...defaultProps} />,
    );
    expect(markup).toContain('Jane Doe');
    expect(markup).toContain('Vinyasa Flow');
    expect(markup).toContain('July 10, 2026 at 10:00 AM');
    expect(markup).toContain('2 hours');
  });

  it('contains Claim my spot CTA link', () => {
    const markup = renderToStaticMarkup(
      <WaitlistOffer {...defaultProps} />,
    );
    expect(markup).toContain('Claim');
    expect(markup).toContain('claim=true');
  });

  it('uses safe hex colors, not CSS variables', () => {
    const markup = renderToStaticMarkup(
      <WaitlistOffer {...defaultProps} />,
    );
    expect(markup).not.toContain('var(');
  });
});
