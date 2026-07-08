// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from "vitest";

import { BookingButton } from './BookingButton';

describe('BookingButton', () => {
  afterEach(() => { cleanup(); });
  it('renders a button with "Book" text', () => {
    render(<BookingButton onClick={vi.fn()} disabled={false} isLoading={false} />);
    expect(screen.getByRole('button', { name: /book/i })).toBeTruthy();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<BookingButton onClick={onClick} disabled={false} isLoading={false} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<BookingButton onClick={vi.fn()} disabled={true} isLoading={false} />);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const button = screen.getByRole('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('shows loading text when isLoading is true', () => {
    render(<BookingButton onClick={vi.fn()} disabled={false} isLoading={true} />);
    expect(screen.getByRole('button').textContent).toMatch(/booking/i);
  });

  it('has min 44x44px touch target (WCAG AAA §2.5.5)', () => {
    render(<BookingButton onClick={vi.fn()} disabled={false} isLoading={false} />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('min-h-[44px]');
    expect(button.className).toContain('min-w-[44px]');
  });
});
