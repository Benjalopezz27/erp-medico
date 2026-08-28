import { MarkupLevel, PriceReviewStatus } from '../enums/pricing.enum';

export interface IPriceReview {
  id: string;
  supplierInvoiceId: string;
  productId: string;
  productCode: string;
  productName: string;
  previousCostNet: string;
  newCostNet: string;
  markupPercentageSnapshot: string | null;
  effectiveMarkupLevel: MarkupLevel | null;
  effectiveMarkupConfigurationId: string | null;
  effectiveMarkupTargetId: string | null;
  effectiveMarkupTargetName: string | null;
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

export interface IMarkupConfiguration {
  id: string;
  level: MarkupLevel;
  percentage: string;
  categoryId: string | null;
  categoryName: string | null;
  productId: string | null;
  productCode: string | null;
  productName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IEffectiveMarkup {
  configurationId: string;
  level: MarkupLevel;
  percentage: string;
  targetId: string | null;
  targetName: string;
}

export interface IMarkupSimulation {
  productId: string;
  productCode: string;
  productName: string;
  costNet: string;
  effectiveMarkup: IEffectiveMarkup;
  suggestedPriceNet: string;
}

export interface IMarkupConfig {
  id: string;
  globalMarkupPercentage: number;
  costTolerancePercentage: number; // e.g. 5.0%
  updatedByUserId?: string | null;
  updatedAt: Date | string;
}
