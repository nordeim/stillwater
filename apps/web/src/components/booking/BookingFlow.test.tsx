// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

// Mock the hooks with factory functions
const mockUseSessionAvailability = vi.fn();
const mockUseBookingMutation = vi.fn();

vi.mock('@/hooks/useSessionAvailability', () => ({
  useSessionAvailability: (...args: unknown[]) => mockUseSessionAvailability(...args),
}));

vi.mock('@/hooks/useBookingMutation', () => ({
  useBookingMutation: () => mockUseBookingMutation(),
}));

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    waitlist: {
      join: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));

// Import after mocks are set up
import { BookingFlow } from './BookingFlow';

describe('BookingFlow', () => {
  const defaultProps = {
    sessionId: '00000000-0000-4000-8000-000000000001',
    sessionDetails: {
      className: 'Vinyasa Flow',
      startsAt: '2026-07-10T10:00:00Z',
      instructorName: 'jane-doe',
    },
  };

  beforeEach(() => {
    mockUseSessionAvailability.mockReturnValue({
      data: { enrolled: 5, capacity: 10, available: 5, isFull: false },
      isLoading: false,
      error: null,
    });
    mockUseBookingMutation.mockReturnValue({
      book: vi.fn(),
      isLoading: false,
      isConflict: false,
      result: null,
      reset: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders SeatAvailability component', () => {
    render(<BookingFlow {...defaultProps} />);
    expect(screen.getByRole('img')).toBeTruthy();
  });

  it('renders BookingButton when seats available', () => {
    render(<BookingFlow {...defaultProps} />);
    expect(screen.getByRole('button', { name: /book/i })).toBeTruthy();
  });

  it('renders WaitlistButton when session is full', () => {
    mockUseSessionAvailability.mockReturnValue({
      data: { enrolled: 10, capacity: 10, available: 0, isFull: true },
      isLoading: false,
      error: null,
    });

    render(<BookingFlow {...defaultProps} />);
    expect(screen.getByRole('button', { name: /waitlist/i })).toBeTruthy();
  });

  it('renders loading state when SSE is loading', () => {
    mockUseSessionAvailability.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    render(<BookingFlow {...defaultProps} />);
    expect(screen.getByText(/loading/i)).toBeTruthy();
  });

  it('renders error state when SSE fails', () => {
    mockUseSessionAvailability.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('SSE failed'),
    });

    render(<BookingFlow {...defaultProps} />);
    expect(screen.getByText(/unavailable/i)).toBeTruthy();
  });
});
