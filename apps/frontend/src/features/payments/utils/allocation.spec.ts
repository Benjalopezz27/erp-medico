import { describe, expect, it } from 'vitest';
import { allocateByAge, sumAmounts } from './allocation';

const invoices = [
  { id: 'c', currentBalance: '100.00', createdAt: '2026-08-10T12:00:00Z' },
  { id: 'a', currentBalance: '150.00', createdAt: '2026-06-10T12:00:00Z' },
  { id: 'b', currentBalance: '200.00', createdAt: '2026-07-05T12:00:00Z' },
];

describe('allocateByAge', () => {
  it('cancels the oldest first and leaves the next partial (same case as the server)', () => {
    expect(allocateByAge(invoices, '250.00')).toEqual({ a: '150.00', b: '100.00' });
  });

  it('caps at the customer debt and ignores blank or invalid totals', () => {
    expect(allocateByAge(invoices, '9999.00')).toEqual({
      a: '150.00',
      b: '200.00',
      c: '100.00',
    });
    expect(allocateByAge(invoices, '')).toEqual({});
    expect(allocateByAge(invoices, 'abc')).toEqual({});
  });
});

describe('sumAmounts', () => {
  it('adds decimals exactly', () => {
    expect(sumAmounts(['0.1', '0.2', '', 'x']).toFixed(2)).toBe('0.30');
  });
});
