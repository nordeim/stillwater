// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';

import { EmailButton } from './EmailButton';

afterEach(() => cleanup());

describe('EmailButton (EMAIL-002)', () => {
  it('renders as a link with the given href', () => {
    const { container } = render(
      <EmailButton href="https://stillwater.studio/book" variant="primary">
        Book Now
      </EmailButton>,
    );
    const link = container.querySelector('a');
    expect(link).toBeTruthy();
    expect(link?.getAttribute('href')).toBe('https://stillwater.studio/book');
    expect(link?.textContent).toBe('Book Now');
  });

  it('primary variant uses clay-400 background (safe hex)', () => {
    const markup = renderToStaticMarkup(
      <EmailButton href="https://example.com" variant="primary">
        Click
      </EmailButton>,
    );
    // clay-400 hex is #C4856A
    expect(markup).toContain('#C4856A');
    expect(markup).not.toContain('var(');
  });

  it('ghost variant uses transparent background with border', () => {
    const markup = renderToStaticMarkup(
      <EmailButton href="https://example.com" variant="ghost">
        Cancel
      </EmailButton>,
    );
    expect(markup).toContain('transparent');
    // Should have a border
    expect(markup.toLowerCase()).toContain('border');
  });

  it('has sharp corners (no border-radius) per Editorial Calm', () => {
    const markup = renderToStaticMarkup(
      <EmailButton href="https://example.com" variant="primary">
        Test
      </EmailButton>,
    );
    // Should NOT contain border-radius (Editorial Calm: --radius: 0)
    expect(markup.toLowerCase()).not.toContain('border-radius');
    expect(markup.toLowerCase()).not.toContain('rounded');
  });

  it('has padding 16px 32px per MEP F8-27', () => {
    const markup = renderToStaticMarkup(
      <EmailButton href="https://example.com" variant="primary">
        Test
      </EmailButton>,
    );
    expect(markup).toContain('16px');
    expect(markup).toContain('32px');
  });
});
