// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

// Mock the tRPC client
const mockMutate = vi.fn();
const mockUseMutation = vi.fn();

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    memberships: {
      subscribe: {
        useMutation: (...args: unknown[]) => mockUseMutation(...args),
      },
    },
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Import after mocks
import { CheckoutButton } from './CheckoutButton';

describe('CheckoutButton', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
  });

  it('renders a button with the label text', () => {
    render(<CheckoutButton planId="plan-123" label="Start Your Practice" />);
    expect(
      screen.getByRole('button', { name: /start your practice/i }),
    ).toBeTruthy();
  });

  it('renders default "Subscribe" label when no label provided', () => {
    render(<CheckoutButton planId="plan-123" />);
    expect(
      screen.getByRole('button', { name: /subscribe/i }),
    ).toBeTruthy();
  });

  it('calls mutate with planId when clicked', () => {
    render(<CheckoutButton planId="plan-456" />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith({ planId: 'plan-456' });
  });

  it('is disabled when disabled prop is true', () => {
    render(<CheckoutButton planId="plan-123" disabled={true} />);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const button = screen.getByRole('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('is disabled and shows "Redirecting…" when mutation is pending', () => {
    mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    });
    render(<CheckoutButton planId="plan-123" />);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const button = screen.getByRole('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toMatch(/redirecting/i);
  });

  it('has min 44x44px touch target (WCAG AAA §2.5.5)', () => {
    render(<CheckoutButton planId="plan-123" />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('min-h-[44px]');
    expect(button.className).toContain('min-w-[44px]');
  });

  it('uses Editorial Calm design tokens (clay-500 filled, sharp edges)', () => {
    render(<CheckoutButton planId="plan-123" />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-clay-500');
    expect(button.className).toContain('text-sand-100');
    // No rounded-* classes (sharp edges per SKILL §1.3)
    expect(button.className).not.toContain('rounded-');
  });
});
