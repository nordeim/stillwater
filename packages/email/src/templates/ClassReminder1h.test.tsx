// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { ClassReminder1h } from './ClassReminder1h';

afterEach(() => {});

describe('ClassReminder1h (EMAIL-010)', () => {
  const defaultProps = {
    memberName: 'Jane Doe',
    className: 'Vinyasa Flow',
    sessionTime: 'in 1 hour',
    instructor: 'Mei Tanaka',
  };

  it('renders with EmailLayout wrapper', () => {
    const markup = renderToStaticMarkup(
      <ClassReminder1h {...defaultProps} />,
    );
    expect(markup).toContain('Stillwater Yoga Studio');
    expect(markup).toContain('unsubscribe');
  });

  it('contains class details', () => {
    const markup = renderToStaticMarkup(
      <ClassReminder1h {...defaultProps} />,
    );
    expect(markup).toContain('Jane Doe');
    expect(markup).toContain('Vinyasa Flow');
    expect(markup).toContain('in 1 hour');
    expect(markup).toContain('Mei Tanaka');
  });

  it('is shorter/focused on logistics', () => {
    const markup = renderToStaticMarkup(
      <ClassReminder1h {...defaultProps} />,
    );
    // Should NOT contain "what to bring" section (that's in 24h reminder)
    expect(markup.toLowerCase()).not.toContain('what to bring');
  });

  it('uses safe hex colors, not CSS variables', () => {
    const markup = renderToStaticMarkup(
      <ClassReminder1h {...defaultProps} />,
    );
    expect(markup).not.toContain('var(');
  });
});
