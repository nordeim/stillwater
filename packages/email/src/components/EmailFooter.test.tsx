// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';

import { EmailFooter } from './EmailFooter';

afterEach(() => cleanup());

describe('EmailFooter (EMAIL-003)', () => {
  it('includes studio physical address', () => {
    const { container } = render(<EmailFooter />);
    expect(container.textContent).toContain('Portland');
    expect(container.textContent).toContain('OR');
  });

  it('includes unsubscribe link', () => {
    const markup = renderToStaticMarkup(<EmailFooter />);
    expect(markup).toContain('unsubscribe');
    expect(markup).toContain('href');
  });

  it('includes copyright notice', () => {
    const { container } = render(<EmailFooter />);
    expect(container.textContent).toContain('Stillwater Yoga Studio');
    expect(container.textContent).toMatch(/©|copyright/i);
  });

  it('uses safe hex colors, not CSS variables', () => {
    const markup = renderToStaticMarkup(<EmailFooter />);
    expect(markup).not.toContain('var(');
  });
});
