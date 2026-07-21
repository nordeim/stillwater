// @vitest-environment jsdom
/**
 * HeroNextClass — V17-3 CLS prevention tests
 *
 * VERIFIES the component reserves vertical space during the client-side
 * fetch to prevent Cumulative Layout Shift (CLS).
 *
 * V17-3 fix: The previous implementation shipped an empty "No upcoming
 * classes" card during SSR (short height), then expanded to the full
 * populated card after the tRPC query resolved (taller height). This
 * height delta caused CLS = 0.465 on the home page (9× above the 0.05
 * target). See STILLWATER_AUDIT_REPORT.md §6 Finding #2.
 *
 * The fix: the empty/loading state MUST reserve the same minimum height
 * as the populated state so the layout doesn't shift when data arrives.
 *
 * Source: STILLWATER_AUDIT_REPORT.md §6 Finding #2;
 *         web.dev CLS guidance — https://web.dev/articles/cls
 */

import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HeroNextClass } from './HeroNextClass';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock the tRPC client — HeroNextClass starts with weekStart=null,
// so the query is disabled and the component renders the empty state.
// This is the EXACT scenario that caused the CLS regression: SSR ships
// the empty state, then the client populates after fetch.
const { mockUseQuery } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(() => ({ data: undefined })),
}));
vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    schedule: {
      getWeek: {
        useQuery: mockUseQuery,
      },
    },
  },
}));

describe('HeroNextClass — V17-3 CLS prevention', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    // Reset to default empty-state mock after each test.
    mockUseQuery.mockReturnValue({ data: undefined });
  });

  it('renders the empty state when no sessions are loaded', () => {
    render(<HeroNextClass />);
    expect(screen.getByText(/no upcoming classes/i)).toBeTruthy();
  });

  it('RESERVES minimum height in the empty state to prevent CLS (V17-3)', () => {
    // CRITICAL: The empty state MUST have a min-height class that matches
    // the populated state's height. Without this, the card grows from
    // ~120px (empty) to ~280px (populated) after the client fetch resolves,
    // causing layout shift.
    //
    // The min-height is applied via a Tailwind class (e.g. 'min-h-[280px]')
    // on the empty-state container div.
    const { container } = render(<HeroNextClass />);
    const emptyStateDiv = container.querySelector(
      '[data-testid="hero-next-class-empty"], .border.border-stone-200.bg-sand-warm',
    );
    expect(emptyStateDiv).not.toBeNull();
    // Verify the empty state has a min-h-* class (any value).
    expect(emptyStateDiv?.className).toMatch(/min-h-\[/);
  });

  it('RESERVES minimum height in the populated state to match (V17-3)', () => {
    // Mock the tRPC client to return a session for this test.
    mockUseQuery.mockReturnValue({
      data: [
        {
          id: '00000000-0000-4000-8000-000000000001',
          startsAt: new Date(Date.now() + 60 * 60 * 1000), // 1h from now
          status: 'scheduled',
          overrideCapacity: null,
          class: { title: 'Vinyasa Flow', maxCapacity: 12 },
          instructor: { name: 'Mei Tanaka' },
          room: { capacity: 12 },
        },
      ],
    });

    const { container } = render(<HeroNextClass />);
    const populatedDiv = container.querySelector(
      '.border.border-stone-200.bg-sand-warm',
    );
    expect(populatedDiv).not.toBeNull();
    expect(populatedDiv?.className).toMatch(/min-h-\[/);
  });
});
