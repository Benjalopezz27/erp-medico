import {
  MarkupLevel,
  PriceReviewDecisionAction,
  PriceReviewStaleReason,
  PriceReviewStatus,
} from '../enums/pricing.enum';

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
  decisionAction: PriceReviewDecisionAction | null;
  decisionReason: string | null;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IPriceReviewActor {
  id: string;
  name: string;
  email: string;
}

export interface IPriceReviewProductState {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  categoryName: string;
  costNet: string;
  suggestedPriceNet: string;
  activePriceNet: string;
}

export interface IPriceReviewOrigin {
  supplierInvoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  supplierId: string;
  supplierName: string;
}

export interface IPriceReviewDetail extends IPriceReview {
  product: IPriceReviewProductState;
  origin: IPriceReviewOrigin;
  reviewedBy: IPriceReviewActor | null;
  isStale: boolean;
  staleReasons: PriceReviewStaleReason[];
  supersededByReviewId: string | null;
  allowedActions: PriceReviewDecisionAction[];
}

export interface IPriceReviewPaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface IPaginatedPriceReviewsResponse {
  data: IPriceReviewDetail[];
  meta: IPriceReviewPaginationMeta;
}

export interface IPriceReviewPendingCount {
  count: number;
}

export interface IPriceReviewConflictState {
  code: string;
  message: string;
  details: {
    currentReview: IPriceReviewDetail;
    currentProduct: IPriceReviewProductState;
    supersededByReviewId: string | null;
  };
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
