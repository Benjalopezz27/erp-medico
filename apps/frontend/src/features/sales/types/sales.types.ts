import type {
  IProductSummary,
  IResolvedCustomerPrice,
  ProductTaxTreatment,
} from '@erp/shared-types';

export interface PosCartItem {
  product: IProductSummary;
  quantityBase: number;
}

export interface PosPreviewLine extends PosCartItem {
  pricing: IResolvedCustomerPrice | null;
  catalogPriceNet: string;
  finalPriceNet: string;
  subtotalNet: string;
  taxTreatment: ProductTaxTreatment;
  ivaPercentage: string | null;
  ivaAmount: string;
  subtotalGross: string;
  isResolving: boolean;
  hasPricingError: boolean;
}

export interface PosPreviewTotals {
  totalNet: string;
  taxableNet: string;
  exemptAmount: string;
  nonTaxedAmount: string;
  ivaTotal: string;
  totalGross: string;
}

export interface StockErrorDetails {
  productId: string;
  available: number;
  requested: number;
}

export interface ParsedSalesError {
  status?: number;
  code?: string;
  message: string;
  requestId?: string;
  stock?: StockErrorDetails;
  isAmbiguousNetworkError: boolean;
  canRetryDirectly: boolean;
}
