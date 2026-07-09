// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { BookingCancellation } from './BookingCancellation';

afterEach(() => {});

describe('BookingCancellation (EMAIL-007)', () => {
  const defaultProps = {
    memberName: 'Jane Doe',
    className: 'Vinyasa Flow',
    sessionDate: 'July 10, 2026 at 10:00 AM',
  };

  it('renders with EmailLayout wrapper', () => {
    const markup = renderToStaticMarkup(
      <BookingCancellation {...defaultProps} />,
    );
    expect(markup).toContain('Stillwater Yoga Studio');
    expect(markup).toContain('unsubscribe');
  });

  it('contains class name and session date', () => {
    const markup = renderToStaticMarkup(
      <BookingCancellation {...defaultProps} />,
    );
    expect(markup).toContain('Jane Doe');
    expect(markup).toContain('Vinyasa Flow');
    expect(markup).toContain('July 10, 2026 at 10:00 AM');
  });

  it('contains Browse other classes CTA', () => {
    const markup = renderToStaticMarkup(
      <BookingCancellation {...defaultProps} />,
    );
    expect(markup).toContain('Browse');
    expect(markup).toContain('schedule');
  });

  it('uses safe hex colors, not CSS variables', () => {
    const markup = renderToStaticMarkup(
      <BookingCancellation {...defaultProps} />,
    );
    expect(markup).not.toContain('var(');
  });
});
