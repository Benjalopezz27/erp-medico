import { describe, expect, it } from 'vitest';
import { normalizeCostTolerance } from './purchase-settings.validation';

describe('normalizeCostTolerance', () => {
  it.each([
    ['0', '0.0000'],
    ['5', '5.0000'],
    ['4.25', '4.2500'],
    ['100', '100.0000'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeCostTolerance(input)).toEqual({ success: true, value: expected });
  });

  it.each(['-1', '100.0001', '5.00001', 'abc', ''])('rejects %s', (input) => {
    expect(normalizeCostTolerance(input).success).toBe(false);
  });
});
