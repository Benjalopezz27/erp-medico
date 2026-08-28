import { CustomerSpecialPriceMode } from '@erp/shared-types';
import {
  customerGeneralDiscountSchema,
  customerSpecialPriceFormSchema,
  normalizePricingValue,
} from './customer-pricing.schema';

describe('customer pricing schemas', () => {
  it('accepts and normalizes a fixed price with two decimals', () => {
    expect(
      customerSpecialPriceFormSchema.safeParse({
        mode: CustomerSpecialPriceMode.FIXED_PRICE,
        value: '125.5',
      }).success,
    ).toBe(true);
    expect(normalizePricingValue(CustomerSpecialPriceMode.FIXED_PRICE, '125.5')).toBe('125.50');
  });

  it('rejects invalid fixed prices and discounts outside the contract', () => {
    expect(
      customerSpecialPriceFormSchema.safeParse({
        mode: CustomerSpecialPriceMode.FIXED_PRICE,
        value: '0',
      }).success,
    ).toBe(false);
    expect(
      customerSpecialPriceFormSchema.safeParse({
        mode: CustomerSpecialPriceMode.FIXED_PRICE,
        value: '10.123',
      }).success,
    ).toBe(false);
    expect(
      customerSpecialPriceFormSchema.safeParse({
        mode: CustomerSpecialPriceMode.DISCOUNT_PERCENTAGE,
        value: '100',
      }).success,
    ).toBe(false);
    expect(
      customerSpecialPriceFormSchema.safeParse({
        mode: CustomerSpecialPriceMode.DISCOUNT_PERCENTAGE,
        value: '10.12345',
      }).success,
    ).toBe(false);
  });

  it('allows zero only for the general discount', () => {
    expect(customerGeneralDiscountSchema.safeParse({ percentage: '0' }).success).toBe(true);
    expect(customerGeneralDiscountSchema.safeParse({ percentage: '99.9999' }).success).toBe(true);
    expect(customerGeneralDiscountSchema.safeParse({ percentage: '100' }).success).toBe(false);
  });
});
