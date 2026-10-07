import { describe, expect, it } from 'vitest';
import { isAllowedDuringOnboarding } from './onboarding-steps';

describe('isAllowedDuringOnboarding', () => {
  it('permite el wizard y los módulos que enlaza', () => {
    expect(isAllowedDuringOnboarding('/onboarding')).toBe(true);
    expect(isAllowedDuringOnboarding('/products/new')).toBe(true);
    expect(isAllowedDuringOnboarding('/settings')).toBe(true);
  });
  it('bloquea el resto operativo', () => {
    expect(isAllowedDuringOnboarding('/sales/new')).toBe(false);
    expect(isAllowedDuringOnboarding('/')).toBe(false);
    expect(isAllowedDuringOnboarding('/products-x')).toBe(false);
  });
});
