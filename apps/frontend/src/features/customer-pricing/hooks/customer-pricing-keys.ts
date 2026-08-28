import type { CustomerSpecialPriceSearchParams } from '../types/customer-pricing.types';

export const customerPricingKeys = {
  all: ['customer-pricing'] as const,
  customer: (customerId: string) => [...customerPricingKeys.all, customerId] as const,
  lists: (customerId: string) => [...customerPricingKeys.customer(customerId), 'list'] as const,
  list: (customerId: string, params: CustomerSpecialPriceSearchParams) =>
    [...customerPricingKeys.lists(customerId), params] as const,
  productIds: (customerId: string) =>
    [...customerPricingKeys.customer(customerId), 'product-ids'] as const,
  details: (customerId: string) => [...customerPricingKeys.customer(customerId), 'detail'] as const,
  detail: (customerId: string, id: string) =>
    [...customerPricingKeys.details(customerId), id] as const,
  resolutions: (customerId: string) =>
    [...customerPricingKeys.customer(customerId), 'resolution'] as const,
  resolution: (customerId: string, productId: string) =>
    [...customerPricingKeys.resolutions(customerId), productId] as const,
};
