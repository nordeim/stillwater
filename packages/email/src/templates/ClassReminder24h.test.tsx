// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { ClassReminder24h } from './ClassReminder24h';

afterEach(() => {});

describe('ClassReminder24h (EMAIL-009)', () => {
  const defaultProps = {
    memberName: 'Jane Doe',
    className: 'Vinyasa Flow',
    sessionDate: 'Tomorrow at 10:00 AM',
    instructor: 'Mei Tanaka',
    studioAddress: '123 SE Division Street, Portland, OR',
  };

  it('renders with EmailLayout wrapper', () => {
    const markup = renderToStaticMarkup(
      <ClassReminder24h {...defaultProps} />,
    );
    expect(markup).toContain('Stillwater Yoga Studio');
    expect(markup).toContain('unsubscribe');
  });

  it('contains class details and studio address', () => {
    const markup = renderToStaticMarkup(
      <ClassReminder24h {...defaultProps} />,
    );
    expect(markup).toContain('Jane Doe');
    expect(markup).toContain('Vinyasa Flow');
    expect(markup).toContain('Tomorrow at 10:00 AM');
    expect(markup).toContain('Mei Tanaka');
    expect(markup).toContain('123 SE Division Street');
  });

  it('contains what to bring section', () => {
    const markup = renderToStaticMarkup(
      <ClassReminder24h {...defaultProps} />,
    );
    expect(markup.toLowerCase()).toContain('bring');
  });

  it('uses safe hex colors, not CSS variables', () => {
    const markup = renderToStaticMarkup(
      <ClassReminder24h {...defaultProps} />,
    );
    expect(markup).not.toContain('var(');
  });
});
