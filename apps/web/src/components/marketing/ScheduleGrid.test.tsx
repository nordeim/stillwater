// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach , vi } from 'vitest';

import { ScheduleGrid } from './ScheduleGrid';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));


interface ScheduleSession {
  id: string;
  startsAt: Date;
  class: { title: string };
  instructor: { slug: string };
  room: { name: string };
}

describe('ScheduleGrid', () => {
  const mockSessions: ScheduleSession[] = [
    {
      id: '00000000-0000-4000-8000-000000000001',
      startsAt: new Date('2026-07-10T10:00:00Z'),
      class: { title: 'Vinyasa Flow' },
      instructor: { slug: 'jane-doe' },
      room: { name: 'Studio A' },
    },
    {
      id: '00000000-0000-4000-8000-000000000002',
      startsAt: new Date('2026-07-10T12:00:00Z'),
      class: { title: 'Yin Yoga' },
      instructor: { slug: 'james-harlow' },
      room: { name: 'Studio B' },
    },
  ];

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders session cards', () => {
    render(<ScheduleGrid sessions={mockSessions} />);
    expect(screen.getByText(/vinyasa flow/i)).toBeTruthy();
    expect(screen.getByText(/yin yoga/i)).toBeTruthy();
  });

  it('renders "Book" link for each session', () => {
    render(<ScheduleGrid sessions={mockSessions} />);
    const bookLinks = screen.getAllByRole('link', { name: /book/i });
    expect(bookLinks).toHaveLength(2);
  });

  it('links to /book/[sessionId]', () => {
    render(<ScheduleGrid sessions={mockSessions} />);
    const bookLinks = screen.getAllByRole('link', { name: /book/i });
    expect(bookLinks[0]!.getAttribute('href')).toBe('/book/00000000-0000-4000-8000-000000000001');
    expect(bookLinks[1]!.getAttribute('href')).toBe('/book/00000000-0000-4000-8000-000000000002');
  });

  it('renders instructor name (slug converted to display name)', () => {
    render(<ScheduleGrid sessions={mockSessions} />);
    // ScheduleGrid converts slug "jane-doe" to "jane doe" for display
    expect(screen.getByText(/jane doe/i)).toBeTruthy();
  });

  it('renders room name', () => {
    render(<ScheduleGrid sessions={mockSessions} />);
    expect(screen.getByText(/studio a/i)).toBeTruthy();
  });

  it('renders empty state when no sessions', () => {
    render(<ScheduleGrid sessions={[]} />);
    expect(screen.getByText(/no classes/i)).toBeTruthy();
  });
});
