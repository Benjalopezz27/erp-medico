import type {
  ISortParams,
  IPriceReviewDetail,
  PriceReviewApprovalMode,
  PriceReviewDecisionAction,
  PriceReviewStatus,
} from '@erp/shared-types';

export const PRICE_REVIEW_SORT_FIELDS = ['product', 'costNet', 'markup', 'status'] as const;
export type PriceReviewSortField = (typeof PRICE_REVIEW_SORT_FIELDS)[number];

export interface PriceReviewSearchParams extends ISortParams<PriceReviewSortField> {
  page: number;
  limit: number;
  status: PriceReviewStatus;
  productId?: string;
  categoryId?: string;
  supplierId?: string;
  supplierInvoiceId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ApprovePriceReviewPayload {
  mode: PriceReviewApprovalMode;
  customPriceNet?: string;
  reason?: string;
}

export interface PriceReviewReasonPayload {
  reason?: string;
}

export interface RejectPriceReviewPayload {
  reason: string;
}

export interface PriceReviewDecision {
  review: IPriceReviewDetail;
  action: PriceReviewDecisionAction;
}
