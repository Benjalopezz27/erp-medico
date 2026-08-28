import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  getAllCustomerSpecialPriceProductIdsApi,
  getCustomerSpecialPricesApi,
  resolveCustomerPriceApi,
} from '../api/customer-pricing.api';
import type { CustomerSpecialPriceSearchParams } from '../types/customer-pricing.types';
import { customerPricingKeys } from './customer-pricing-keys';

export function useCustomerSpecialPricesQuery(
  customerId: string,
  params: CustomerSpecialPriceSearchParams,
) {
  return useQuery({
    queryKey: customerPricingKeys.list(customerId, params),
    queryFn: () => getCustomerSpecialPricesApi(customerId, params),
    enabled: Boolean(customerId),
    placeholderData: keepPreviousData,
  });
}

export function useCustomerSpecialPriceProductIdsQuery(customerId: string, enabled = true) {
  return useQuery({
    queryKey: customerPricingKeys.productIds(customerId),
    queryFn: () => getAllCustomerSpecialPriceProductIdsApi(customerId),
    enabled: enabled && Boolean(customerId),
  });
}

export function useResolvedCustomerPriceQuery(
  customerId: string,
  productId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: customerPricingKeys.resolution(customerId, productId ?? ''),
    queryFn: () => resolveCustomerPriceApi(customerId, productId!),
    enabled: enabled && Boolean(customerId && productId),
    retry: false,
  });
}
