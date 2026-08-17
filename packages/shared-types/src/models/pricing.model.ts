import { PriceReviewStatus } from '../enums/pricing.enum';

export interface IPriceReview {
  id: string;
  productId: string;
  previousCostNet: number;
  newCostNet: number;
  previousPriceNet: number;
  suggestedPriceNet: number;
  approvedPriceNet?: number | null;
  status: PriceReviewStatus;
  reviewedByUserId?: string | null;
  reviewedAt?: Date | string | null;
  createdAt: Date | string;
}

export interface IMarkupConfig {
  id: string;
  globalMarkupPercentage: number;
  costTolerancePercentage: number; // e.g. 5.0%
  updatedByUserId?: string | null;
  updatedAt: Date | string;
}
