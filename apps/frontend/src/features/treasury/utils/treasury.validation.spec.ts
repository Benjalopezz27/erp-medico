import { describe, expect, it } from 'vitest';
import { normalizeAmount, validateMovement } from './treasury.validation';

describe('validateMovement', () => {
  it('accepts a valid amount and concept', () => {
    expect(validateMovement('10000.50', 'Gasto')).toEqual({});
    expect(validateMovement('10,5', 'Gasto')).toEqual({});
  });

  it.each(['', '0', '-3', 'abc', '1.001'])('rejects amount %p', (amount) => {
    expect(validateMovement(amount, 'Gasto').amount).toBeDefined();
  });

  it('requires a concept up to 200 characters', () => {
    expect(validateMovement('1', ' ').concept).toBeDefined();
    expect(validateMovement('1', 'x'.repeat(201)).concept).toBeDefined();
  });

  it('normalizes a decimal comma', () => {
    expect(normalizeAmount(' 10,5 ')).toBe('10.5');
  });
});
