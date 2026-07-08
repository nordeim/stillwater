import { describe, it, expect } from 'vitest';

import { cn } from './utils';

describe('cn utility', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('filters falsy values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });

  it('handles conditional classes', () => {
    const flags: Record<string, boolean> = { active: true, inactive: false };
    expect(cn('base', flags.active && 'active', flags.inactive && 'inactive')).toBe(
      'base active',
    );
  });

  it('tailwind-merge resolves conflicts (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('tailwind-merge preserves non-conflicting classes', () => {
    // text-sm (font-size) and text-red-500 (color) don't conflict
    expect(cn('text-sm', 'font-bold', 'text-red-500')).toBe(
      'text-sm font-bold text-red-500',
    );
  });

  it('handles empty input', () => {
    expect(cn()).toBe('');
  });

  it('handles arrays and objects (clsx syntax)', () => {
    expect(cn(['a', 'b'], { c: true, d: false })).toBe('a b c');
  });
});
