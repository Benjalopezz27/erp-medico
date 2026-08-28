import type {
  ICreateCustomerSpecialPricePayload,
  ICustomerSpecialPrice,
  IPaginatedCustomerSpecialPricesResponse,
  IResolvedCustomerPrice,
  IUpdateCustomerSpecialPricePayload,
} from '@erp/shared-types';

export {
  CustomerPricingErrorCode,
  CustomerPricingRuleApplied,
  CustomerSpecialPriceMode,
} from '@erp/shared-types';
export type {
  ICreateCustomerSpecialPricePayload,
  ICustomerSpecialPrice,
  IPaginatedCustomerSpecialPricesResponse,
  IResolvedCustomerPrice,
  IUpdateCustomerSpecialPricePayload,
};

export interface CustomerSpecialPriceSearchParams {
  page?: number;
  limit?: number;
  search?: string;
}
