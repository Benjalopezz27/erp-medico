import { describe, expect, it } from 'vitest';
import { markupExample, normalizeMarkupPercentage } from './markups.validation';

describe('markup decimal validation', () => {
  it.each([
    ['0', '0.0000'],
    ['12.5', '12.5000'],
    ['1000', '1000.0000'],
    [' 0.0001 ', '0.0001'],
  ])('canonicalizes %s as %s', (input, expected) => {
    expect(normalizeMarkupPercentage(input)).toEqual({ success: true, value: expected });
  });

  it.each(['', '-1', '1000.0001', '1.00001', '1,5', '1e2', 'NaN', 'Infinity', '01'])(
    'rejects invalid input %s',
    (input) => expect(normalizeMarkupPercentage(input).success).toBe(false),
  );

  it('calculates the illustrative example with Decimal ROUND_HALF_UP', () => {
    expect(markupExample('25.1250')).toBe('125.13');
  });
});
