import {
  CustomerPricingRuleApplied,
  CustomerSpecialPriceMode,
} from '../enums/customer-pricing.enum';

export interface ICustomerSpecialPrice {
  id: string;
  customerId: string;
  productId: string;
  productCode: string;
  productName: string;
  activeCatalogPriceNet: string;
  mode: CustomerSpecialPriceMode;
  specialPriceNet: string | null;
  discountPercentage: string | null;
  finalPriceNet: string;
  version: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IResolvedCustomerPrice {
  customerId: string;
  customerBusinessName: string;
  productId: string;
  productCode: string;
  productName: string;
  basePriceNet: string;
  ruleApplied: CustomerPricingRuleApplied;
  ruleId: string | null;
  discountPercentage: string | null;
  discountAmountNet: string | null;
  finalPriceNet: string;
}

export interface ICreateCustomerSpecialPricePayload {
  productId: string;
  mode: CustomerSpecialPriceMode;
  specialPriceNet?: string;
  discountPercentage?: string;
}

export interface IUpdateCustomerSpecialPricePayload {
  mode: CustomerSpecialPriceMode;
  specialPriceNet?: string;
  discountPercentage?: string;
  expectedVersion: number;
}

export interface ICustomerSpecialPricePaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface IPaginatedCustomerSpecialPricesResponse {
  data: ICustomerSpecialPrice[];
  meta: ICustomerSpecialPricePaginationMeta;
}
