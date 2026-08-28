import type {
  IPriceReviewDetail,
  PriceReviewApprovalMode,
  PriceReviewDecisionAction,
  PriceReviewStatus,
} from '@erp/shared-types';

export interface PriceReviewSearchParams {
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
