// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from "vitest";

import { BookingConfirmation } from './BookingConfirmation';

describe('BookingConfirmation', () => {
  afterEach(() => { cleanup(); });
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    sessionDetails: {
      className: 'Vinyasa Flow',
      startsAt: '2026-07-10T10:00:00Z',
      instructorName: 'jane-doe',
    },
  };

  it('renders dialog content when open is true', () => {
    render(<BookingConfirmation {...defaultProps} />);
    expect(screen.getByText(/booked/i)).toBeTruthy();
  });

  it('does not render content when open is false', () => {
    render(<BookingConfirmation {...defaultProps} open={false} />);
    expect(screen.queryByText(/booked/i)).toBeNull();
  });

  it('renders session details (class name in details section)', () => {
    render(<BookingConfirmation {...defaultProps} />);
    // The class name appears in the details section with a "Class:" label
    const detailsParagraph = screen.getByText('Vinyasa Flow', { selector: 'p' });
    expect(detailsParagraph).toBeTruthy();
  });

  it('renders confirmation message', () => {
    render(<BookingConfirmation {...defaultProps} />);
    expect(screen.getByText(/booked/i)).toBeTruthy();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<BookingConfirmation {...defaultProps} onClose={onClose} />);
    const closeButton = screen.getByRole('button', { name: /done/i });
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
