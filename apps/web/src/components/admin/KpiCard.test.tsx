// @vitest-environment jsdom
/**
 * F9-13 — KpiCard test suite
 *
 * Tests: renders label + value; renders trend up/down; renders skeleton.
 * Per MEP Phase 9 F9-13.
 */

import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';

import { KpiCard } from './KpiCard';

describe('F9-13: KpiCard', () => {
  afterEach(() => { cleanup(); });

  it('renders label and value', () => {
    render(<KpiCard label="Active Members" value={42} />);
    expect(screen.getByText('Active Members')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders null value as em-dash', () => {
    render(<KpiCard label="MRR" value={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders positive trend with clay-500 color and up arrow', () => {
    render(<KpiCard label="MRR" value="$1,200" trend={5.2} />);
    const trendEl = screen.getByLabelText(/Trend: up 5\.2 percent/);
    expect(trendEl).toBeInTheDocument();
    expect(trendEl.className).toContain('text-clay-500');
    expect(trendEl.textContent).toContain('↑');
  });

  it('renders negative trend with stone-500 color and down arrow', () => {
    render(<KpiCard label="Churn" value="3.1%" trend={-3.1} />);
    const trendEl = screen.getByLabelText(/Trend: down 3\.1 percent/);
    expect(trendEl).toBeInTheDocument();
    expect(trendEl.className).toContain('text-stone-500');
    expect(trendEl.textContent).toContain('↓');
  });

  it('renders skeleton state when isLoading', () => {
    const { container } = render(<KpiCard label="Loading" value={0} isLoading />);
    // Skeleton has animate-pulse class
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(2);
    // Label text should NOT be rendered in skeleton state
    expect(screen.queryByText('Loading')).not.toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(
      <KpiCard
        label="Classes"
        value={7}
        icon={<span data-testid="icon">📅</span>}
      />,
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('does not render trend when trend is null or undefined', () => {
    render(<KpiCard label="Members" value={42} />);
    expect(screen.queryByLabelText(/Trend:/)).not.toBeInTheDocument();
  });
});
