// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { Footer } from './Footer';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe('Footer', () => {
  it('renders copyright with current year', () => {
    render(<Footer />);
    const year = new Date().getFullYear();
    const matches = screen.getAllByText(new RegExp(String(year)));
    expect(matches.length).toBeGreaterThan(0);
  });

  it('renders studio address containing Portland', () => {
    render(<Footer />);
    const matches = screen.getAllByText(/portland/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  // V14-5 fix: Updated from (Instagram, Facebook) to (Instagram, YouTube)
  // to match the mockup's social platform choice.
  it('renders social links (Instagram, YouTube)', () => {
    render(<Footer />);
    const instagramLinks = screen.getAllByRole('link', { name: /instagram/i });
    expect(instagramLinks.length).toBeGreaterThan(0);

    const youtubeLinks = screen.getAllByRole('link', { name: /youtube/i });
    expect(youtubeLinks.length).toBeGreaterThan(0);
  });

  it('renders navigation links with correct hrefs', () => {
    render(<Footer />);
    const allLinks = screen.getAllByRole('link');
    const hrefs = allLinks.map(a => a.getAttribute('href'));
    expect(hrefs).toContain('/schedule');
    expect(hrefs).toContain('/about');
  });
});
