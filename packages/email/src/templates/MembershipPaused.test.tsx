// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { MembershipPaused } from './MembershipPaused';

afterEach(() => {});

describe('MembershipPaused (EMAIL-016)', () => {
  const defaultProps = {
    memberName: 'Jane Doe',
    resumeDate: 'August 15, 2026',
  };

  it('renders with EmailLayout wrapper', () => {
    const markup = renderToStaticMarkup(
      <MembershipPaused {...defaultProps} />,
    );
    expect(markup).toContain('Stillwater Yoga Studio');
    expect(markup).toContain('unsubscribe');
  });

  it('contains member name and resume date', () => {
    const markup = renderToStaticMarkup(
      <MembershipPaused {...defaultProps} />,
    );
    expect(markup).toContain('Jane Doe');
    expect(markup).toContain('August 15, 2026');
  });

  it('contains Resume now CTA', () => {
    const markup = renderToStaticMarkup(
      <MembershipPaused {...defaultProps} />,
    );
    expect(markup).toContain('Resume');
  });

  it('uses safe hex colors, not CSS variables', () => {
    const markup = renderToStaticMarkup(
      <MembershipPaused {...defaultProps} />,
    );
    expect(markup).not.toContain('var(');
  });
});
