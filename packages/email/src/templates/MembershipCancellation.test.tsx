// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { MembershipCancellation } from './MembershipCancellation';

afterEach(() => {});

describe('MembershipCancellation (EMAIL-015)', () => {
  const defaultProps = {
    memberName: 'Jane Doe',
    accessUntilDate: 'July 31, 2026',
  };

  it('renders with EmailLayout wrapper', () => {
    const markup = renderToStaticMarkup(
      <MembershipCancellation {...defaultProps} />,
    );
    expect(markup).toContain('Stillwater Yoga Studio');
    expect(markup).toContain('unsubscribe');
  });

  it('contains member name and access end date', () => {
    const markup = renderToStaticMarkup(
      <MembershipCancellation {...defaultProps} />,
    );
    expect(markup).toContain('Jane Doe');
    expect(markup).toContain('July 31, 2026');
  });

  it('explains access continues until period end', () => {
    const markup = renderToStaticMarkup(
      <MembershipCancellation {...defaultProps} />,
    );
    expect(markup.toLowerCase()).toContain('access');
    expect(markup.toLowerCase()).toContain('continue');
  });

  it('uses safe hex colors, not CSS variables', () => {
    const markup = renderToStaticMarkup(
      <MembershipCancellation {...defaultProps} />,
    );
    expect(markup).not.toContain('var(');
  });
});
