// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { ClassCancellation } from './ClassCancellation';

afterEach(() => {});

describe('ClassCancellation (EMAIL-008)', () => {
  const defaultProps = {
    memberName: 'Jane Doe',
    className: 'Vinyasa Flow',
    sessionDate: 'July 10, 2026 at 10:00 AM',
    cancelReason: 'Instructor illness',
  };

  it('renders with EmailLayout wrapper', () => {
    const markup = renderToStaticMarkup(
      <ClassCancellation {...defaultProps} />,
    );
    expect(markup).toContain('Stillwater Yoga Studio');
    expect(markup).toContain('unsubscribe');
  });

  it('contains class name, date, and cancel reason', () => {
    const markup = renderToStaticMarkup(
      <ClassCancellation {...defaultProps} />,
    );
    expect(markup).toContain('Jane Doe');
    expect(markup).toContain('Vinyasa Flow');
    expect(markup).toContain('July 10, 2026 at 10:00 AM');
    expect(markup).toContain('Instructor illness');
  });

  it('mentions credit was returned', () => {
    const markup = renderToStaticMarkup(
      <ClassCancellation {...defaultProps} />,
    );
    expect(markup.toLowerCase()).toContain('credit');
    expect(markup.toLowerCase()).toContain('return');
  });

  it('uses safe hex colors, not CSS variables', () => {
    const markup = renderToStaticMarkup(
      <ClassCancellation {...defaultProps} />,
    );
    expect(markup).not.toContain('var(');
  });
});
