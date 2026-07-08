// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from "vitest";

import { SeatAvailability } from './SeatAvailability';

describe('SeatAvailability', () => {
  afterEach(() => { cleanup(); });
  it('renders seat count with role="img" (WCAG AAA §8.5)', () => {
    render(<SeatAvailability enrolled={5} capacity={10} available={5} isFull={false} />);
    const img = screen.getByRole('img');
    expect(img).toBeTruthy();
  });

  it('renders aria-label "N of M spots taken"', () => {
    render(<SeatAvailability enrolled={5} capacity={10} available={5} isFull={false} />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('aria-label')).toMatch(/5 of 10 spots taken/i);
  });

  it('renders available spots count', () => {
    render(<SeatAvailability enrolled={7} capacity={10} available={3} isFull={false} />);
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('shows "Full" when isFull is true', () => {
    render(<SeatAvailability enrolled={10} capacity={10} available={0} isFull={true} />);
    expect(screen.getByText(/full/i)).toBeTruthy();
  });

  it('shows "Available" when spots remain', () => {
    render(<SeatAvailability enrolled={3} capacity={10} available={7} isFull={false} />);
    expect(screen.getByText(/available/i)).toBeTruthy();
  });
});
