import { customerPricingKeys } from './customer-pricing-keys';

describe('customerPricingKeys', () => {
  it('scopes list, detail and resolution caches by customer', () => {
    expect(customerPricingKeys.list('customer-1', { page: 1 })).toEqual([
      'customer-pricing',
      'customer-1',
      'list',
      { page: 1 },
    ]);
    expect(customerPricingKeys.detail('customer-1', 'rule-1')).toEqual([
      'customer-pricing',
      'customer-1',
      'detail',
      'rule-1',
    ]);
    expect(customerPricingKeys.resolution('customer-1', 'product-1')).toEqual([
      'customer-pricing',
      'customer-1',
      'resolution',
      'product-1',
    ]);
  });
});
