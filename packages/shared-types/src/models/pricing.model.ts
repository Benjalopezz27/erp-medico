import { PriceReviewStatus } from '../enums/pricing.enum';

export interface IPriceReview {
  id: string;
  supplierInvoiceId: string;
  productId: string;
  productCode: string;
  productName: string;
  previousCostNet: string;
  newCostNet: string;
  markupPercentageSnapshot: string | null;
  previousSuggestedPriceNet: string;
  suggestedPriceNet: string;
  activePriceNetSnapshot: string;
  approvedPriceNet: string | null;
  status: PriceReviewStatus;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IMarkupConfig {
  id: string;
  globalMarkupPercentage: number;
  costTolerancePercentage: number; // e.g. 5.0%
  updatedByUserId?: string | null;
  updatedAt: Date | string;
}
