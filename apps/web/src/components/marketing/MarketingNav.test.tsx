// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { MarketingNav } from './MarketingNav';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe('MarketingNav', () => {
  it('renders the Stillwater wordmark', () => {
    render(<MarketingNav />);
    const wordmark = screen.getByText(/stillwater/i);
    expect(wordmark).toBeTruthy();
  });

  it('renders navigation links with correct hrefs', () => {
    render(<MarketingNav />);
    //getAllByRole since there are multiple links
    const allLinks = screen.getAllByRole('link');
    const hrefs = allLinks.map(a => a.getAttribute('href'));
    expect(hrefs).toContain('/schedule');
    expect(hrefs).toContain('/instructors');
    expect(hrefs).toContain('/pricing');
    expect(hrefs).toContain('/blog');
    expect(hrefs).toContain('/about');
  });

  it('renders a CTA link with "Book" text pointing to /schedule', () => {
    render(<MarketingNav />);
    // Find the CTA by its text content and verify href
    const allLinks = screen.getAllByRole('link');
    const cta = allLinks.find(link => link.textContent?.trim() === 'Book');
    expect(cta).toBeTruthy();
    expect(cta?.getAttribute('href')).toBe('/schedule');
  });

  it('renders a navigation element', () => {
    render(<MarketingNav />);
    // The nav element has role="navigation" and aria-label
    const navs = screen.getAllByRole('navigation');
    expect(navs.length).toBeGreaterThan(0);
  });
});
