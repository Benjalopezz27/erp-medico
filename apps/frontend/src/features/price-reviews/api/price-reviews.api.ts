import type {
  IPaginatedPriceReviewsResponse,
  IPriceReviewDetail,
  IPriceReviewPendingCount,
} from '@erp/shared-types';
import { apiClient } from '@/services/api.client';
import type {
  ApprovePriceReviewPayload,
  PriceReviewReasonPayload,
  PriceReviewSearchParams,
  RejectPriceReviewPayload,
} from '../types/price-reviews.types';

function compactParams(params: PriceReviewSearchParams): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  );
}

export async function getPriceReviewsApi(
  params: PriceReviewSearchParams,
  signal?: AbortSignal,
): Promise<IPaginatedPriceReviewsResponse> {
  const { data } = await apiClient.get<IPaginatedPriceReviewsResponse>('/price-reviews', {
    params: compactParams(params),
    signal,
  });
  return data;
}

export async function getPriceReviewApi(
  id: string,
  signal?: AbortSignal,
): Promise<IPriceReviewDetail> {
  const { data } = await apiClient.get<IPriceReviewDetail>(`/price-reviews/${id}`, { signal });
  return data;
}

export async function getPriceReviewPendingCountApi(
  signal?: AbortSignal,
): Promise<IPriceReviewPendingCount> {
  const { data } = await apiClient.get<IPriceReviewPendingCount>('/price-reviews/pending-count', {
    signal,
  });
  return data;
}

export async function approvePriceReviewApi(
  id: string,
  payload: ApprovePriceReviewPayload,
): Promise<IPriceReviewDetail> {
  const { data } = await apiClient.patch<IPriceReviewDetail>(
    `/price-reviews/${id}/approve`,
    payload,
  );
  return data;
}

export async function rejectPriceReviewApi(
  id: string,
  payload: RejectPriceReviewPayload,
): Promise<IPriceReviewDetail> {
  const { data } = await apiClient.patch<IPriceReviewDetail>(
    `/price-reviews/${id}/reject`,
    payload,
  );
  return data;
}

export async function postponePriceReviewApi(
  id: string,
  payload: PriceReviewReasonPayload,
): Promise<IPriceReviewDetail> {
  const { data } = await apiClient.patch<IPriceReviewDetail>(
    `/price-reviews/${id}/postpone`,
    payload,
  );
  return data;
}

export async function reopenPriceReviewApi(
  id: string,
  payload: PriceReviewReasonPayload,
): Promise<IPriceReviewDetail> {
  const { data } = await apiClient.patch<IPriceReviewDetail>(
    `/price-reviews/${id}/reopen`,
    payload,
  );
  return data;
}
