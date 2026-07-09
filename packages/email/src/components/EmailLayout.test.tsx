// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';

import { EmailLayout } from './EmailLayout';

afterEach(() => cleanup());

describe('EmailLayout (EMAIL-001)', () => {
  it('renders children inside a 600px max-width container', () => {
    const markup = renderToStaticMarkup(
      <EmailLayout>
        <p>Test content</p>
      </EmailLayout>,
    );
    // The Container component renders with width 600 in the output
    expect(markup).toContain('600');
  });

  it('includes CAN-SPAM footer with studio address + unsubscribe link', () => {
    const markup = renderToStaticMarkup(
      <EmailLayout>
        <p>Content</p>
      </EmailLayout>,
    );
    expect(markup).toContain('Stillwater Yoga Studio');
    expect(markup).toContain('unsubscribe');
    expect(markup).toContain('Portland');
  });

  it('uses safe hex colors, not CSS variables', () => {
    const markup = renderToStaticMarkup(
      <EmailLayout>
        <p>Content</p>
      </EmailLayout>,
    );
    // Should contain hex colors from the Stillwater token set
    // stone-900 #1C1915, sand #F5F0E8, clay-400 #C4856A
    expect(markup).toContain('#');
    // Should NOT contain CSS var() — email clients don't support them
    expect(markup).not.toContain('var(');
  });

  it('sets lang="en" on the html element', () => {
    const markup = renderToStaticMarkup(
      <EmailLayout>
        <p>Content</p>
      </EmailLayout>,
    );
    expect(markup).toContain('lang="en"');
  });
});
