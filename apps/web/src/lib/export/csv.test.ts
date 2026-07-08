import { describe, it, expect } from 'vitest';

import { arrayToCSV } from './csv';

describe('CSV export utility', () => {
  it('converts simple array to CSV', () => {
    const data = [
      { name: 'Vinyasa Flow', date: '2026-07-10', status: 'confirmed' },
      { name: 'Yin Yoga', date: '2026-07-12', status: 'cancelled' },
    ];
    const csv = arrayToCSV(data);
    expect(csv).toContain('name,date,status');
    expect(csv).toContain('Vinyasa Flow,2026-07-10,confirmed');
    expect(csv).toContain('Yin Yoga,2026-07-12,cancelled');
  });

  it('wraps fields with commas in double quotes', () => {
    const data = [{ description: 'Hello, World' }];
    const csv = arrayToCSV(data);
    expect(csv).toContain('"Hello, World"');
  });

  it('escapes internal double quotes by doubling them', () => {
    const data = [{ text: 'Say "hello"' }];
    const csv = arrayToCSV(data);
    expect(csv).toContain('"Say ""hello"""');
  });

  it('wraps fields with newlines in double quotes', () => {
    const data = [{ text: 'Line 1\nLine 2' }];
    const csv = arrayToCSV(data);
    expect(csv).toContain('"Line 1\nLine 2"');
  });

  it('returns empty string for empty array', () => {
    expect(arrayToCSV([])).toBe('');
  });

  it('handles null and undefined values', () => {
    const data = [{ a: null, b: undefined, c: 'value' }];
    const csv = arrayToCSV(data);
    expect(csv).toContain('a,b,c');
    expect(csv).toContain(',,value');
  });
});
