// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { WelcomeMember } from './WelcomeMember';

afterEach(() => {});

describe('WelcomeMember (EMAIL-013)', () => {
  const defaultProps = {
    memberName: 'Jane Doe',
    studioAddress: '123 SE Division Street, Portland, OR',
    studioHours: 'Mon-Fri 6am-9pm, Sat-Sun 7am-6pm',
  };

  it('renders with EmailLayout wrapper', () => {
    const markup = renderToStaticMarkup(
      <WelcomeMember {...defaultProps} />,
    );
    expect(markup).toContain('Stillwater Yoga Studio');
    expect(markup).toContain('unsubscribe');
  });

  it('contains member name', () => {
    const markup = renderToStaticMarkup(
      <WelcomeMember {...defaultProps} />,
    );
    expect(markup).toContain('Jane Doe');
  });

  it('contains studio address and hours', () => {
    const markup = renderToStaticMarkup(
      <WelcomeMember {...defaultProps} />,
    );
    expect(markup).toContain('123 SE Division Street');
    expect(markup).toContain('Mon-Fri 6am-9pm');
  });

  it('uses safe hex colors, not CSS variables', () => {
    const markup = renderToStaticMarkup(
      <WelcomeMember {...defaultProps} />,
    );
    expect(markup).not.toContain('var(');
  });
});
