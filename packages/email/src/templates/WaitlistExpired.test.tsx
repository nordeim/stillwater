// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { WaitlistExpired } from './WaitlistExpired';

afterEach(() => {});

describe('WaitlistExpired (EMAIL-012)', () => {
  const defaultProps = {
    memberName: 'Jane Doe',
    className: 'Vinyasa Flow',
  };

  it('renders with EmailLayout wrapper', () => {
    const markup = renderToStaticMarkup(
      <WaitlistExpired {...defaultProps} />,
    );
    expect(markup).toContain('Stillwater Yoga Studio');
    expect(markup).toContain('unsubscribe');
  });

  it('contains member name and class name', () => {
    const markup = renderToStaticMarkup(
      <WaitlistExpired {...defaultProps} />,
    );
    expect(markup).toContain('Jane Doe');
    expect(markup).toContain('Vinyasa Flow');
  });

  it('contains Browse other classes CTA', () => {
    const markup = renderToStaticMarkup(
      <WaitlistExpired {...defaultProps} />,
    );
    expect(markup).toContain('Browse');
  });

  it('uses safe hex colors, not CSS variables', () => {
    const markup = renderToStaticMarkup(
      <WaitlistExpired {...defaultProps} />,
    );
    expect(markup).not.toContain('var(');
  });
});
