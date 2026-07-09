// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { BookingConfirmation } from './BookingConfirmation';

afterEach(() => {});

describe('BookingConfirmation (EMAIL-006)', () => {
  const defaultProps = {
    memberName: 'Jane Doe',
    className: 'Vinyasa Flow',
    sessionDate: 'July 10, 2026 at 10:00 AM',
    instructor: 'Mei Tanaka',
    sessionId: 'session-123',
  };

  it('renders with EmailLayout wrapper', () => {
    const markup = renderToStaticMarkup(
      <BookingConfirmation {...defaultProps} />,
    );
    // EmailLayout includes the CAN-SPAM footer
    expect(markup).toContain('Stillwater Yoga Studio');
    expect(markup).toContain('unsubscribe');
  });

  it('contains member name and class name in content', () => {
    const markup = renderToStaticMarkup(
      <BookingConfirmation {...defaultProps} />,
    );
    expect(markup).toContain('Jane Doe');
    expect(markup).toContain('Vinyasa Flow');
    expect(markup).toContain('Mei Tanaka');
    expect(markup).toContain('July 10, 2026 at 10:00 AM');
  });

  it('contains Cancel booking link', () => {
    const markup = renderToStaticMarkup(
      <BookingConfirmation {...defaultProps} />,
    );
    expect(markup.toLowerCase()).toContain('cancel');
    expect(markup).toContain('href');
  });

  it('uses safe hex colors, not CSS variables', () => {
    const markup = renderToStaticMarkup(
      <BookingConfirmation {...defaultProps} />,
    );
    expect(markup).not.toContain('var(');
  });
});
