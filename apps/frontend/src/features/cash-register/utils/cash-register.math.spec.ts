import { describe, expect, it } from 'vitest';
import { cashDifference, isValidBalance } from './cash-register.math';

describe('isValidBalance', () => {
  it.each(['0', '1000', '1000.5', '1.234,5'.replace('.', ''), '12,50'])('accepts %s', (v) => {
    expect(isValidBalance(v)).toBe(true);
  });
  it.each(['', '-1', 'abc', '1.234', '10.123'])('rejects %s', (v) => {
    expect(isValidBalance(v)).toBe(false);
  });
});

describe('cashDifference', () => {
  it('is counted minus expected, exact in decimals', () => {
    expect(cashDifference('1050.10', '1050.00')).toBe('0.10');
    expect(cashDifference('1010', '1050.00')).toBe('-40.00');
  });
  it('is null while the input is invalid', () => {
    expect(cashDifference('abc', '1050.00')).toBeNull();
  });
});
