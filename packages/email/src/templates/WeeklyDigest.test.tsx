// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { WeeklyDigest } from './WeeklyDigest';

afterEach(() => {});

describe('WeeklyDigest (EMAIL-018)', () => {
  const defaultProps = {
    memberName: 'Jane Doe',
    upcomingClasses: [
      { className: 'Vinyasa Flow', sessionDate: 'Mon 10:00 AM' },
      { className: 'Yin Yoga', sessionDate: 'Wed 7:00 PM' },
      { className: 'Hatha', sessionDate: 'Sat 9:00 AM' },
    ],
    announcements: [
      { title: 'New class: Restorative Yoga', body: 'Starting next week' },
      { title: 'Studio closure', body: 'July 4th holiday' },
    ],
  };

  it('renders with EmailLayout wrapper', () => {
    const markup = renderToStaticMarkup(
      <WeeklyDigest {...defaultProps} />,
    );
    expect(markup).toContain('Stillwater Yoga Studio');
    expect(markup).toContain('unsubscribe');
  });

  it('contains member name', () => {
    const markup = renderToStaticMarkup(
      <WeeklyDigest {...defaultProps} />,
    );
    expect(markup).toContain('Jane Doe');
  });

  it('lists upcoming classes', () => {
    const markup = renderToStaticMarkup(
      <WeeklyDigest {...defaultProps} />,
    );
    expect(markup).toContain('Vinyasa Flow');
    expect(markup).toContain('Yin Yoga');
    expect(markup).toContain('Hatha');
    expect(markup).toContain('Mon 10:00 AM');
  });

  it('lists announcements', () => {
    const markup = renderToStaticMarkup(
      <WeeklyDigest {...defaultProps} />,
    );
    expect(markup).toContain('Restorative Yoga');
    expect(markup).toContain('Studio closure');
  });

  it('contains View full schedule CTA', () => {
    const markup = renderToStaticMarkup(
      <WeeklyDigest {...defaultProps} />,
    );
    expect(markup).toContain('schedule');
  });

  it('uses safe hex colors, not CSS variables', () => {
    const markup = renderToStaticMarkup(
      <WeeklyDigest {...defaultProps} />,
    );
    expect(markup).not.toContain('var(');
  });
});
